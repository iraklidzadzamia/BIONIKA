/**
 * REFACTORED book_appointment - Simplified version
 *
 * Philosophy: Let BookingService handle ALL validation.
 * Our job: Just prepare the data correctly.
 */

export async function book_appointment_refactored(params, context, models) {
  const { Company, ServiceCategory, ServiceItem, Pet, Location, User } = models;
  const { getContactByChatId, convertContactToCustomer } = context.contactService;
  const { BookingService } = context.bookingService;
  const { parseAppointmentTime } = context.utils;

  const DEBUG = process.env.DEBUG_APPOINTMENTS === 'true';

  try {
    const {
      appointment_time,
      service_name,
      staff_id: requestedStaffId,
      pet_size,
      pet_name,
      pet_type,
      notes: incomingNotes,
    } = params;

    // Basic validation
    if (!context?.company_id) throw new Error("Missing company context");
    if (!context?.chat_id) throw new Error("Missing customer chat_id");
    if (!appointment_time) throw new Error("appointment_time is required");
    if (!service_name) throw new Error("service_name is required");

    const company = await Company.findById(context.company_id).lean();
    if (!company) throw new Error("Company not found");

    const timezone = context.timezone || company.timezone || "UTC";

    if (DEBUG) {
      console.log("[book_appointment] Input:", { service_name, appointment_time, pet_size });
    }

    // 1. Resolve service
    const trimmedServiceName = String(service_name).trim();
    let serviceCategory = await ServiceCategory.findOne({
      companyId: company._id,
      active: true,
      name: { $regex: new RegExp(`^${escapeRegex(trimmedServiceName)}$`, "i") },
    }).lean();

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
      }).select("name").lean();
      throw new Error(
        `Service "${trimmedServiceName}" not found. Available: ${availableServices.map(s => s.name).join(", ")}`
      );
    }

    // 2. Find service item (prefer specific size, fallback to cheapest)
    const itemQuery = {
      companyId: company._id,
      serviceCategoryId: serviceCategory._id,
      active: true,
    };

    let service_item_id = null;
    let serviceDuration = 60;

    if (pet_size) {
      const item = await ServiceItem.findOne({
        ...itemQuery,
        size: String(pet_size).toUpperCase(),
      }).select("_id durationMinutes").lean();

      if (item) {
        service_item_id = String(item._id);
        serviceDuration = item.durationMinutes || 60;
      }
    }

    if (!service_item_id) {
      const items = await ServiceItem.find(itemQuery)
        .select("_id durationMinutes")
        .sort({ price: 1 })
        .lean();

      if (items.length === 0) {
        throw new Error(`No service items configured for "${serviceCategory.name}"`);
      }

      service_item_id = String(items[0]._id);
      serviceDuration = items[0].durationMinutes || 60;
    }

    // 3. Parse appointment time
    const parsed = parseAppointmentTime(appointment_time, timezone, serviceDuration);
    if (!parsed) {
      throw new Error(
        `Could not parse "${appointment_time}". Use format like "tomorrow at 2pm" or "Friday at 10:30"`
      );
    }

    // 4. Get customer (convert lead if needed)
    let contact = await getContactByChatId(context.chat_id, context.company_id, context.platform);
    if (!contact) {
      throw new Error("No contact found");
    }

    const missingInfo = [];
    if (!contact.fullName?.trim()) missingInfo.push("full_name");
    if (!contact.phone?.trim()) missingInfo.push("phone_number");

    if (missingInfo.length > 0) {
      const field = missingInfo.join(" and ").replace("_", " ");
      return {
        success: false,
        needs_information: true,
        missing_fields: missingInfo,
        message: `Please ask the customer for their ${field} to complete the booking.`,
      };
    }

    if (contact.contactStatus === "lead") {
      contact = await convertContactToCustomer(contact._id);
    }

    // 5. Auto-select main location
    const locations = await Location.find({ companyId: company._id }).sort({ isMain: -1 }).lean();
    if (locations.length === 0) {
      throw new Error("No locations configured");
    }
    const location_id = String(locations[0]._id);

    // 6. Get qualified staff for this service
    const serviceAllowedRoles = Array.isArray(serviceCategory.allowedRoles)
      ? serviceCategory.allowedRoles
      : ["groomer"];

    const staffWithRoles = await User.find({
      companyId: company._id,
      isActive: true,
      role: { $in: serviceAllowedRoles },
    }).select("_id fullName serviceCategoryIds").lean();

    const qualifiedStaff = staffWithRoles.filter((staff) => {
      if (!staff.serviceCategoryIds?.length) return true; // Staff with no restrictions = qualified for all
      const ids = staff.serviceCategoryIds.map(id => String(id));
      return ids.includes(String(serviceCategory._id));
    });

    if (qualifiedStaff.length === 0) {
      throw new Error(
        `No staff members are qualified for "${serviceCategory.name}". Please contact us directly.`
      );
    }

    // 6a. Check availability of qualified staff at requested time
    const startDate = moment.tz(`${parsed.date}T${parsed.start}:00`, timezone).toDate();
    const endDate = moment.tz(`${parsed.date}T${parsed.end}:00`, timezone).toDate();

    if (DEBUG) {
      console.log(`[book_appointment] Checking availability for ${qualifiedStaff.length} qualified staff at ${parsed.date} ${parsed.start}-${parsed.end}`);
    }

    // Check which staff are actually available
    const availabilityChecks = await Promise.all(
      qualifiedStaff.map(async (staff) => {
        const availabilityResult = await BookingService.checkAvailability(
          String(staff._id),
          startDate,
          endDate,
          String(company._id),
          null, // excludeAppointmentId
          location_id
        );
        return {
          staff,
          available: availabilityResult.available,
          reason: availabilityResult.reason
        };
      })
    );

    const availableStaff = availabilityChecks
      .filter(check => check.available)
      .map(check => check.staff);

    if (DEBUG) {
      console.log(`[book_appointment] ${availableStaff.length} out of ${qualifiedStaff.length} staff available`);
    }

    // CRITICAL LOGIC: Handle staff selection based on availability
    let staff_id;

    if (requestedStaffId) {
      // Customer explicitly requested a specific staff member
      const requestedStaff = availableStaff.find(s => String(s._id) === requestedStaffId);

      if (!requestedStaff) {
        // Check if staff exists but is unavailable
        const staffInQualified = qualifiedStaff.find(s => String(s._id) === requestedStaffId);
        if (staffInQualified) {
          throw new Error(
            `The requested staff member is not available at ${parsed.date} ${parsed.start}. IMPORTANT: Call get_available_times with service_name="${service_name}" for date "${parsed.date}" to show customer when this staff member is available.`
          );
        } else {
          // Build error message with staff IDs
          const availableStaffInfo = availableStaff.map(s => 
            `${s.fullName} (id: ${String(s._id)})`
          ).join(', ');
          
          throw new Error(
            `Invalid staff selection: "${requestedStaffId}" is not qualified to provide the "${serviceCategory.name}" service. Available qualified staff: ${availableStaffInfo}. Please call get_staff_list to get valid staff IDs before booking.`
          );
        }
      }

      staff_id = requestedStaffId;

      if (DEBUG) {
        console.log(`[book_appointment] Using customer-requested staff: ${requestedStaff.fullName} (${staff_id})`);
      }
    } else if (availableStaff.length === 0) {
      // No staff available - return error with suggestion to check available times
      throw new Error(
        `No staff members are available for "${serviceCategory.name}" at ${parsed.date} ${parsed.start}. IMPORTANT: Call get_available_times with service_name="${service_name}" for date "${parsed.date}" to show customer the actual available times. DO NOT just say "try another time".`
      );
    } else if (availableStaff.length === 1) {
      // Only ONE staff available - auto-assign silently
      staff_id = String(availableStaff[0]._id);

      if (DEBUG) {
        console.log(`[book_appointment] Auto-assigning only available staff: ${availableStaff[0].fullName} (${staff_id})`);
      }
    } else {
      // MULTIPLE staff available - customer must choose
      return {
        success: false,
        needs_selection: true,
        selection_type: "staff",
        available_staff: availableStaff.map(s => ({
          id: String(s._id),
          name: s.fullName,
        })),
        message: `Multiple staff members are available for "${serviceCategory.name}" on ${parsed.date} at ${parsed.start}. Please ask the customer which staff member they prefer, then call book_appointment again with the staff_id parameter.`,
      };
    }

    // 7. Handle pet
    let pet_id = null;

    if (pet_name && pet_type) {
      const petSpecies = ["dog", "cat"].includes(pet_type) ? pet_type : "other";
      let pet = await Pet.findOne({
        companyId: company._id,
        customerId: contact._id,
        name: pet_name,
      });

      if (!pet) {
        pet = await Pet.create({
          companyId: company._id,
          customerId: contact._id,
          name: pet_name,
          species: petSpecies,
          sex: "unknown",
        });
      }
      pet_id = String(pet._id);
    } else {
      const pets = await Pet.find({
        companyId: company._id,
        customerId: contact._id,
      }).sort({ createdAt: 1 }).limit(1).lean();

      if (pets.length === 0) {
        return {
          success: false,
          needs_information: true,
          missing_fields: ["pet_name", "pet_type"],
          message: "Please ask for the pet's name and type (dog/cat/other) to complete the booking.",
        };
      }
      pet_id = String(pets[0]._id);
    }

    // 8. Create appointment via BookingService
    // Note: startDate and endDate already declared above for availability checks

    const appointmentData = {
      companyId: String(company._id),
      customerId: String(contact._id),
      serviceId: String(serviceCategory._id),
      serviceItemId: service_item_id,
      staffId: staff_id,
      locationId: location_id,
      petId: pet_id,
      start: startDate,
      end: endDate,
      status: "scheduled",
      source: "social",
      ...(incomingNotes ? { notes: String(incomingNotes) } : {}),
    };

    if (DEBUG) {
      console.log("[book_appointment] Creating appointment:", {
        ...appointmentData,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      });
    }

    const appointment = await BookingService.createAppointment(appointmentData);

    const appointmentMoment = moment.tz(parsed.date, timezone);
    return {
      success: true,
      appointment_id: String(appointment._id),
      appointment_date: parsed.date,
      start_time: parsed.start,
      end_time: parsed.end,
      confirmation: {
        day_of_week: appointmentMoment.format("dddd"),
        formatted_date: appointmentMoment.format("MMMM D, YYYY"),
        date_with_day: appointmentMoment.format("dddd, MMMM D, YYYY"),
      },
      message_to_customer: `Appointment confirmed for ${appointmentMoment.format("dddd, MMMM D")} at ${parsed.start} until ${parsed.end}.`,
    };

  } catch (err) {
    console.error("[book_appointment] Error:", err.message);
    if (DEBUG) {
      console.error("[book_appointment] Stack:", err.stack);
    }

    // Handle specific error codes from BookingService
    if (err.code === "BOOKING_CONFLICT") {
      throw new Error(
        `${err.message}. IMPORTANT: Call get_available_times with service_name="${service_name}" for date "${parsed?.date || 'requested date'}" to show customer the actual available times. DO NOT just say "try another time".`
      );
    }

    if (err.code === "VALIDATION_FAILED") {
      throw new Error(`Validation failed: ${err.validationErrors?.join("; ") || err.message}`);
    }

    throw new Error(err?.message || "Failed to book appointment");
  }
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
