import { Company, Location, ServiceCategory, ServiceItem, User } from "@petbuddy/shared";

/**
 * Escape regex special characters for safe pattern matching
 */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Filter staff by service qualification
 * IMPORTANT: Staff with NO serviceCategoryIds = qualified for ALL services (backward compatible)
 */
function filterQualifiedStaff(staffList, serviceId) {
  return staffList.filter((staff) => {
    // IMPORTANT: Staff with NO serviceCategoryIds configured can serve ALL services (no restrictions)
    if (!staff.serviceCategoryIds || staff.serviceCategoryIds.length === 0) {
      return true; // ✅ Staff with no restrictions = qualified for all services
    }
    // Staff with configured serviceCategoryIds must have this specific service in their list
    const serviceCategoryIdStrings = staff.serviceCategoryIds.map((id) => String(id));
    return serviceCategoryIdStrings.includes(serviceId);
  });
}

/**
 * Filter staff by location assignment
 * Staff is assigned to a location if it's in their locationIds array or is their primaryLocationId
 */
function filterStaffByLocation(staffList, locationId) {
  return staffList.filter((staff) => {
    // Check if staff has this location in their locationIds array
    if (staff.locationIds && staff.locationIds.length > 0) {
      const locationIdStrings = staff.locationIds.map((id) => String(id));
      if (locationIdStrings.includes(locationId)) {
        return true;
      }
    }
    // Fallback to primaryLocationId
    if (staff.primaryLocationId && String(staff.primaryLocationId) === locationId) {
      return true;
    }
    return false;
  });
}

/**
 * Get unified booking context with all necessary data for appointment booking
 *
 * This function centralizes all data fetching for booking operations:
 * - Company settings (timezone)
 * - Working hours
 * - Service resolution and duration
 * - Location selection (with optional preference)
 * - Qualified staff lookup (with optional preference and location filtering)
 *
 * @param {Object} params - Parameters for context
 * @param {string} params.companyId - Company ID (required)
 * @param {string} params.serviceName - Service name to resolve (required)
 * @param {string} [params.petSize] - Pet size for service item resolution (S, M, L, XL)
 * @param {Array} [params.workingHours] - Working hours from context (optional)
 * @param {string} [params.timezone] - Override timezone (optional)
 * @param {string} [params.preferredLocationId] - Preferred location ID (optional)
 * @param {string} [params.preferredStaffId] - Preferred staff ID (optional)
 *
 * @returns {Promise<Object>} Unified booking context
 * @returns {Object} return.company - Company document
 * @returns {string} return.timezone - Company timezone
 * @returns {Array} return.workingHours - Company working hours
 * @returns {Object} return.service - Resolved ServiceCategory
 * @returns {string} return.serviceId - Service ID (string)
 * @returns {string} return.serviceItemId - Service item ID (string)
 * @returns {number} return.serviceDuration - Service duration in minutes
 * @returns {Object} return.location - Selected location
 * @returns {string} return.locationId - Location ID (string)
 * @returns {Array} return.locationOptions - All available locations with { id, name, isMain, address }
 * @returns {Array} return.qualifiedStaff - Array of qualified staff members
 * @returns {Array<string>} return.qualifiedStaffIds - Array of qualified staff IDs
 * @returns {Array} return.staffOptions - All qualified staff with { id, name, role, locationIds }
 *
 * @throws {Error} If company not found
 * @throws {Error} If service not found
 * @throws {Error} If no service items configured
 * @throws {Error} If no locations configured
 * @throws {Error} If no qualified staff found
 * @throws {Error} If preferred location is invalid
 * @throws {Error} If preferred staff is invalid or not qualified
 */
