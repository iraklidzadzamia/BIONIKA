import {
  getContactByChatId,
  updateContactInfo,
  convertContactToCustomer,
} from "../services/contact.service.js";
import { getBookingContext, escapeRegex } from "./bookingContext.js";
import mongoose from "mongoose";
import moment from "moment-timezone";
import { BookingService } from "../../backend/src/services/bookingService.js";
import {
  Pet,
  Company,
  Location,
  ServiceCategory,
  ServiceItem,
  User,
  Appointment,
} from "@petbuddy/shared";
import { 
  executeDatabaseOperation, 
  validateDatabaseResult, 
  validateWriteResult 
} from "./databaseWrapper.js";
import { verifyAuthorization, verifyResourceOwnership } from "./authorization.js";
import { createBookingHold, releaseBookingHold } from "./bookingHoldManager.js";

/**
 * Convert HH:mm time string to minutes since midnight
 */
function timeToMinutes(timeStr) {
  if (typeof timeStr !== "string") return null;
  const [h, m] = timeStr.split(":");
  const hours = Number(h);
  const minutes = Number(m);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to HH:mm time string
 */
function minutesToHm(total) {
  const h = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const m = (total % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

// REMOVED: checkStaffAvailability and findAvailableStaff functions
//
// These functions were duplicating availability logic that already exists in BookingService.checkAvailability
// The backend BookingService now handles ALL availability validation including:
// - Appointment conflicts with buffer time
// - Staff time-off
// - Working hours validation
// - Break window checking
//
// Instead of pre-checking availability here, we now try booking with each qualified staff
// and let BookingService reject with BOOKING_CONFLICT if the staff is unavailable.

/**
 * Factory for shared tool handlers across platforms.
 * Handlers accept (params, context) where context includes at least chat_id.
 */
export function createToolHandlers(platform) {
  return {
    get_current_datetime: async (_params, context = {}) => {
      const timezone = context.timezone || "UTC";
      const now = moment.tz(timezone);
      return {
        timezone,
        local_text: now.format("YYYY-MM-DD HH:mm:ss"),
        iso_local: now.format("YYYY-MM-DD[T]HH:mm:ss"),
        utc_iso: now.clone().utc().toISOString(),
        ymd: now.format("YYYY-MM-DD"),
        spelled: now.format("MMMM DD, YYYY"),
        weekday: now.format("dddd"),
      };
    },
    get_customer_full_name: async ({ full_name, chat_id }, context = {}) => {
      const id = chat_id || context.chat_id;
      if (id && context.company_id) {
        const contact = await getContactByChatId(
          id,
          context.company_id,
          platform
        );
        if (contact) {
          await updateContactInfo(contact._id, { fullName: full_name });
        }
      }
      return { full_name };
    },

    get_customer_info: async (
      { full_name, phone_number, chat_id },
      context = {}
    ) => {
      const id = chat_id || context.chat_id;
      if (id && context.company_id) {
        const contact = await getContactByChatId(
          id,
          context.company_id,
          platform
        );
        if (contact) {
          await updateContactInfo(contact._id, {
            fullName: full_name,
            phone: phone_number,
          });
        }
      }
      return { full_name, phone_number };
    },

    get_customer_phone_number: async (
      { phone_number, chat_id },
      context = {}
    ) => {
      const id = chat_id || context.chat_id;
      if (id && context.company_id) {
        const contact = await getContactByChatId(
          id,
          context.company_id,
          platform
        );
        if (contact) {
          await updateContactInfo(contact._id, { phone: phone_number });
        }
      }
      return { phone_number };
    },

    book_appointment: async (params, context = {}) => {
      const DEBUG = process.env.DEBUG_APPOINTMENTS === "true";

      try {
        const {
          appointment_time,
          service_name,
          location_id,
          staff_id,
          pet_size,
          pet_name,
          pet_type,
          notes: incomingNotes,
        } = params;

        // AUTHORIZATION CHECK: Verify chat can book for this company
        await verifyAuthorization(context, 'create', 'appointment');

        // Basic validation
        if (!context?.company_id)
          throw new Error("Missing company context for booking");
        if (!context?.chat_id)
          throw new Error("Missing customer chat_id in context");
        if (!appointment_time)
          throw new Error(
            "appointment_time is required (e.g., 'tomorrow at 14:00', '11:00')"
          );
        if (!service_name)
          throw new Error(
            "service_name is required (e.g., 'Full Groom', 'Nail Trim')"
          );

        // 1. Get unified booking context (company, service, staff, location, etc.)
        const bookingCtx = await getBookingContext({
          companyId: context.company_id,
          serviceName: service_name,
          petSize: pet_size,
          workingHours: context.working_hours,
          timezone: context.timezone,
          preferredLocationId: location_id,
          preferredStaffId: staff_id,
        });

        const {
          company,
          timezone,
          workingHours,
          service: serviceCategory,
          serviceId: service_id,
          serviceItemId: service_item_id,
          serviceDuration,
          location,
          locationId: resolved_location_id,
          locationOptions,
          qualifiedStaff,
          qualifiedStaffIds,
          staffOptions,
        } = bookingCtx;

        // 2. Check if location selection is needed
        if (locationOptions.length > 1 && !location_id) {
          return {
            success: false,
            needs_selection: {
              type: 'location',
              options: locationOptions,
              message: `LOCATION SELECTION REQUIRED: This company has ${locationOptions.length} locations. Please ask the customer which location they prefer and call get_location_choices to present the options with addresses.`
            },
            context: {
              appointment_time: params.appointment_time,
              service_name: params.service_name,
              pet_size: params.pet_size,
              pet_name: params.pet_name,
              pet_type: params.pet_type,
            }
          };
        }

        // Use the resolved location_id for booking
        const final_location_id = resolved_location_id;

        if (DEBUG) {
          console.log("[book_appointment] Request:", {
            service_name,
            appointment_time,
            pet_size,
            timezone,
            location_id: final_location_id,
            staff_id,
          });
          console.log(`[book_appointment] Service: ${serviceCategory.name}`);
          console.log(`[book_appointment] Duration: ${serviceDuration} min`);
          console.log(`[book_appointment] Location: ${location.label || location.address}`);
          console.log(`[book_appointment] Qualified staff: ${qualifiedStaffIds.length}`);
        }

        // 3. Parse appointment time BEFORE checking staff availability
        const parsed = parseAppointmentTime(
          appointment_time,
          timezone,
          serviceDuration
        );

        if (!parsed) {
          const now = moment.tz(timezone);
          const lowerText = String(appointment_time).toLowerCase();
          if (
            lowerText.includes("today") ||
            lowerText.includes("now") ||
            lowerText.includes("დღეს")
          ) {
            throw new Error(
              `Could not parse appointment time from "${appointment_time}". Appointments cannot be in the past. Current time is ${now.format(
                "HH:mm"
              )}. Please choose a future time.`
            );
          }
          throw new Error(
            `Could not parse appointment time from "${appointment_time}". Please use a format like "tomorrow at 2pm", "11:00", "Friday at 10:30", or "2025-10-20 at 14:00".`
          );
        }

        // 3.5. Check if staff selection is needed WITH AVAILABILITY CHECK
        // Now that we have parsed time, check staff availability
        if (qualifiedStaffIds.length > 1 && !staff_id) {
          // Check availability for each qualified staff member
          const startDate = moment.tz(`${parsed.date}T${parsed.start}:00`, timezone).toDate();
          const endDate = moment.tz(`${parsed.date}T${parsed.end}:00`, timezone).toDate();
          
          console.log(`[book_appointment] Checking availability for ${qualifiedStaffIds.length} staff at ${parsed.date} ${parsed.start}-${parsed.end}`);
          
          const availabilityChecks = await Promise.all(
            qualifiedStaffIds.map(async (staffId) => {
              const availabilityResult = await BookingService.checkAvailability(
                staffId,
                startDate,
                endDate,
                context.company_id,
                null,
                final_location_id
              );
              return {
                staffId,
                available: availabilityResult.available,
                reason: availabilityResult.reason
              };
            })
          );
          
          // Filter to only available staff
          const availableStaffIds = availabilityChecks
            .filter(check => check.available)
            .map(check => check.staffId);
          
          console.log(`[book_appointment] ${availableStaffIds.length}/${qualifiedStaffIds.length} staff available at requested time`);
          
          if (availableStaffIds.length === 0) {
            // NO STAFF AVAILABLE - Return conflict and suggest get_available_times
            return {
              success: false,
              conflict: true,
              all_staff_unavailable: true,
              message: `All staff members are booked at ${appointment_time}. Please call get_available_times to see when they're available.`,
              get_available_times_params: {
                appointment_date: parsed.date,
                service_name: params.service_name,
                location_id: final_location_id
              }
            };
          } else if (availableStaffIds.length === 1) {
            // Only ONE staff available - use them automatically
            const onlyAvailableStaffId = availableStaffIds[0];
            console.log(`[book_appointment] Only 1 staff available, auto-selecting: ${onlyAvailableStaffId}`);
            // Update qualifiedStaffIds to just this one staff
            qualifiedStaffIds.length = 0;
            qualifiedStaffIds.push(onlyAvailableStaffId);
            // Continue with booking
          } else {
            // MULTIPLE STAFF AVAILABLE - Auto-select unless customer has preference
            // Filter staffOptions to only show AVAILABLE staff
            const availableStaffOptions = staffOptions.filter(s => 
              availableStaffIds.includes(s.id)
            );
            
            return {
              success: false,
              needs_selection: {
                type: 'staff',
                location_id: final_location_id,
                location_name: location.label || location.address,
                options: availableStaffOptions,
                message: `${availableStaffOptions.length} staff members are available to provide "${serviceCategory.name}" at ${location.label || location.address} on ${appointment_time}: ${availableStaffOptions.map(s => s.name).join(', ')}. You should AUTO-SELECT the first available staff by calling get_staff_list (with service_name, location_id, appointment_time, duration_minutes) and using the first staff's id in book_appointment. Only ask the customer to choose if they specifically request a preference.`
              },
              context: {
                appointment_time: params.appointment_time,
                service_name: params.service_name,
                location_id: final_location_id,
                pet_size: params.pet_size,
                pet_name: params.pet_name,
                pet_type: params.pet_type,
                duration_minutes: serviceDuration // Pass duration for availability check
              }
            };
          }
        }

        // 4. Working hours validation removed - BookingService handles this comprehensively
        // BookingService.checkAvailability validates:
        // - Working hours from StaffSchedule or company.settings.workHours
        // - Break windows
        // - Buffer time
        // - Staff time-off
        // Removing duplicate validation reduces maintenance and ensures single source of truth

        // 4. Get and validate customer
        let contact = await getContactByChatId(
          context.chat_id,
          context.company_id,
          platform
        );
        if (!contact) {
          throw new Error(
            "No contact found. Please start a conversation first."
          );
        }

        // Check for missing customer information and return helpful message
        const missingInfo = [];
        if (!contact.fullName || !contact.fullName.trim()) {
          missingInfo.push("full_name");
        }
        if (!contact.phone || !contact.phone.trim()) {
          missingInfo.push("phone_number");
        }

        if (missingInfo.length > 0) {
          let questionExample = "";
          if (
            missingInfo.includes("full_name") &&
            missingInfo.includes("phone_number")
          ) {
            questionExample =
              "Could you please provide your full name and phone number so I can complete your booking?";
          } else if (missingInfo.includes("full_name")) {
            questionExample =
              "Could you please provide your full name so I can complete your booking?";
          } else {
            questionExample =
              "Could you please provide your phone number so I can complete your booking?";
          }

          return {
            success: false,
            needs_information: true,
            missing_fields: missingInfo,
            message: `INFORMATION NEEDED: To complete the booking, please ask the customer for their ${missingInfo
              .join(" and ")
              .replace("_", " ")}. Example question: '${questionExample}'`,
            context: {
              appointment_time: params.appointment_time,
              service_name: params.service_name,
              pet_size: params.pet_size,
              pet_name: params.pet_name,
              pet_type: params.pet_type,
            },
          };
        }

        if (contact.contactStatus === "lead") {
          contact = await convertContactToCustomer(contact._id);
        }

        // 4. Staff selection and appointment timing
        console.log(
          `[book_appointment] Found ${qualifiedStaffIds.length} qualified staff for ${serviceCategory.name}`
        );

        // TIMEZONE HANDLING: Convert company timezone to UTC for database storage
        // 1. parsed.date and parsed.start are in company timezone (HH:mm format)
        // 2. moment.tz() creates a moment in company timezone
        // 3. toDate() converts to JavaScript Date object (stored as UTC internally)
        // 4. BookingService receives UTC dates and converts back to company timezone for validation
        // This ensures consistent timezone handling across the system
        const startDate = moment
          .tz(`${parsed.date}T${parsed.start}:00`, timezone)
          .toDate();
        const endDate = moment
          .tz(`${parsed.date}T${parsed.end}:00`, timezone)
          .toDate();

        console.log(
          `[book_appointment] Will try booking with ${qualifiedStaffIds.length} qualified staff`
        );
        console.log(
          `[book_appointment]   Date: ${parsed.date}, Time: ${parsed.start} - ${parsed.end}`
        );
        console.log(`[book_appointment]   Timezone: ${timezone}`);
        console.log(
          `[book_appointment]   UTC Start: ${startDate.toISOString()}`
        );
        console.log(`[book_appointment]   UTC End: ${endDate.toISOString()}`);

        // 8. Handle pet (do this before trying staff)
        let pet_id = null;

        if (pet_name && pet_type) {
          try {
            const petSpecies =
              pet_type === "dog" || pet_type === "cat" ? pet_type : "other";

            // Try to find existing pet
            let pet = await Pet.findOne({
              companyId: company._id,
              customerId: contact._id,
              name: pet_name,
            });

            // Create new pet if not found
            if (!pet) {
              pet = await Pet.create({
                companyId: company._id,
                customerId: contact._id,
                name: pet_name,
                species: petSpecies,
                sex: "unknown",
              });

              console.log(
                `[book_appointment] Created new pet: ${pet_name} (${petSpecies}) for customer ${contact._id}`
              );
            }

            pet_id = String(pet._id);
          } catch (petError) {
            console.error("[book_appointment] Failed to handle pet data:", petError);
            throw new Error(
              `Failed to process pet information: ${petError.message}. Please try again.`
            );
          }
        } else {
          try {
            // Find customer's registered pets
            const registeredPets = await Pet.find({
              companyId: company._id,
              customerId: contact._id,
            })
              .sort({ createdAt: 1 })
              .limit(1)
              .lean();

            if (registeredPets.length > 0) {
              pet_id = String(registeredPets[0]._id);
              console.log(
                `[book_appointment] Using existing pet: ${registeredPets[0].name} for customer ${contact._id}`
              );
            } else {
              return {
                success: false,
                needs_information: true,
                missing_fields: ["pet_name", "pet_type"],
                message:
                  "INFORMATION NEEDED: To complete the booking, please ask the customer for their pet's name and type. Example question: 'What is your pet's name and what type of pet do you have? (dog, cat, or other)'",
                context: {
                  appointment_time: params.appointment_time,
                  service_name: params.service_name,
                  pet_size: params.pet_size,
                },
              };
            }
          } catch (petError) {
            console.error("[book_appointment] Failed to retrieve customer's pets:", petError);
            throw new Error(
              `Failed to retrieve pet information: ${petError.message}. Please try again.`
            );
          }
        }

        // === STEP 11: Try booking with each qualified staff until one succeeds ===
        let lastError = null;
        const conflictMetadata = {
          requestedTime: { date: parsed.date, start: parsed.start, end: parsed.end },
          failedStaffCount: 0,
          conflicts: []
        };

        for (let i = 0; i < qualifiedStaffIds.length; i++) {
          const staff_id = qualifiedStaffIds[i];
          let holdId = null;

          try {
            // RACE CONDITION FIX: Create booking hold to prevent concurrent bookings
            try {
              holdId = await createBookingHold(
                staff_id,
                startDate,
                endDate,
                company._id,
                {
                  chatId: context.chat_id,
                  platform,
                  locationId: final_location_id,
                  customerId: String(contact._id),
                  // TEMP FIX: Use staffId as resourceTypeId until proper resource types are configured
                  // The BookingHold schema requires resourceTypeId (ObjectId ref to ResourceType)
                  // In a staff-based booking system, we use staffId as a proxy for now
                  resourceTypeId: staff_id,
                }
              );
              console.log(
                `[book_appointment] Booking hold created for staff ${i + 1}: ${holdId}`
              );
            } catch (holdError) {
              if (holdError.code === 'BOOKING_HOLD_EXISTS') {
                console.log(
                  `[book_appointment] Staff ${i + 1} slot already held, trying next staff`
                );
                conflictMetadata.failedStaffCount++;
                conflictMetadata.conflicts.push({
                  staffId: staff_id,
                  reason: 'booking_hold_exists',
                  message: 'Time slot already reserved'
                });
                continue; // Try next staff
              }
              throw holdError; // Other errors should fail the booking
            }
            const appointmentData = {
              companyId: String(company._id),
              customerId: String(contact._id),
              serviceId: service_id,
              serviceItemId: service_item_id,
              staffId: staff_id,
              locationId: final_location_id, // FIXED: Use resolved location ID, not original param
              petId: pet_id,
              start: startDate,
              end: endDate,
              status: "scheduled",
              source: "social",
              ...(incomingNotes ? { notes: String(incomingNotes) } : {}),
            };

            console.log(
              `[book_appointment] Trying staff ${i + 1}/${qualifiedStaffIds.length}: ${staff_id}`
            );
            console.log(
              "[book_appointment] Calling BookingService.createAppointment with data:"
            );
            console.log(
              JSON.stringify(
                {
                  ...appointmentData,
                  start: appointmentData.start.toISOString(),
                  end: appointmentData.end.toISOString(),
                },
                null,
                2
              )
            );

            const appointment = await BookingService.createAppointment(
              appointmentData
            );

            // VALIDATION: Ensure appointment was actually created
            if (!appointment) {
              throw new Error('BookingService.createAppointment returned no result - appointment creation may have failed');
            }

            if (!appointment._id) {
              throw new Error('BookingService.createAppointment returned appointment without _id - data may be corrupted');
            }

            // Release the hold after successful booking
            await releaseBookingHold(holdId, {
              chatId: context.chat_id,
              platform
            });

            console.log(
              `[book_appointment] ✅ SUCCESS with staff ${i + 1}/${qualifiedStaffIds.length}: ${appointment._id}`
            );

            // Emit real-time socket event for dashboard updates
            try {
              const { emitAppointmentCreated } = await import('../utils/realtimeAppointments.js');
              await emitAppointmentCreated(String(appointment._id));
            } catch (socketError) {
              // Log but don't fail the booking if socket emission fails
              console.warn('[book_appointment] Failed to emit socket event:', socketError.message);
            }

            const appointmentMoment = moment.tz(parsed.date, timezone);

            // Get staff details for confirmation
            const bookedStaff = qualifiedStaff.find(s => String(s._id) === staff_id);

            const confirmationDetails = {
              day_of_week: appointmentMoment.format("dddd"),
              formatted_date: appointmentMoment.format("MMMM D, YYYY"),
              date_with_day: appointmentMoment.format("dddd, MMMM D, YYYY"),
              start_time_formatted: parsed.start,
              end_time_formatted: parsed.end,
              location_name: location.label || location.address,
              staff_name: bookedStaff ? bookedStaff.fullName : 'staff member',
            };

            return {
              success: true,
              appointment_id: String(appointment._id),
              appointment_date: parsed.date,
              start_time: parsed.start,
              end_time: parsed.end,
              staff_id,
              staff_name: confirmationDetails.staff_name,
              location_id: final_location_id,
              location_name: confirmationDetails.location_name,
              service_id,
              service_item_id,
              customer_id: String(contact._id),
              confirmation: confirmationDetails,
              message_to_customer: `Please confirm: Your appointment is scheduled for ${confirmationDetails.date_with_day} at ${parsed.start} with ${confirmationDetails.staff_name} at ${confirmationDetails.location_name}. The appointment will last until ${parsed.end}.`,
            };
          } catch (staffError) {
            // Release hold on failure
            if (holdId) {
              await releaseBookingHold(holdId, {
                chatId: context.chat_id,
                platform
              });
            }

            console.log(
              `[book_appointment] ❌ Staff ${i + 1}/${qualifiedStaffIds.length} unavailable: ${staffError.message}`
            );
            lastError = staffError;

            // If this is a booking conflict, track it and try next staff
            if (staffError.code === "BOOKING_CONFLICT") {
              conflictMetadata.failedStaffCount++;
              conflictMetadata.conflicts.push({
                staffId: staff_id,
                reason: 'booking_conflict',
                message: staffError.message
              });

              console.log(
                `[book_appointment] Trying next staff member (${i + 2}/${qualifiedStaffIds.length})...`
              );
              continue;
            }

            // For other errors, stop trying and throw
            throw staffError;
          }
        }

        // If we get here, all staff members were unavailable
        console.log(
          `[book_appointment] ❌ All ${qualifiedStaffIds.length} qualified staff are unavailable`
        );

        // Return structured conflict response instead of throwing
        return {
          success: false,
          conflict: true,
          all_staff_unavailable: true,
          service_name: serviceCategory.name,
          requested_date: parsed.date,
          requested_time: parsed.start,
          requested_end: parsed.end,
          qualified_staff_count: qualifiedStaffIds.length,
          conflict_metadata: conflictMetadata,
          message: `BOOKING CONFLICT: All ${qualifiedStaffIds.length} qualified staff members are unavailable for ${serviceCategory.name} on ${parsed.date} at ${parsed.start}. You MUST now call the 'get_available_times' tool with service_name="${serviceCategory.name}" and appointment_date="${parsed.date}" to find alternative time slots and present them to the customer. DO NOT just say 'try another time' - show actual available times.`,
          suggested_action: "call_get_available_times",
          get_available_times_params: {
            service_name: serviceCategory.name,
            appointment_date: parsed.date,
            pet_size: pet_size || null
          }
        };
      } catch (err) {
        console.error("[book_appointment] Error:", err.message);
        if (DEBUG) {
          console.error("[book_appointment] Code:", err.code);
          console.error("[book_appointment] Stack:", err.stack);
        }

        if (
          err.code === "VALIDATION_FAILED" &&
          Array.isArray(err.validationErrors)
        ) {
          throw new Error(
            `Cannot create appointment - validation errors: ${err.validationErrors.join(
              "; "
            )}. Please provide all required information and try again.`
          );
        }

        // Note: BOOKING_CONFLICT is now handled inline above and returns structured data
        // This catch block only handles unexpected errors that occur outside the staff iteration loop

        if (err.code === "RESOURCE_CONFLICT") {
          throw new Error(
            `RESOURCE CONFLICT: ${err.message}. The required resources are not available at this time. Please call 'get_available_times' to find when resources are available.`
          );
        }

        if (err.code === "STAFF_NOT_QUALIFIED") {
          throw new Error(
            `STAFF ERROR: The selected staff member is not qualified for this service. This should not happen - please contact support.`
          );
        }

        throw new Error(err?.message || "Failed to book appointment");
      }
    },

    get_available_times: async (params, context = {}) => {
      const DEBUG = process.env.DEBUG_APPOINTMENTS === "true";
      if (DEBUG) {
        console.log("[get_available_times] Input:", {
          params,
          context: {
            company_id: context.company_id,
            timezone: context.timezone,
          },
        });
      }

      try {
        const {
          appointment_date,
          service_name,
          pet_size,
          staff_id,
          location_id,
        } = params;

        // Validate inputs
        if (!context?.company_id) {
          throw new Error("Missing company context");
        }
        if (!appointment_date) {
          throw new Error("appointment_date is required");
        }
        if (!service_name) {
          throw new Error(
            "service_name is required. Please specify which service (e.g., 'Full Groom', 'Nail Trim')"
          );
        }

        const company = await Company.findById(context.company_id).lean();
        if (!company) {
          throw new Error("Company not found");
        }

        const timezone = context.timezone || company.timezone || "UTC";
        const working_hours = Array.isArray(context.working_hours)
          ? context.working_hours
          : [];

        // Convert relative dates to actual dates
        let actualDate = appointment_date;
        const lowerDate = String(appointment_date).toLowerCase().trim();
        const now = moment.tz(timezone);

        if (lowerDate === "today" || lowerDate === "დღეს") {
          actualDate = now.format("YYYY-MM-DD");
        } else if (lowerDate === "tomorrow" || lowerDate === "ხვალ") {
          actualDate = now.clone().add(1, "day").format("YYYY-MM-DD");
        } else if (
          lowerDate === "day after tomorrow" ||
          lowerDate === "ზეგ" ||
          lowerDate === "მაზეგ"
        ) {
          actualDate = now.clone().add(2, "days").format("YYYY-MM-DD");
        } else {
          // Try to parse as date - if it's already YYYY-MM-DD, keep it
          const parsedDate = moment.tz(
            appointment_date,
            "YYYY-MM-DD",
            timezone
          );
          if (parsedDate.isValid()) {
            actualDate = parsedDate.format("YYYY-MM-DD");
          }
        }

        // Resolve service by name
        const trimmedServiceName = String(service_name).trim();

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

        const resolvedServiceId = String(serviceCategory._id);
        if (DEBUG) {
          console.log(
            `[get_available_times] Resolved service: ${serviceCategory.name} (${resolvedServiceId})`
          );
        }

        // Determine service duration
        let serviceDuration = 60; // default

        const itemQuery = {
          companyId: company._id,
          serviceCategoryId: serviceCategory._id,
          active: true,
        };

        // If pet_size is specified, try to find specific item
        if (pet_size) {
          const normalizedSize = String(pet_size).toUpperCase().trim();
          const specificItem = await ServiceItem.findOne({
            ...itemQuery,
            size: normalizedSize,
          }).lean();

          if (specificItem) {
            serviceDuration = specificItem.durationMinutes || 60;
          }
        }

        // If no specific size or item not found, use maximum duration from all items
        if (!pet_size || serviceDuration === 60) {
          const allItems = await ServiceItem.find(itemQuery)
            .select("durationMinutes size")
            .lean();

          if (allItems.length > 0) {
            serviceDuration = Math.max(
              ...allItems.map((i) => i.durationMinutes || 60)
            );
          }
        }

        // Get qualified staff
        const serviceAllowedRoles = Array.isArray(serviceCategory.allowedRoles)
          ? serviceCategory.allowedRoles
          : ["groomer"];

        const staffWithRoles = await User.find({
          companyId: company._id,
          isActive: true,
          role: { $in: serviceAllowedRoles },
        })
          .select("_id role serviceCategoryIds")
          .lean();

        const qualifiedStaff = staffWithRoles.filter((staff) => {
          // IMPORTANT: Staff with NO serviceCategoryIds configured can serve ALL services (no restrictions)
          if (
            !staff.serviceCategoryIds ||
            staff.serviceCategoryIds.length === 0
          ) {
            return true; // ✅ Staff with no restrictions = qualified for all services
          }
          // Staff with configured serviceCategoryIds must have this specific service in their list
          const serviceCategoryIdStrings = staff.serviceCategoryIds.map((id) =>
            String(id)
          );
          return serviceCategoryIdStrings.includes(resolvedServiceId);
        });

        if (qualifiedStaff.length === 0) {
          return {
            success: true,
            service_name: serviceCategory.name,
            time_ranges: [],
            message:
              "No staff members are currently qualified for this service.",
          };
        }

        const qualifiedStaffIds = qualifiedStaff.map((s) => String(s._id));
        if (DEBUG) {
          console.log(
            `[get_available_times] Qualified staff count: ${qualifiedStaffIds.length}`
          );
        }

        // Check working hours
        const appointmentDate = moment.tz(actualDate, timezone);
        const weekday = appointmentDate.day();
        const dayWorkingHours = working_hours.filter(
          (wh) => wh.weekday === weekday
        );

        if (dayWorkingHours.length === 0) {
          return {
            success: true,
            service_name: serviceCategory.name,
            time_ranges: [],
            message: `Sorry, we are closed on ${appointmentDate.format(
              "dddd"
            )}s.`,
          };
        }

        // Get existing appointments
        const existingAppointments = await Appointment.find({
          companyId: company._id,
          start: {
            $gte: new Date(`${actualDate}T00:00:00`),
            $lt: new Date(`${actualDate}T23:59:59`),
          },
          status: { $nin: ["canceled", "no_show"] },
        })
          .select("start end staffId")
          .lean();

        if (DEBUG) {
          console.log(
            `[get_available_times] Existing appointments: ${existingAppointments.length}, Duration: ${serviceDuration}min`
          );
        }

        // Calculate available time ranges
        const timeRanges = [];

        for (const staffId of qualifiedStaffIds) {
          const staffAppointments = existingAppointments.filter(
            (apt) => String(apt.staffId) === staffId
          );

          for (const wh of dayWorkingHours) {
            const whStart = timeToMinutes(wh.startTime);
            const whEnd = timeToMinutes(wh.endTime);

            let rangeStart = null;
            let rangeEnd = null;

            // Check every 15-minute interval to find continuous available ranges
            for (
              let currentTime = whStart;
              currentTime + serviceDuration <= whEnd;
              currentTime += 15
            ) {
              const slotEnd = currentTime + serviceDuration;

              // Check if this slot overlaps with any existing appointment
              const hasConflict = staffAppointments.some((apt) => {
                const aptStart = moment.tz(apt.start, timezone);
                const aptEnd = moment.tz(apt.end, timezone);
                const aptStartMin = aptStart.hours() * 60 + aptStart.minutes();
                const aptEndMin = aptEnd.hours() * 60 + aptEnd.minutes();
                return slotEnd > aptStartMin && currentTime < aptEndMin;
              });

              if (!hasConflict) {
                // This slot is available
                if (rangeStart === null) {
                  rangeStart = currentTime;
                  rangeEnd = currentTime;
                } else {
                  rangeEnd = currentTime;
                }
              } else {
                // Conflict found, save the current range if exists
                if (rangeStart !== null) {
                  const start = minutesToHm(rangeStart);
                  const end = minutesToHm(rangeEnd);
                  if (
                    !timeRanges.some((r) => r.start === start && r.end === end)
                  ) {
                    timeRanges.push({ start, end });
                  }
                  rangeStart = null;
                  rangeEnd = null;
                }
              }
            }

            // Save the last range if exists
            if (rangeStart !== null) {
              const start = minutesToHm(rangeStart);
              const end = minutesToHm(rangeEnd);
              if (!timeRanges.some((r) => r.start === start && r.end === end)) {
                timeRanges.push({ start, end });
              }
            }
          }
        }

        timeRanges.sort((a, b) => a.start.localeCompare(b.start));

        // Merge overlapping time ranges to present clean availability
        // This aggregates availability across multiple qualified staff members
        const mergedRanges = [];
        for (const range of timeRanges) {
          const startMinutes = timeToMinutes(range.start);
          const endMinutes = timeToMinutes(range.end);

          if (mergedRanges.length === 0) {
            mergedRanges.push({ start: range.start, end: range.end });
            continue;
          }

          const lastMerged = mergedRanges[mergedRanges.length - 1];
          const lastMergedEnd = timeToMinutes(lastMerged.end);

          // Check if current range overlaps or is adjacent to the last merged range
          // Adjacent means within 15 minutes (one slot interval)
          if (startMinutes <= lastMergedEnd + 15) {
            // Merge: extend the last range if current range extends beyond it
            const currentEndMinutes = timeToMinutes(range.end);
            if (currentEndMinutes > lastMergedEnd) {
              lastMerged.end = range.end;
            }
          } else {
            // No overlap - add as separate range
            mergedRanges.push({ start: range.start, end: range.end });
          }
        }

        if (DEBUG) {
          console.log(
            `[get_available_times] Result: ${timeRanges.length} time ranges found, merged to ${mergedRanges.length} ranges`
          );
        }

        return {
          success: true,
          service_name: serviceCategory.name,
          time_ranges: mergedRanges,
          message:
            mergedRanges.length === 0
              ? `No available times for ${serviceCategory.name} on this date. All qualified staff are fully booked.`
              : `Available times for ${serviceCategory.name}. Present the time ranges to the customer.`,
        };
      } catch (error) {
        console.error("[get_available_times] Error:", error.message);
        if (DEBUG) {
          console.error("[get_available_times] Stack:", error.stack);
        }
        throw new Error(
          error?.message ||
            "Availability service is temporarily unavailable. Please try again soon."
        );
      }
    },

    get_customer_appointments: async (params, context = {}) => {
      console.log("Getting customer appointments:", params);
      try {
        const { status = "upcoming", limit = 5 } = params;

        if (!context?.company_id) {
          throw new Error("Missing company context");
        }

        if (!context?.chat_id) {
          throw new Error("Missing customer chat_id in context");
        }

        // Get contact/customer
        const contact = await getContactByChatId(
          context.chat_id,
          context.company_id,
          platform
        );

        if (!contact) {
          throw new Error(
            "No customer found. Please start a conversation first."
          );
        }

        const query = {
          customerId: contact._id,
          companyId: context.company_id,
        };

        const now = new Date();
        const timezone = context.timezone || "UTC";

        if (status === "upcoming") {
          query.start = { $gte: now };
          query.status = { $nin: ["canceled", "completed", "no_show"] };
        } else if (status === "past") {
          query.start = { $lt: now };
        }
        // status === "all" - no additional filter

        const appointments = await Appointment.find(query)
          .sort({ start: status === "upcoming" ? 1 : -1 })
          .limit(limit)
          .populate("serviceId", "name")
          .populate("staffId", "fullName")
          .populate("locationId", "name address")
          .populate("petId", "name species")
          .lean();

        const formattedAppointments = appointments.map((apt) => {
          const startMoment = moment.tz(apt.start, timezone);
          return {
            id: String(apt._id),
            date: startMoment.format("YYYY-MM-DD"),
            day_of_week: startMoment.format("dddd"),
            formatted_date: startMoment.format("MMMM D, YYYY"),
            time: startMoment.format("HH:mm"),
            service: apt.serviceId?.name || "Unknown service",
            staff: apt.staffId?.fullName || "Not assigned",
            location: apt.locationId?.name || "Not specified",
            pet: apt.petId?.name || "Not specified",
            status: apt.status,
          };
        });

        return {
          success: true,
          count: formattedAppointments.length,
          appointments: formattedAppointments,
          message:
            formattedAppointments.length === 0
              ? status === "upcoming"
                ? "You have no upcoming appointments."
                : "You have no past appointments."
              : undefined,
        };
      } catch (err) {
        console.error("Get appointments error:", err);
        throw new Error(
          err?.message || "Failed to retrieve appointments. Please try again."
        );
      }
    },

    cancel_appointment: async (params, context = {}) => {
      console.log("Canceling appointment:", params);
      try {
        const { appointment_id, cancellation_reason } = params;

        // AUTHORIZATION CHECK: Verify chat can cancel appointments
        await verifyAuthorization(context, 'delete', 'appointment');

        if (!appointment_id) {
          throw new Error("Appointment ID is required to cancel");
        }

        if (!context?.company_id) {
          throw new Error("Missing company context");
        }

        if (!context?.chat_id) {
          throw new Error("Missing customer chat_id in context");
        }

        // Validate ObjectId format
        if (!mongoose.isValidObjectId(appointment_id)) {
          throw new Error(
            "Invalid appointment ID format. Please provide a valid appointment ID."
          );
        }

        // Get contact/customer
        const contact = await getContactByChatId(
          context.chat_id,
          context.company_id,
          platform
        );

        if (!contact) {
          throw new Error(
            "No customer found. Please start a conversation first."
          );
        }

        // Find appointment and verify ownership
        const appointment = await Appointment.findOne({
          _id: appointment_id,
          customerId: contact._id,
          companyId: context.company_id,
        });

        if (!appointment) {
          throw new Error(
            "Appointment not found. Please check the appointment ID and try again."
          );
        }

        // Check if already canceled
        if (appointment.status === "canceled") {
          throw new Error("This appointment has already been canceled.");
        }

        // Check if already completed
        if (appointment.status === "completed") {
          throw new Error(
            "Cannot cancel a completed appointment. Please contact us for assistance."
          );
        }

        // Update appointment to canceled
        appointment.status = "canceled";
        appointment.canceledAt = new Date();

        // Set the required audit.cancelReason field
        if (!appointment.audit) {
          appointment.audit = {};
        }
        appointment.audit.cancelReason = "customer_requested";

        // Optionally add additional notes
        if (cancellation_reason) {
          appointment.notes = appointment.notes
            ? `${appointment.notes}\n\nCancellation reason: ${cancellation_reason}`
            : `Cancellation reason: ${cancellation_reason}`;
        }
        await appointment.save();

        const timezone = context.timezone || "UTC";
        const startMoment = moment.tz(appointment.start, timezone);

        console.log(
          `✅ Appointment ${appointment_id} canceled by customer ${contact._id}`
        );

        // Emit real-time socket event for dashboard updates
        try {
          const { emitAppointmentCanceled } = await import('../utils/realtimeAppointments.js');
          await emitAppointmentCanceled(String(appointment._id));
        } catch (socketError) {
          // Log but don't fail the cancellation if socket emission fails
          console.warn('[cancel_appointment] Failed to emit socket event:', socketError.message);
        }

        return {
          success: true,
          appointment_id: String(appointment._id),
          message: `Your appointment on ${startMoment.format(
            "dddd, MMMM D, YYYY"
          )} at ${startMoment.format("HH:mm")} has been canceled successfully.`,
        };
      } catch (err) {
        console.error("Cancel appointment error:", err);
        throw new Error(err?.message || "Failed to cancel appointment");
      }
    },

    reschedule_appointment: async (params, context = {}) => {
      console.log("Rescheduling appointment:", params);
      try {
        const { appointment_id, new_appointment_text_time, duration } = params;

        if (!appointment_id) {
          throw new Error("Appointment ID is required to reschedule");
        }

        if (!new_appointment_text_time) {
          throw new Error("New appointment time is required");
        }

        if (!context?.company_id) {
          throw new Error("Missing company context");
        }

        if (!context?.chat_id) {
          throw new Error("Missing customer chat_id in context");
        }

        // Validate ObjectId format
        if (!mongoose.isValidObjectId(appointment_id)) {
          throw new Error(
            "Invalid appointment ID format. Please provide a valid appointment ID."
          );
        }

        // Get contact/customer
        const contact = await getContactByChatId(
          context.chat_id,
          context.company_id,
          platform
        );

        if (!contact) {
          throw new Error(
            "No customer found. Please start a conversation first."
          );
        }

        // Find appointment and verify ownership
        const appointment = await Appointment.findOne({
          _id: appointment_id,
          customerId: contact._id,
          companyId: context.company_id,
        }).populate("serviceItemId");

        if (!appointment) {
          throw new Error(
            "Appointment not found. Please check the appointment ID and try again."
          );
        }

        // Check if canceled
        if (appointment.status === "canceled") {
          throw new Error(
            "Cannot reschedule a canceled appointment. Please book a new appointment instead."
          );
        }

        // Check if completed
        if (appointment.status === "completed") {
          throw new Error(
            "Cannot reschedule a completed appointment. Please book a new appointment instead."
          );
        }

        const company = await Company.findById(context.company_id).lean();
        if (!company) {
          throw new Error("Company not found");
        }

        const timezone = context.timezone || company.timezone || "UTC";

        // Calculate duration
        let appointmentDuration = duration;
        if (!appointmentDuration) {
          // Use original appointment duration
          const originalDuration =
            (new Date(appointment.end) - new Date(appointment.start)) / 60000;
          appointmentDuration = originalDuration || 60;
        }

        // Parse new time
        const parsed = parseAppointmentTime(
          new_appointment_text_time,
          timezone,
          appointmentDuration
        );

        if (!parsed) {
          throw new Error(
            "Could not understand the new appointment time. Please use format like 'tomorrow at 2pm' or 'Friday at 10:30am'"
          );
        }

        // Working hours validation removed - BookingService.updateAppointment handles this
        // BookingService validates:
        // - Working hours from StaffSchedule or company.settings.workHours
        // - Break windows
        // - Buffer time
        // - Staff availability
        // Single source of truth for validation logic

        // Convert to Date objects for BookingService
        const startDate = moment
          .tz(`${parsed.date}T${parsed.start}:00`, timezone)
          .toDate();
        const endDate = moment
          .tz(`${parsed.date}T${parsed.end}:00`, timezone)
          .toDate();

        // Check if staff is available at new time
        const availabilityCheck = await BookingService.checkAvailability(
          appointment.userId, // assigned staff
          startDate,
          endDate,
          context.company_id,
          appointment._id, // exclude current appointment from conflict check
          appointment.locationId
        );

        if (!availabilityCheck.available) {
          logger.messageFlow.info(
            'system',
            context.chat_id,
            'reschedule-conflict',
            `Staff unavailable at requested time: ${availabilityCheck.reason}`
          );

          const serviceCategory = appointment.serviceItemId;

          return {
            success: false,
            conflict: true,
            reason: availabilityCheck.reason,
            message: `Cannot reschedule to ${new_appointment_text_time}: ${availabilityCheck.reason}. Please call get_available_times to find when the staff is available.`,
            suggested_action: "call_get_available_times",
            get_available_times_params: {
              service_name: serviceCategory.name,
              appointment_date: parsed.date,
              staff_id: String(appointment.userId)
            }
          };
        }

        const updateData = {
          start: startDate,
          end: endDate,
          staffId: appointment.staffId,
          serviceId: appointment.serviceId,
          serviceItemId: appointment.serviceItemId,
          locationId: appointment.locationId,
        };

        // Use BookingService to update with validation
        const updatedAppointment = await BookingService.updateAppointment(
          appointment_id,
          updateData,
          context.company_id
        );

        // Format confirmation
        const appointmentMoment = moment.tz(parsed.date, timezone);
        const confirmationDetails = {
          day_of_week: appointmentMoment.format("dddd"),
          formatted_date: appointmentMoment.format("MMMM D, YYYY"),
          date_with_day: appointmentMoment.format("dddd, MMMM D, YYYY"),
          start_time_formatted: parsed.start,
          end_time_formatted: parsed.end,
        };

        console.log(
          `✅ Appointment ${appointment_id} rescheduled by customer ${contact._id}`
        );

        // Emit real-time socket event for dashboard updates
        try {
          const { emitAppointmentUpdated } = await import('../utils/realtimeAppointments.js');
          await emitAppointmentUpdated(String(updatedAppointment._id));
        } catch (socketError) {
          // Log but don't fail the reschedule if socket emission fails
          console.warn('[reschedule_appointment] Failed to emit socket event:', socketError.message);
        }

        return {
          success: true,
          appointment_id: String(updatedAppointment._id),
          old_date: moment.tz(appointment.start, timezone).format("YYYY-MM-DD"),
          old_time: moment.tz(appointment.start, timezone).format("HH:mm"),
          new_date: parsed.date,
          new_time: parsed.start,
          confirmation: confirmationDetails,
          message: `Your appointment has been rescheduled to ${confirmationDetails.date_with_day} at ${parsed.start}. The appointment will last until ${parsed.end}.`,
        };
      } catch (err) {
        console.error("Reschedule appointment error:", err);

        // Provide detailed error messages for LLM
        if (err.code === "BOOKING_CONFLICT") {
          throw new Error(
            `Cannot reschedule appointment - ${err.message}. Please choose a different time.`
          );
        }

        if (err.code === "RESOURCE_CONFLICT") {
          throw new Error(
            `Cannot reschedule appointment - ${err.message}. The required resources are not available at this time.`
          );
        }

        if (err.code === "STAFF_NOT_QUALIFIED") {
          throw new Error(
            `Cannot reschedule appointment - the staff member is not qualified for this service.`
          );
        }

        throw new Error(err?.message || "Failed to reschedule appointment");
      }
    },

    get_customer_pets: async (_params, context = {}) => {
      console.log("Getting customer pets");
      try {
        if (!context?.company_id) {
          throw new Error("Missing company context");
        }

        if (!context?.chat_id) {
          throw new Error("Missing customer chat_id in context");
        }

        // Get contact/customer
        const contact = await getContactByChatId(
          context.chat_id,
          context.company_id,
          platform
        );

        if (!contact) {
          throw new Error(
            "No customer found. Please start a conversation first."
          );
        }

        // Get all pets for this customer
        const pets = await Pet.find({
          companyId: context.company_id,
          customerId: contact._id,
        })
          .sort({ name: 1 })
          .lean();

        const formattedPets = pets.map((pet) => ({
          id: String(pet._id),
          name: pet.name,
          species: pet.species,
          breed: pet.breed || "Unknown",
          size: pet.size || "Unknown",
          coat_type: pet.coatType || "unknown",
          age_years: pet.ageYears || null,
          weight_kg: pet.weightKg || null,
          sex: pet.sex,
          temperament: pet.temperament || "normal",
          allergies: pet.allergies || null,
          medical_notes: pet.medicalNotes || null,
        }));

        return {
          success: true,
          count: formattedPets.length,
          pets: formattedPets,
          message:
            formattedPets.length === 0
              ? "You don't have any pets registered yet. Would you like to add one?"
              : undefined,
        };
      } catch (err) {
        console.error("Get pets error:", err);
        throw new Error(
          err?.message || "Failed to retrieve pets. Please try again."
        );
      }
    },

    add_pet: async (params, context = {}) => {
      console.log("Adding pet:", params);
      try {
        const {
          pet_name,
          pet_type,
          breed,
          size,
          coat_type,
          age_years,
          weight_kg,
          sex,
          temperament,
          allergies,
          medical_notes,
        } = params;

        // AUTHORIZATION CHECK: Verify chat can add pets
        await verifyAuthorization(context, 'create', 'pet');

        if (!pet_name) {
          throw new Error("Pet name is required");
        }

        if (!pet_type) {
          throw new Error("Pet type (species) is required");
        }

        if (!context?.company_id) {
          throw new Error("Missing company context");
        }

        if (!context?.chat_id) {
          throw new Error("Missing customer chat_id in context");
        }

        // Get contact/customer
        const contact = await getContactByChatId(
          context.chat_id,
          context.company_id,
          platform
        );

        if (!contact) {
          throw new Error(
            "No customer found. Please start a conversation first."
          );
        }

        // Validate species
        const validSpecies = ["dog", "cat", "other"];
        const normalizedSpecies = pet_type.toLowerCase();
        if (!validSpecies.includes(normalizedSpecies)) {
          throw new Error(
            `Invalid pet type. Must be one of: ${validSpecies.join(", ")}`
          );
        }

        // Validate size if provided
        if (size) {
          const validSizes = ["S", "M", "L", "XL"];
          const normalizedSize = size.toUpperCase();
          if (!validSizes.includes(normalizedSize)) {
            throw new Error(
              `Invalid size. Must be one of: ${validSizes.join(", ")}`
            );
          }
        }

        // Validate coat type if provided
        if (coat_type) {
          const validCoatTypes = [
            "short",
            "medium",
            "long",
            "curly",
            "double",
            "wire",
            "hairless",
            "unknown",
          ];
          const normalizedCoatType = coat_type.toLowerCase();
          if (!validCoatTypes.includes(normalizedCoatType)) {
            throw new Error(
              `Invalid coat type. Must be one of: ${validCoatTypes.join(", ")}`
            );
          }
        }

        // Validate sex if provided
        if (sex) {
          const validSex = ["male", "female", "unknown"];
          const normalizedSex = sex.toLowerCase();
          if (!validSex.includes(normalizedSex)) {
            throw new Error(
              `Invalid sex. Must be one of: ${validSex.join(", ")}`
            );
          }
        }

        // Validate temperament if provided
        if (temperament) {
          const validTemperament = ["calm", "normal", "anxious", "aggressive"];
          const normalizedTemperament = temperament.toLowerCase();
          if (!validTemperament.includes(normalizedTemperament)) {
            throw new Error(
              `Invalid temperament. Must be one of: ${validTemperament.join(
                ", "
              )}`
            );
          }
        }

        // Check if pet with same name already exists for this customer
        const existingPet = await Pet.findOne({
          companyId: context.company_id,
          customerId: contact._id,
          name: pet_name,
        });

        if (existingPet) {
          throw new Error(
            `You already have a pet named "${pet_name}". Please use a different name or update the existing pet.`
          );
        }

        // Create pet
        const petData = {
          companyId: context.company_id,
          customerId: contact._id,
          name: pet_name,
          species: normalizedSpecies,
          sex: sex ? sex.toLowerCase() : "unknown",
        };

        // Add optional fields
        if (breed) petData.breed = breed;
        if (size) petData.size = size.toUpperCase();
        if (coat_type) petData.coatType = coat_type.toLowerCase();
        if (age_years !== null && age_years !== undefined) {
          if (age_years < 0 || age_years > 30) {
            throw new Error("Age must be between 0 and 30 years");
          }
          petData.ageYears = age_years;
        }
        if (weight_kg !== null && weight_kg !== undefined) {
          if (weight_kg < 0 || weight_kg > 200) {
            throw new Error("Weight must be between 0 and 200 kg");
          }
          petData.weightKg = weight_kg;
        }
        if (temperament) petData.temperament = temperament.toLowerCase();
        if (allergies) petData.allergies = allergies;
        if (medical_notes) petData.medicalNotes = medical_notes;

        const pet = await Pet.create(petData);

        console.log(
          `✅ Pet ${pet.name} (${pet.species}) created for customer ${contact._id}`
        );

        return {
          success: true,
          pet_id: String(pet._id),
          pet_name: pet.name,
          pet_type: pet.species,
          message: `${pet.name} has been registered successfully! You can now book appointments for ${pet.name}.`,
        };
      } catch (err) {
        console.error("Add pet error:", err);

        // Provide detailed validation errors for LLM
        if (err.message.includes("Invalid")) {
          throw new Error(
            `Cannot add pet - ${err.message}. Please correct the information and try again.`
          );
        }

        throw new Error(err?.message || "Failed to add pet");
      }
    },

    get_service_list: async (params, context = {}) => {
      console.log("Getting service list:", params);
      try {
        const { pet_type = "all" } = params;

        if (!context?.company_id) {
          throw new Error("Missing company context");
        }

        // Build query
        const query = {
          companyId: context.company_id,
          active: true,
        };

        // Filter by pet type if specified
        if (pet_type && pet_type !== "all") {
          const validPetTypes = ["dog", "cat", "other"];
          const normalizedPetType = pet_type.toLowerCase();

          if (!validPetTypes.includes(normalizedPetType)) {
            throw new Error(
              `Invalid pet type. Must be one of: ${validPetTypes.join(
                ", "
              )}, all`
            );
          }

          // Match species or "dog&cat" for both
          query.$or = [{ species: normalizedPetType }, { species: "dog&cat" }];
        }

        // Get service categories with items
        const services = await ServiceCategory.find(query)
          .sort({ name: 1 })
          .lean();

        if (services.length === 0) {
          return {
            success: true,
            count: 0,
            services: [],
            message: "No services available at the moment.",
          };
        }

        // Get service items with their IDs
        const formattedServices = await Promise.all(
          services.map(async (service) => {
            console.log(
              `[get_service_list] Processing service: ${service.name} (${service._id})`
            );

            // Get items for this service
            const items = await ServiceItem.find({
              serviceCategoryId: service._id,
              companyId: context.company_id,
              active: true,
            })
              .sort({ price: 1 })
              .lean();

            console.log(
              `[get_service_list] Found ${items.length} items for service ${service.name}`
            );

            // Format service items with IDs
            const formattedItems = items.map((item) => {
              // Construct display name from size, label, and coatType
              let displayName = `Size ${item.size}`;
              if (item.label) {
                displayName = `${item.label} (${item.size})`;
              } else if (item.coatType && item.coatType !== "all") {
                displayName = `Size ${item.size} - ${item.coatType} coat`;
              }

              console.log(
                `[get_service_list]   Item: ${displayName} (ID: ${item._id})`
              );
              return {
                _id: String(item._id),
                name: displayName,
                size: item.size,
                coat_type: item.coatType,
                label: item.label || null,
                price: item.price,
                duration_minutes: item.durationMinutes,
              };
            });

            return {
              id: String(service._id),
              name: service.name,
              description: service.description || null,
              species: service.species,
              requires_bath: service.requiresBath || false,
              items: formattedItems,
            };
          })
        );

        console.log(
          `[get_service_list] ✓ Returning ${formattedServices.length} services with items`
        );

        return {
          success: true,
          count: formattedServices.length,
          services: formattedServices,
        };
      } catch (err) {
        console.error("Get service list error:", err);
        throw new Error(
          err?.message || "Failed to retrieve services. Please try again."
        );
      }
    },

    get_locations: async (_params, context = {}) => {
      console.log("Getting locations");
      try {
        if (!context?.company_id) {
          throw new Error("Missing company context");
        }

        const locations = await Location.find({
          companyId: context.company_id,
        })
          .sort({ isMain: -1, label: 1 }) // Main location first
          .lean();

        if (locations.length === 0) {
          return {
            success: true,
            count: 0,
            locations: [],
            message: "No locations available.",
          };
        }

        const weekdayNames = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];

        const formattedLocations = locations.map((loc) => {
          // Format working hours
          const workingHours = {};
          if (Array.isArray(loc.workHours)) {
            loc.workHours.forEach((wh) => {
              const dayName = weekdayNames[wh.weekday];
              if (!workingHours[dayName]) {
                workingHours[dayName] = [];
              }
              workingHours[dayName].push(`${wh.startTime} - ${wh.endTime}`);
            });
          }

          return {
            id: String(loc._id),
            name: loc.label,
            address: loc.address,
            phone: loc.phone || null,
            google_maps_url: loc.googleLocationUrl || null,
            timezone: loc.timezone || null,
            is_main_location: loc.isMain || false,
            working_hours: workingHours,
          };
        });

        return {
          success: true,
          count: formattedLocations.length,
          locations: formattedLocations,
        };
      } catch (err) {
        console.error("Get locations error:", err);
        throw new Error(
          err?.message || "Failed to retrieve locations. Please try again."
        );
      }
    },

    get_location_choices: async (params, context = {}) => {
      console.log("Getting location choices:", params);
      try {
        const { service_name } = params;

        // AUTHORIZATION CHECK: Verify chat can view locations
        await verifyAuthorization(context, 'view', 'location_list');

        if (!context?.company_id) {
          throw new Error("Missing company context");
        }

        if (!service_name) {
          throw new Error("service_name is required");
        }

        // Use getBookingContext to get location options for this service
        const bookingCtx = await getBookingContext({
          companyId: context.company_id,
          serviceName: service_name,
          workingHours: context.working_hours,
          timezone: context.timezone,
        });

        const { locationOptions, service } = bookingCtx;

        return {
          success: true,
          service_name: service.name,
          service_id: String(service._id),
          locations: locationOptions,
          message: locationOptions.length > 1
            ? `Found ${locationOptions.length} locations that offer ${service.name}. Please ask the customer to choose one.`
            : `Service ${service.name} is available at our location: ${locationOptions[0].name}`,
        };
      } catch (err) {
        console.error("Get location choices error:", err);
        throw new Error(
          err?.message || "Failed to retrieve location choices. Please try again."
        );
      }
    },

    get_staff_list: async (params, context = {}) => {
      console.log("Getting staff list:", params);
      try {
        const { 
          service_id = null, 
          service_name = null, 
          location_id = null,
          appointment_time = null,
          duration_minutes = null
        } = params;

        // AUTHORIZATION CHECK: Verify chat can view staff
        await verifyAuthorization(context, 'view', 'staff_list');

        if (!context?.company_id) {
          throw new Error("Missing company context");
        }

        let staff;
        let serviceCategoryId = service_id;

        // If service_name provided instead of service_id, resolve it
        if (service_name && !service_id) {
          const service = await ServiceCategory.findOne({
            companyId: context.company_id,
            active: true,
            name: { $regex: new RegExp(escapeRegex(service_name), "i") },
          }).lean();

          if (!service) {
            throw new Error(`Service "${service_name}" not found`);
          }

          serviceCategoryId = String(service._id);
        }

        // If both service and location specified, use getBookingContext for proper filtering
        if (serviceCategoryId && location_id) {
          const bookingCtx = await getBookingContext({
            companyId: context.company_id,
            serviceName: service_name || serviceCategoryId,
            preferredLocationId: location_id,
            workingHours: context.working_hours,
            timezone: context.timezone,
          });

          staff = bookingCtx.qualifiedStaff;
        } else if (serviceCategoryId) {
          // Service filter only (backward compatible)
          const service = await ServiceCategory.findOne({
            _id: serviceCategoryId,
            companyId: context.company_id,
            active: true,
          }).lean();

          if (!service) {
            throw new Error("Service not found");
          }

          const allowedRoles = Array.isArray(service.allowedRoles)
            ? service.allowedRoles
            : ["groomer"];

          // Get staff with correct roles
          const query = {
            companyId: context.company_id,
            isActive: true,
            role: { $in: allowedRoles },
          };

          const staffWithRoles = await User.find(query)
            .select("fullName role serviceCategoryIds locationIds primaryLocationId")
            .sort({ fullName: 1 })
            .lean();

          // Filter by service qualification
          staff = staffWithRoles.filter((member) => {
            // IMPORTANT: Staff with NO serviceCategoryIds configured can serve ALL services (no restrictions)
            if (
              !member.serviceCategoryIds ||
              member.serviceCategoryIds.length === 0
            ) {
              return true; // ✅ Staff with no restrictions = qualified for all services
            }
            // Staff with configured serviceCategoryIds must have this specific service in their list
            const serviceCategoryIdStrings = member.serviceCategoryIds.map(
              (id) => String(id)
            );
            return serviceCategoryIdStrings.includes(serviceCategoryId);
          });

          // Apply location filter if provided
          if (location_id) {
            const { filterStaffByLocation } = await import('./bookingContext.js');
            staff = filterStaffByLocation(staff, location_id);
          }
        } else {
          // No service filter, get all active staff
          const query = {
            companyId: context.company_id,
            isActive: true,
          };

          staff = await User.find(query)
            .select("fullName role locationIds primaryLocationId")
            .sort({ fullName: 1 })
            .lean();

          // Apply location filter if provided
          if (location_id) {
            const { filterStaffByLocation } = await import('./bookingContext.js');
            staff = filterStaffByLocation(staff, location_id);
          }
        }

        if (staff.length === 0) {
          return {
            success: true,
            staff: [],
            message: serviceCategoryId
              ? "No staff members qualified for this service at the specified location."
              : "No staff members available.",
          };
        }

        // AVAILABILITY FILTERING: If appointment_time provided, filter by availability
        let availableStaff = staff;
        
        if (appointment_time && duration_minutes) {
          const timezone = context.timezone || 'UTC';
          const parsed = parseAppointmentTime(appointment_time, timezone, duration_minutes);
          
          if (parsed) {
            const startDate = moment.tz(`${parsed.date}T${parsed.start}:00`, timezone).toDate();
            const endDate = moment.tz(`${parsed.date}T${parsed.end}:00`, timezone).toDate();
            
            console.log(`[get_staff_list] Checking availability for ${staff.length} staff at ${parsed.date} ${parsed.start}-${parsed.end}`);
            
            // Import BookingService for availability check
            const { BookingService } = await import('../../backend/src/services/bookingService.js');
            
            // Check availability for each staff member
            const availabilityChecks = await Promise.all(
              staff.map(async (member) => {
                const staffId = String(member._id);
                const availabilityResult = await BookingService.checkAvailability(
                  staffId,
                  startDate,
                  endDate,
                  context.company_id,
                  null, // excludeAppointmentId
                  location_id
                );
                
                return {
                  staff: member,
                  available: availabilityResult.available,
                  reason: availabilityResult.reason
                };
              })
            );
            
            // Filter to only available staff
            availableStaff = availabilityChecks
              .filter(check => check.available)
              .map(check => check.staff);
            
            const unavailableCount = staff.length - availableStaff.length;
            if (unavailableCount > 0) {
              console.log(`[get_staff_list] Filtered out ${unavailableCount} unavailable staff members`);
            }
          }
        }

        if (availableStaff.length === 0) {
          return {
            success: true,
            staff: [],
            message: appointment_time
              ? `No staff members are available at ${appointment_time}. Please try get_available_times to see when staff are free.`
              : "No staff members available.",
          };
        }

        return {
          success: true,
          staff: availableStaff.map((member) => ({
            id: String(member._id),
            name: member.fullName,
            role: member.role,
            locationIds: (member.locationIds || []).map(id => String(id)),
            primaryLocationId: member.primaryLocationId ? String(member.primaryLocationId) : null,
          })),
        };
      } catch (err) {
        console.error("Get staff list error:", err);
        throw new Error(
          err?.message || "Failed to retrieve staff. Please try again."
        );
      }
    },
  };
}

/**
 * Parse natural language time phrase to { date: YYYY-MM-DD, start: HH:mm, end: HH:mm }
 */
function parseAppointmentTime(text, timezone, durationMinutes = 60) {
  try {
    const now = moment.tz(timezone);
    let targetDate = now.clone();

    const lowerText = text.toLowerCase();

    // Georgian language mappings
    const georgianMappings = {
      დღეს: "today", // today
      ხვალ: "tomorrow", // tomorrow
      ზეგ: "day after tomorrow", // day after tomorrow
      მაზეგ: "day after tomorrow", // alternative form
    };

    // Replace Georgian phrases with English equivalents
    let normalizedText = lowerText;
    for (const [georgian, english] of Object.entries(georgianMappings)) {
      if (normalizedText.includes(georgian)) {
        normalizedText = normalizedText.replace(georgian, english);
      }
    }

    // Try to parse ISO datetime format first (e.g., "2025-10-16T14:30" or "2025-10-16 14:30")
    const isoDateTimeMatch = text.match(/(\d{4})-(\d{2})-(\d{2})[T\s](\d{1,2}):(\d{2})/); // "2025-10-16T14:30" or "2025-10-16 14:30"

    if (isoDateTimeMatch) {
      // Parse full ISO datetime format
      const [, year, month, day, hour, minute] = isoDateTimeMatch;
      const parsedDateTime = moment.tz(
        `${year}-${month}-${day} ${hour}:${minute}`,
        "YYYY-MM-DD HH:mm",
        timezone
      );
      if (parsedDateTime.isValid()) {
        const end = parsedDateTime.clone().add(durationMinutes, "minutes");

        // Validate that the appointment is in the future
        if (parsedDateTime.isSameOrBefore(now)) {
          console.log(
            `[parseAppointmentTime] ISO datetime ${parsedDateTime.format()} is in the past (now: ${now.format()})`
          );
          return null;
        }

        return {
          date: parsedDateTime.format("YYYY-MM-DD"),
          start: parsedDateTime.format("HH:mm"),
          end: end.format("HH:mm"),
        };
      }
    }

    // Try to parse explicit date formats (e.g., "October 16, 2025" or "2025-10-16")
    const explicitDateMatch = text.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/i); // "October 16, 2025"
    const isoDateMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/); // "2025-10-16"

    let datePartParsed = false;
    if (explicitDateMatch) {
      // Parse "Month Day, Year" format
      const [, monthStr, day, year] = explicitDateMatch;
      const parsedDate = moment.tz(
        `${monthStr} ${day}, ${year}`,
        "MMMM DD, YYYY",
        timezone
      );
      if (parsedDate.isValid()) {
        targetDate = parsedDate;
        datePartParsed = true;
      }
    } else if (isoDateMatch) {
      // Parse "YYYY-MM-DD" format
      const [, year, month, day] = isoDateMatch;
      const parsedDate = moment.tz(
        `${year}-${month}-${day}`,
        "YYYY-MM-DD",
        timezone
      );
      if (parsedDate.isValid()) {
        targetDate = parsedDate;
        datePartParsed = true;
      }
    } else if (normalizedText.includes("today")) {
      // Keep targetDate as today
    } else if (
      normalizedText.includes("day after tomorrow") ||
      normalizedText.includes("overmorrow")
    ) {
      targetDate.add(2, "days");
    } else if (normalizedText.includes("tomorrow")) {
      targetDate.add(1, "day");
    } else if (normalizedText.includes("next week")) {
      targetDate.add(1, "week");
    } else if (normalizedText.includes("next")) {
      // Handle "next [day]" - move to next occurrence
      const dayMatches = normalizedText.match(
        /next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/
      );
      if (dayMatches) {
        const dayNames = {
          monday: 1,
          tuesday: 2,
          wednesday: 3,
          thursday: 4,
          friday: 5,
          saturday: 6,
          sunday: 0,
        };
        const targetDay = dayNames[dayMatches[1]];
        const currentDay = targetDate.day();

        // Always go to next week's occurrence
        targetDate.day(targetDay);
        if (targetDate.day() <= currentDay) {
          targetDate.add(1, "week");
        }
      }
    } else if (normalizedText.includes("monday")) {
      targetDate.day(1); // Monday
      // If the date is in the past or earlier today, move to next week
      if (targetDate.isSameOrBefore(now, "day")) {
        targetDate.add(1, "week");
      }
    } else if (normalizedText.includes("tuesday")) {
      targetDate.day(2);
      if (targetDate.isSameOrBefore(now, "day")) {
        targetDate.add(1, "week");
      }
    } else if (normalizedText.includes("wednesday")) {
      targetDate.day(3);
      if (targetDate.isSameOrBefore(now, "day")) {
        targetDate.add(1, "week");
      }
    } else if (normalizedText.includes("thursday")) {
      targetDate.day(4);
      if (targetDate.isSameOrBefore(now, "day")) {
        targetDate.add(1, "week");
      }
    } else if (normalizedText.includes("friday")) {
      targetDate.day(5);
      if (targetDate.isSameOrBefore(now, "day")) {
        targetDate.add(1, "week");
      }
    } else if (normalizedText.includes("saturday")) {
      targetDate.day(6);
      if (targetDate.isSameOrBefore(now, "day")) {
        targetDate.add(1, "week");
      }
    } else if (normalizedText.includes("sunday")) {
      targetDate.day(0);
      if (targetDate.isSameOrBefore(now, "day")) {
        targetDate.add(1, "week");
      }
    }

    // Time parsing patterns
    let hour = null;
    let minute = 0;

    // Handle "noon", "midnight"
    if (normalizedText.includes("noon")) {
      hour = 12;
    } else if (normalizedText.includes("midnight")) {
      hour = 0;
    } else {
      // Standard time pattern: HH:mm or H:mm or H am/pm
      // If we already parsed an explicit date, look for time AFTER the year
      let timeMatch;
      if (datePartParsed) {
        // Match time after the date part (after 4-digit year or after parsed date)
        // Look for pattern like "2025 15:00" or "2025, 15:00"
        timeMatch = text.match(/\d{4}[,\s]+(\d{1,2}):(\d{2})(?:\s*(am|pm))?/i);
        if (!timeMatch) {
          // Also try matching just the last occurrence of time pattern
          const allMatches = [...text.matchAll(/(\d{1,2}):(\d{2})(?:\s*(am|pm))?/gi)];
          if (allMatches.length > 0) {
            timeMatch = allMatches[allMatches.length - 1]; // Take last match
          }
        }
      } else {
        // Normal time matching when no explicit date
        timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      }

      if (!timeMatch) return null;

      hour = Number(timeMatch[1]);
      minute = Number(timeMatch[2] || 0);
      const ampm = timeMatch[3]?.toLowerCase();

      if (ampm === "pm" && hour < 12) hour += 12;
      if (ampm === "am" && hour === 12) hour = 0;
    }

    if (hour === null || hour < 0 || hour > 23) return null;

    const start = targetDate.clone().hour(hour).minute(minute).second(0);
    const end = start.clone().add(durationMinutes, "minutes");

    // IMPORTANT: Validate that the appointment is in the future
    if (start.isSameOrBefore(now)) {
      console.log(
        `[parseAppointmentTime] Appointment time ${start.format()} is in the past or current moment (now: ${now.format()})`
      );
      return null;
    }

    return {
      date: targetDate.format("YYYY-MM-DD"),
      start: start.format("HH:mm"),
      end: end.format("HH:mm"),
    };
  } catch (err) {
    console.error("Time parse error:", err);
    return null;
  }
}
