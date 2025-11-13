import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { createToolHandlers } from "../../lib/tools/index.js";

/**
 * Convert our existing tool handlers to LangChain tools
 *
 * This wraps our existing tool implementation so we can use them
 * with LangGraph while maintaining backward compatibility.
 *
 * Tool handlers are now modularized for better maintainability:
 * - datetime.js: DateTime tools
 * - customer.js: Customer information tools
 * - Legacy toolHandlers.js: Appointment, pet, service tools (to be split)
 */

/**
 * Create LangChain tools for a specific platform
 * @param {string} platform - 'facebook', 'instagram', etc.
 * @param {object} context - Execution context (chat_id, company_id, timezone, etc.)
 */
export function createLangChainTools(platform, context) {
  const handlers = createToolHandlers(platform);

  // Get Current DateTime Tool
  const getCurrentDateTime = new DynamicStructuredTool({
    name: "get_current_datetime",
    description:
      "Return the current date/time in the company's timezone. Always use when you need 'now', 'today', or to format dates for the user.",
    schema: z.object({}),
    func: async () => {
      const result = await handlers.get_current_datetime({}, context);
      return JSON.stringify(result);
    },
  });

  // Get Customer Full Name Tool
  const getCustomerFullName = new DynamicStructuredTool({
    name: "get_customer_full_name",
    description: "Ask customer's name if do not know it",
    schema: z.object({
      full_name: z.string().describe("The name of the customer"),
    }),
    func: async ({ full_name }) => {
      const result = await handlers.get_customer_full_name(
        { full_name, chat_id: context.chat_id },
        context
      );
      return JSON.stringify(result);
    },
  });

  // Get Customer Info Tool
  const getCustomerInfo = new DynamicStructuredTool({
    name: "get_customer_info",
    description:
      "Get customer name and phone number if this information is not in the system",
    schema: z.object({
      full_name: z
        .string()
        .describe("The name of the customer"),
      phone_number: z
        .string()
        .describe(
          "The customer's phone number without the country code (e.g., 4567890)."
        ),
    }),
    func: async ({ full_name, phone_number }) => {
      const result = await handlers.get_customer_info(
        { full_name, phone_number, chat_id: context.chat_id },
        context
      );
      return JSON.stringify(result);
    },
  });

  // Get Customer Phone Number Tool
  const getCustomerPhoneNumber = new DynamicStructuredTool({
    name: "get_customer_phone_number",
    description: "Ask for the customer's phone number for registration",
    schema: z.object({
      phone_number: z
        .string()
        .describe(
          "The customer's phone number without the country code (e.g., 4567890)."
        ),
    }),
    func: async ({ phone_number }) => {
      const result = await handlers.get_customer_phone_number(
        { phone_number, chat_id: context.chat_id },
        context
      );
      return JSON.stringify(result);
    },
  });

  // Book Appointment Tool
  const bookAppointment = new DynamicStructuredTool({
    name: "book_appointment",
    description:
      "Book an appointment for the customer. Call this when customer confirms a specific time after you've shown them available slots. INTELLIGENT STAFF SELECTION: The system automatically checks which qualified staff are AVAILABLE at the requested time: (1) If only ONE staff is free → auto-assigns silently, (2) If MULTIPLE staff are free → returns needs_selection with available_staff list - you MUST then ask customer to choose and call book_appointment again with staff_id, (3) If NO staff are free → returns error with instruction to call get_available_times. Returns confirmation details with exact date and time, or needs_selection if staff choice is required.",
    schema: z
      .object({
        appointment_time: z
          .string()
          .describe(
            "Appointment time in ENGLISH format: 'today', 'tomorrow', 'day after tomorrow', 'next [weekday]', weekday names, or 'YYYY-MM-DD'. Include the time (e.g., 'tomorrow at 14:00', 'next Monday at 3pm'). ALWAYS translate non-English phrases to English."
          ),
        service_name: z
          .string()
          .describe(
            "Service name (e.g., 'Full Groom', 'Bath & Brush', 'Nail Trim'). Case-insensitive fuzzy matching supported."
          ),
        location_id: z
          .string()
          .optional()
          .describe(
            "Location ID from get_location_choices. REQUIRED if there are multiple locations. You must ask the customer which location they prefer BEFORE calling this tool. Pass the exact 'id' field from location options."
          ),
        staff_id: z
          .string()
          .optional()
          .describe(
            "Staff ID to assign. ONLY provide this if: (1) you previously got needs_selection=true with available_staff list from this tool, and customer has now chosen a staff member, OR (2) customer explicitly requested a specific staff member by name. Otherwise, omit this - the system will intelligently auto-assign if only one staff is available. Pass the exact 'id' field from available_staff list."
          ),
        pet_size: z
          .enum(["S", "M", "L", "XL"])
          .optional()
          .describe(
            "Optional pet size: 'S' (small), 'M' (medium), 'L' (large), or 'XL' (extra large). Omit if unknown - system will use cheapest service item."
          ),
        pet_name: z
          .string()
          .optional()
          .describe(
            "Optional pet name. Omit to auto-select customer's registered pet."
          ),
        pet_type: z
          .enum(["dog", "cat", "other"])
          .optional()
          .describe("Optional pet type. Omit to infer from registered pets."),
        notes: z
          .string()
          .optional()
          .describe(
            "Optional special instructions (e.g., 'First time grooming', 'Dog is anxious'). Omit if none."
          ),
      })
      .refine(
        (data) => {
          // Comprehensive appointment time validation
          const timeStr = data.appointment_time.trim();
          const lowerTime = timeStr.toLowerCase();

          // Check for obviously invalid formats
          if (timeStr.length < 3) {
            return false; // Too short to be meaningful
          }

          // Validate relative date keywords
          const validRelativeDates = [
            'today', 'tomorrow', 'day after tomorrow',
            'next monday', 'next tuesday', 'next wednesday', 'next thursday',
            'next friday', 'next saturday', 'next sunday'
          ];

          const hasValidDatePart = validRelativeDates.some(date =>
            lowerTime.includes(date)
          ) || /^\d{4}-\d{2}-\d{2}/.test(timeStr); // YYYY-MM-DD format

          if (!hasValidDatePart) {
            return false; // No recognizable date component
          }

          // Check for time component (should have some time indication)
          const hasTimeComponent = /\d{1,2}:?\d{0,2}\s*(am|pm|hr|hour)?|at\s+\d|\d\s*(am|pm)/i.test(timeStr);
          if (!hasTimeComponent) {
            return false; // Missing time specification
          }

          // Basic past time validation for "today" appointments
          const now = new Date();
          const currentHour = now.getHours();

          if (lowerTime.includes("today")) {
            const timeMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
            if (timeMatch) {
              let appointmentHour = parseInt(timeMatch[1]);
              const minutes = parseInt(timeMatch[2] || 0);
              const isPm = timeMatch[3]?.toLowerCase() === "pm";

              if (isPm && appointmentHour !== 12) appointmentHour += 12;
              if (!isPm && appointmentHour === 12) appointmentHour = 0;

              // Convert to minutes since midnight for comparison
              const appointmentMinutes = appointmentHour * 60 + minutes;
              const currentMinutes = currentHour * 60 + now.getMinutes();

              if (appointmentMinutes <= currentMinutes + 30) { // 30 min buffer
                return false; // Too close to current time or in the past
              }
            }
          }

          return true;
        },
        {
          message:
            "Invalid appointment time format. Use formats like: 'tomorrow at 2pm', 'next Monday at 10:30', '2024-12-25 at 14:00'. Time must include date and time, and cannot be in the past.",
        }
      ),
    func: async (params) => {
      const result = await handlers.book_appointment(params, context);
      return JSON.stringify(result);
    },
  });

  // Get Available Times Tool
  const getAvailableTimes = new DynamicStructuredTool({
    name: "get_available_times",
    description:
      "Get actual available time slots for a service on a specific date. Returns time ranges when qualified staff are free (e.g., '9:00-12:00', '15:00-17:00'). Call this when customer asks about availability or wants to book.",
    schema: z.object({
      appointment_date: z
        .string()
        .describe(
          "Date: 'today', 'tomorrow', or 'YYYY-MM-DD' in company timezone."
        ),
      service_name: z
        .string()
        .describe(
          "Service name (e.g., 'Full Groom', 'Nail Trim'). Case-insensitive fuzzy matching supported."
        ),
      pet_size: z
        .string()
        .optional()
        .describe(
          "Optional pet size: 'S', 'M', 'L', or 'XL'. Omit if unknown - will use maximum duration to be safe."
        ),
    }),
    func: async (params) => {
      const result = await handlers.get_available_times(params, context);
      return JSON.stringify(result);
    },
  });

  // Get Customer Appointments Tool
  const getCustomerAppointments = new DynamicStructuredTool({
    name: "get_customer_appointments",
    description:
      "Get customer's appointments. Use when customer asks about their bookings. Returns appointment details including IDs needed for cancel/reschedule.",
    schema: z.object({
      status: z
        .enum(["upcoming", "past", "all"])
        .describe(
          "Filter: 'upcoming' (future), 'past' (history), or 'all' (default: upcoming)"
        ),
      limit: z
        .number()
        .optional()
        .describe("Max number to return (default: 5)"),
    }),
    func: async (params) => {
      const result = await handlers.get_customer_appointments(params, context);
      return JSON.stringify(result);
    },
  });

  // Cancel Appointment Tool
  const cancelAppointment = new DynamicStructuredTool({
    name: "cancel_appointment",
    description:
      "Cancel an appointment. First get appointment ID using 'get_customer_appointments'. After canceling, confirm the canceled date and time to customer.",
    schema: z.object({
      appointment_id: z
        .string()
        .describe("Appointment ID to cancel (from get_customer_appointments)."),
      cancellation_reason: z
        .string()
        .optional()
        .describe(
          "Optional cancellation reason. Use 'customer_requested' by default, or provide a brief description if customer gives a specific reason."
        ),
    }),
    func: async (params) => {
      const result = await handlers.cancel_appointment(params, context);
      return JSON.stringify(result);
    },
  });

  // Reschedule Appointment Tool
  const rescheduleAppointment = new DynamicStructuredTool({
    name: "reschedule_appointment",
    description:
      "Reschedule an existing appointment to a new date/time. IMPORTANT: Use this tool instead of booking a new appointment when customer wants to change an existing appointment time. Get appointment ID from: (1) the 'appointment_id' field returned by book_appointment in the current conversation, OR (2) call 'get_customer_appointments' to find it. After rescheduling, confirm both the old and new date/time to customer.",
    schema: z.object({
      appointment_id: z
        .string()
        .describe(
          "Appointment ID to reschedule (from get_customer_appointments)."
        ),
      new_appointment_text_time: z
        .string()
        .describe(
          "New time in ENGLISH: 'today', 'tomorrow', 'next [weekday]', or 'YYYY-MM-DD'. Include time (e.g., 'tomorrow at 14:00'). Translate non-English to English."
        ),
      duration: z
        .number()
        .optional()
        .describe("Duration in minutes. Omit to keep original duration."),
    }),
    func: async (params) => {
      const result = await handlers.reschedule_appointment(params, context);
      return JSON.stringify(result);
    },
  });

  // Get Customer Pets Tool
  const getCustomerPets = new DynamicStructuredTool({
    name: "get_customer_pets",
    description:
      "Get customer's registered pets. Returns pet details including name, species, breed, size, and medical information.",
    schema: z.object({}),
    func: async () => {
      const result = await handlers.get_customer_pets({}, context);
      return JSON.stringify(result);
    },
  });

  // Add Pet Tool
  const addPet = new DynamicStructuredTool({
    name: "add_pet",
    description:
      "Register a new pet for the customer. Use when customer wants to add a pet. After adding, confirm the pet is registered and ready for appointments.",
    schema: z.object({
      pet_name: z
        .string()
        .describe("Pet's name (required)"),
      pet_type: z
        .enum(["dog", "cat", "other"])
        .describe("Pet type/species (required)"),
      breed: z
        .string()
        .optional()
        .describe("Pet's breed (optional). Omit if unknown."),
      size: z
        .enum(["S", "M", "L", "XL"])
        .optional()
        .describe(
          "Pet size: S (small), M (medium), L (large), XL (extra large). Omit if unknown."
        ),
      coat_type: z
        .enum([
          "short",
          "medium",
          "long",
          "curly",
          "double",
          "wire",
          "hairless",
          "unknown",
        ])
        .optional()
        .describe("Coat/fur type. Omit if unknown."),
      age_years: z
        .number()
        .optional()
        .describe("Age in years. Omit if unknown."),
      weight_kg: z
        .number()
        .optional()
        .describe("Weight in kilograms. Omit if unknown."),
      sex: z
        .enum(["male", "female", "unknown"])
        .optional()
        .describe("Pet's sex. Omit if unknown."),
      temperament: z
        .enum(["calm", "normal", "anxious", "aggressive"])
        .optional()
        .describe("Temperament/behavior (default: normal). Omit if unknown."),
      allergies: z
        .string()
        .optional()
        .describe("Any allergies. Omit if none."),
      medical_notes: z
        .string()
        .optional()
        .describe(
          "Medical information, health conditions, or special needs. Omit if none."
        ),
    }),
    func: async (params) => {
      const result = await handlers.add_pet(params, context);
      return JSON.stringify(result);
    },
  });

  // Get Service List Tool
  const getServiceList = new DynamicStructuredTool({
    name: "get_service_list",
    description:
      "Get list of all available services with descriptions, prices, and service items. Use this ONLY when customer asks 'what services do you offer?', 'how much does X cost?', or needs pricing details. For BOOKING appointments, you can use service names directly without calling this tool first - the system handles fuzzy matching automatically.",
    schema: z.object({
      pet_type: z
        .enum(["dog", "cat", "other", "all"])
        .default("all")
        .describe(
          "Filter services by pet type. Use 'all' to show services for all pet types. Default: 'all'"
        ),
    }),
    func: async (params) => {
      const result = await handlers.get_service_list(params, context);
      return JSON.stringify(result);
    },
  });

  // Get Locations Tool
  const getLocations = new DynamicStructuredTool({
    name: "get_locations",
    description:
      "Get company locations with addresses, phone numbers, and working hours. Returns complete location info including Google Maps links if available.",
    schema: z.object({}),
    func: async () => {
      const result = await handlers.get_locations({}, context);
      return JSON.stringify(result);
    },
  });

  // Get Location Choices Tool (for booking selection)
  const getLocationChoices = new DynamicStructuredTool({
    name: "get_location_choices",
    description:
      "Get available location choices for booking an appointment. Use this BEFORE calling book_appointment when there are multiple locations. Returns location options with IDs that can be passed to book_appointment.",
    schema: z.object({
      service_name: z
        .string()
        .describe(
          "Service name to check location availability for (e.g., 'Full Groom'). Case-insensitive fuzzy matching supported."
        ),
    }),
    func: async (params) => {
      const result = await handlers.get_location_choices(params, context);
      return JSON.stringify(result);
    },
  });

  // Get Staff List Tool
  const getStaffList = new DynamicStructuredTool({
    name: "get_staff_list",
    description:
      "Get available staff members. Can filter by service, location, AND availability at a specific time. Use this BEFORE calling book_appointment when there are multiple staff options. IMPORTANT: Always pass appointment_time and duration_minutes to get only AVAILABLE staff - never present unavailable staff to customers. Returns staff with IDs, names, roles, and assigned locations.",
    schema: z.object({
      service_name: z
        .string()
        .optional()
        .describe(
          "Optional service name to filter by qualification (e.g., 'Full Groom'). Case-insensitive fuzzy matching supported."
        ),
      location_id: z
        .string()
        .optional()
        .describe(
          "Optional location ID to filter staff assigned to that location. Use the 'id' field from get_location_choices."
        ),
      appointment_time: z
        .string()
        .optional()
        .describe(
          "RECOMMENDED: Appointment time to check staff availability (e.g., 'tomorrow at 2pm'). When provided with duration_minutes, returns only staff who are available at this time. Prevents showing unavailable options to customers."
        ),
      duration_minutes: z
        .number()
        .optional()
        .describe(
          "Service duration in minutes. Required if appointment_time is provided. Used to check if staff are available for the full duration."
        ),
    }),
    func: async (params) => {
      const result = await handlers.get_staff_list(params, context);
      return JSON.stringify(result);
    },
  });

  return [
    getCurrentDateTime,
    getCustomerFullName,
    getCustomerInfo,
    getCustomerPhoneNumber,
    bookAppointment,
    getAvailableTimes,
    getCustomerAppointments,
    cancelAppointment,
    rescheduleAppointment,
    getCustomerPets,
    addPet,
    getServiceList,
    getLocations,
    getLocationChoices,
    getStaffList,
  ];
}