export async function getBookingContext(params) {
  const {
    companyId,
    serviceName,
    petSize,
    workingHours: contextWorkingHours,
    timezone: contextTimezone,
    preferredLocationId,
    preferredStaffId
  } = params;

  if (!companyId) {
    throw new Error("companyId is required");
  }

  if (!serviceName) {
    throw new Error("serviceName is required");
  }

  // 1. Fetch company data
  const company = await Company.findById(companyId).lean();
  if (!company) {
    throw new Error("Company not found");
  }

  // 2. Extract company settings
  const timezone = contextTimezone || company.timezone || "UTC";
  const workingHours = contextWorkingHours || company.settings?.workHours || [];

  // 3. Resolve service by name
  const trimmedServiceName = String(serviceName).trim();

  // Try exact match first (case-insensitive)
  let serviceCategory = await ServiceCategory.findOne({
    companyId: company._id,
    active: true,
    name: {
      $regex: new RegExp(`^${escapeRegex(trimmedServiceName)}$`, "i"),
    },
  }).lean();

  // If not found, try partial match
  if (!serviceCategory) {
    serviceCategory = await ServiceCategory.findOne({
      companyId: company._id,
      active: true,
      name: { $regex: new RegExp(escapeRegex(trimmedServiceName), "i") },
    }).lean();
  }

  if (!serviceCategory) {
    const availableServices = await ServiceCategory.find({
      companyId: company._id,
      active: true,
    })
      .select("name")
      .lean();

    throw new Error(
      `Service "${trimmedServiceName}" not found. Available services: ${availableServices
        .map((s) => s.name)
        .join(", ")}`
    );
  }

  const serviceId = String(serviceCategory._id);

  // 4. Resolve service item and duration
  const itemQuery = {
    companyId: company._id,
    serviceCategoryId: serviceCategory._id,
    active: true,
  };

  let serviceItemId = null;
  let serviceDuration = 60; // default

  // If pet_size is specified, try to find specific item
  if (petSize) {
    const normalizedSize = String(petSize).toUpperCase().trim();
    const matchingItem = await ServiceItem.findOne({
      ...itemQuery,
      size: normalizedSize,
    })
      .select("_id durationMinutes price")
      .lean();

    if (matchingItem) {
      serviceItemId = String(matchingItem._id);
      serviceDuration = matchingItem.durationMinutes || 60;
    }
  }

  // If no specific size or item not found, use first available item
  if (!serviceItemId) {
    const items = await ServiceItem.find(itemQuery)
      .select("_id durationMinutes price")
      .sort({ price: 1 })
      .lean();

    if (items.length === 0) {
      throw new Error(
        `No service items configured for "${serviceCategory.name}". Please contact support.`
      );
    }

    serviceItemId = String(items[0]._id);
    serviceDuration = items[0].durationMinutes || 60;
  }

  // 5. Location selection with preference support
  const locations = await Location.find({ companyId: company._id })
    .sort({ isMain: -1 })
    .lean();

  if (locations.length === 0) {
    throw new Error(
      "No locations configured for this company. Please add a location to continue."
    );
  }

  // Build locationOptions array for caller to present choices
  const locationOptions = locations.map((loc) => ({
    id: String(loc._id),
    name: loc.label || loc.address,
    isMain: loc.isMain || false,
    address: loc.address
  }));

  let location;
  let locationId;

  // If preferred location specified, validate and use it
  if (preferredLocationId) {
    location = locations.find((loc) => String(loc._id) === preferredLocationId);
    if (!location) {
      throw new Error(
        `Invalid location ID: ${preferredLocationId}. This location does not exist or is not active.`
      );
    }
    locationId = String(location._id);
  } else {
    // IMPORTANT: Only auto-select if there's exactly ONE location
    // If multiple locations exist, the caller MUST handle selection
    if (locations.length === 1) {
      location = locations[0];
      locationId = String(location._id);
    } else {
      // Multiple locations - no auto-selection
      // Use main location as a temporary reference for getting staff options
      // but the caller must detect locationOptions.length > 1 and ask the customer
      location = locations.find((loc) => loc.isMain) || locations[0];
      locationId = String(location._id);
    }
  }

  // 6. Get qualified staff for service with location filtering
  const serviceAllowedRoles = Array.isArray(serviceCategory.allowedRoles)
    ? serviceCategory.allowedRoles
    : ["groomer"];

  // IMPORTANT: Only get staff with allowed roles (groomers, etc.) - NOT managers/receptionists
  const staffWithRoles = await User.find({
    companyId: company._id,
    isActive: true,
    role: { $in: serviceAllowedRoles },
  })
    .select("_id fullName role serviceCategoryIds locationIds primaryLocationId")
    .lean();

  // Filter by service qualification
  let qualifiedStaff = filterQualifiedStaff(staffWithRoles, serviceId);

  // Filter by location assignment
  const qualifiedStaffForLocation = filterStaffByLocation(qualifiedStaff, locationId);

  // Build staffOptions array with ALL qualified staff (before location filtering)
  // This allows the caller to show staff options for different locations
  const staffOptions = qualifiedStaff.map((s) => ({
    id: String(s._id),
    name: s.fullName,
    role: s.role,
    locationIds: (s.locationIds || []).map((id) => String(id)),
    primaryLocationId: s.primaryLocationId ? String(s.primaryLocationId) : null
  }));

  // Debug logging
  console.log(`[getBookingContext] Service: ${serviceCategory.name}`);
  console.log(`[getBookingContext] Allowed roles: ${serviceAllowedRoles.join(", ")}`);
  console.log(`[getBookingContext] Staff with allowed roles: ${staffWithRoles.length}`);
  console.log(`[getBookingContext] Qualified staff (service filter):`, qualifiedStaff.length);
  console.log(`[getBookingContext] Qualified staff (location filter):`, qualifiedStaffForLocation.length);

  // If preferred staff specified, validate and restrict to that staff
  if (preferredStaffId) {
    // FIXED: Support both ObjectId and staff name for flexible lookup
    // Try to find by ID first, then by name (case-insensitive)
    let preferredStaff = qualifiedStaff.find((s) => String(s._id) === preferredStaffId);

    if (!preferredStaff) {
      // Try to find by name (case-insensitive partial match)
      const searchName = preferredStaffId.toLowerCase().trim();
      preferredStaff = qualifiedStaff.find((s) =>
        s.fullName?.toLowerCase().includes(searchName) ||
        s.firstName?.toLowerCase().includes(searchName) ||
        s.lastName?.toLowerCase().includes(searchName)
      );
    }

    if (!preferredStaff) {
      // Provide helpful error with available staff names
      const availableStaff = qualifiedStaff.map(s => s.fullName || `${s.firstName} ${s.lastName}`).join(', ');
      throw new Error(
        `Invalid staff selection: "${preferredStaffId}" is not qualified to provide the "${serviceCategory.name}" service. Available qualified staff: ${availableStaff}`
      );
    }

    // Check if preferred staff is assigned to the selected location
    const staffAtLocation = filterStaffByLocation([preferredStaff], locationId);
    if (staffAtLocation.length === 0) {
      throw new Error(
        `Invalid staff selection: ${preferredStaff.fullName} is not assigned to the selected location.`
      );
    }

    // Restrict to preferred staff only
    qualifiedStaff = [preferredStaff];
  } else {
    // Use location-filtered staff
    qualifiedStaff = qualifiedStaffForLocation;
  }

  if (qualifiedStaff.length === 0) {
    throw new Error(
      `SERVICE ERROR: No staff members are currently qualified to provide the "${serviceCategory.name}" service at this location. Available roles required: ${serviceAllowedRoles.join(", ")}. This may be a configuration issue. Please apologize to the customer and ask them to contact us directly.`
    );
  }

  const qualifiedStaffIds = qualifiedStaff.map((s) => String(s._id));

  // 7. Return unified context
  return {
    company,
    timezone,
    workingHours,
    service: serviceCategory,
    serviceId,
    serviceItemId,
    serviceDuration,
    location,
    locationId,
    locationOptions, // NEW: All available locations
    qualifiedStaff,
    qualifiedStaffIds,
    staffOptions // NEW: All qualified staff options
  };
}

// Export shared utility functions for reuse
export { filterQualifiedStaff, filterStaffByLocation, escapeRegex };
