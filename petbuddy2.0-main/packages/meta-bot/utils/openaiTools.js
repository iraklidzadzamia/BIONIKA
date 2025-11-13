export const tools = [
  {
    type: "function",
    function: {
      name: "get_current_datetime",
      description:
        "Return the current date/time in the company's timezone. Always use when you need 'now', 'today', or to format dates for the user.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "get_customer_full_name",
      description: "Ask customer's name if do not know it",
      parameters: {
        type: "object",
        properties: {
          full_name: {
            type: "string",
            description: "The name of the customer",
          },
        },
        additionalProperties: false,
        required: ["full_name"],
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "get_customer_info",
      description:
        "Get customer name and phone number if this information is not in the system",
      parameters: {
        type: "object",
        properties: {
          full_name: {
            type: "string",
            description: "The name of the customer",
          },
          phone_number: {
            type: "string",
            description:
              "The customer's phone number without the country code (e.g., 4567890).",
          },
        },
        additionalProperties: false,
        required: ["full_name", "phone_number"],
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "get_customer_phone_number",
      description: "Ask for the customer's phone number for registration",
      parameters: {
        type: "object",
        properties: {
          phone_number: {
            type: "string",
            description:
              "The customer's phone number without the country code (e.g., 4567890).",
          },
        },
        additionalProperties: false,
        required: ["phone_number"],
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "book_appointment",
      description:
        "Book an appointment for the customer. Call this when customer confirms a specific time after you've shown them available slots. CRITICAL: If there are multiple locations or staff members, you MUST collect the customer's preference first using get_location_choices and get_staff_list tools. NEVER auto-assign silently. Returns confirmation details with exact date and time, or needs_selection if location/staff choice is required.",
      parameters: {
        type: "object",
        properties: {
          appointment_time: {
            type: "string",
            description:
              "Appointment time in ENGLISH format: 'today', 'tomorrow', 'day after tomorrow', 'next [weekday]', weekday names, or 'YYYY-MM-DD'. Include the time (e.g., 'tomorrow at 14:00', 'next Monday at 3pm'). ALWAYS translate non-English phrases to English.",
          },
          service_name: {
            type: "string",
            description:
              "Service name (e.g., 'Full Groom', 'Bath & Brush', 'Nail Trim'). Case-insensitive fuzzy matching supported.",
          },
          location_id: {
            type: "string",
            description:
              "Location ID from get_location_choices. REQUIRED if there are multiple locations. You must ask the customer which location they prefer BEFORE calling this tool. Pass the exact 'id' field from location options.",
          },
          staff_id: {
            type: "string",
            description:
              "Staff ID from get_staff_list. REQUIRED if there are multiple qualified staff members. You must ask the customer for their staff preference BEFORE calling this tool. Pass the exact 'id' field from staff options. If customer says 'any', use the first staff ID from the list.",
          },
          pet_size: {
            type: "string",
            description:
              "Optional pet size: 'S', 'M', 'L', or 'XL'. Omit if unknown - system will use cheapest service item.",
          },
          pet_name: {
            type: "string",
            description: "Optional pet name. Omit to auto-select customer's registered pet.",
          },
          pet_type: {
            type: "string",
            enum: ["dog", "cat", "other"],
            description: "Optional pet type. Omit to infer from registered pets.",
          },
          notes: {
            type: "string",
            description:
              "Optional special instructions (e.g., 'First time grooming', 'Dog is anxious'). Omit if none.",
          },
        },
        required: [
          "appointment_time",
          "service_name",
        ],
        additionalProperties: false,
      },
      strict: false,
    },
  },
  {
    type: "function",
    function: {
      name: "get_available_times",
      description:
        "Get actual available time slots for a service on a specific date. Returns time ranges when qualified staff are free (e.g., '9:00-12:00', '15:00-17:00'). Call this when customer asks about availability or wants to book.",
      parameters: {
        type: "object",
        properties: {
          appointment_date: {
            type: "string",
            description:
              "Date: 'today', 'tomorrow', or 'YYYY-MM-DD' in company timezone.",
          },
          service_name: {
            type: "string",
            description:
              "Service name (e.g., 'Full Groom', 'Nail Trim'). Case-insensitive fuzzy matching supported.",
          },
          pet_size: {
            type: "string",
            description:
              "Optional pet size: 'S', 'M', 'L', or 'XL'. Omit if unknown - will use maximum duration to be safe.",
          },
          staff_id: {
            type: "string",
            description: "Optional specific staff ID. Omit for any qualified staff.",
          },
          location_id: {
            type: "string",
            description: "Optional specific location ID. Omit for main location.",
          },
        },
        required: [
          "appointment_date",
          "service_name",
        ],
        additionalProperties: false,
      },
      strict: false,
    },
  },
  {
    type: "function",
    function: {
      name: "get_customer_appointments",
      description:
        "Get customer's appointments. Use when customer asks about their bookings. Returns appointment details including IDs needed for cancel/reschedule.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["upcoming", "past", "all"],
            description:
              "Filter: 'upcoming' (future), 'past' (history), or 'all' (default: upcoming)",
          },
          limit: {
            type: "integer",
            description: "Max number to return (default: 5)",
          },
        },
        required: ["status", "limit"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_appointment",
      description:
        "Cancel an appointment. First get appointment ID using 'get_customer_appointments'. After canceling, confirm the canceled date and time to customer.",
      parameters: {
        type: "object",
        properties: {
          appointment_id: {
            type: "string",
            description:
              "Appointment ID to cancel (from get_customer_appointments).",
          },
          cancellation_reason: {
            type: "string",
            description:
              "Optional cancellation reason (e.g., 'customer changed plans', 'emergency'). Omit if not provided.",
          },
        },
        required: ["appointment_id"],
        additionalProperties: false,
      },
      strict: false,
    },
  },
  {
    type: "function",
    function: {
      name: "reschedule_appointment",
      description:
        "Reschedule an existing appointment to a new date/time. IMPORTANT: Use this tool instead of booking a new appointment when customer wants to change an existing appointment time. Get appointment ID from: (1) the 'appointment_id' field returned by book_appointment in the current conversation, OR (2) call 'get_customer_appointments' to find it. After rescheduling, confirm both the old and new date/time to customer.",
      parameters: {
        type: "object",
        properties: {
          appointment_id: {
            type: "string",
            description:
              "Appointment ID to reschedule (from get_customer_appointments).",
          },
          new_appointment_text_time: {
            type: "string",
            description:
              "New time in ENGLISH: 'today', 'tomorrow', 'next [weekday]', or 'YYYY-MM-DD'. Include time (e.g., 'tomorrow at 14:00'). Translate non-English to English.",
          },
          duration: {
            type: "integer",
            description:
              "Duration in minutes. Omit to keep original duration.",
          },
        },
        required: ["appointment_id", "new_appointment_text_time"],
        additionalProperties: false,
      },
      strict: false,
    },
  },
  {
    type: "function",
    function: {
      name: "get_customer_pets",
      description:
        "Get customer's registered pets. Returns pet details including name, species, breed, size, and medical information.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "add_pet",
      description:
        "Register a new pet for the customer. Use when customer wants to add a pet. After adding, confirm the pet is registered and ready for appointments.",
      parameters: {
        type: "object",
        properties: {
          pet_name: {
            type: "string",
            description: "Pet's name (required, max 50 characters)",
          },
          pet_type: {
            type: "string",
            enum: ["dog", "cat", "other"],
            description: "Pet type/species (required)",
          },
          breed: {
            type: "string",
            description: "Pet's breed (optional, max 100 characters). Omit if unknown.",
          },
          size: {
            type: "string",
            enum: ["S", "M", "L", "XL"],
            description:
              "Pet size: S (small), M (medium), L (large), XL (extra large). Omit if unknown.",
          },
          coat_type: {
            type: "string",
            enum: [
              "short",
              "medium",
              "long",
              "curly",
              "double",
              "wire",
              "hairless",
              "unknown",
            ],
            description: "Coat/fur type. Omit if unknown.",
          },
          age_years: {
            type: "integer",
            description: "Age in years (0-30). Omit if unknown.",
          },
          weight_kg: {
            type: "number",
            description: "Weight in kilograms (0-200). Omit if unknown.",
          },
          sex: {
            type: "string",
            enum: ["male", "female", "unknown"],
            description: "Pet's sex. Omit if unknown.",
          },
          temperament: {
            type: "string",
            enum: ["calm", "normal", "anxious", "aggressive"],
            description:
              "Temperament/behavior (default: normal). Omit if unknown.",
          },
          allergies: {
            type: "string",
            description:
              "Any allergies (max 300 characters). Omit if none.",
          },
          medical_notes: {
            type: "string",
            description:
              "Medical information, health conditions, or special needs (max 1000 characters). Omit if none.",
          },
        },
        required: ["pet_name", "pet_type"],
        additionalProperties: false,
      },
      strict: false,
    },
  },
  {
    type: "function",
    function: {
      name: "get_service_list",
      description:
        "Get list of all available services with descriptions, prices, and service items. Use this ONLY when customer asks 'what services do you offer?', 'how much does X cost?', or needs pricing details. For BOOKING appointments, you can use service names directly without calling this tool first - the system handles fuzzy matching automatically.",
      parameters: {
        type: "object",
        properties: {
          pet_type: {
            type: "string",
            enum: ["dog", "cat", "other", "all"],
            description:
              "Filter services by pet type. Use 'all' to show services for all pet types. Default: 'all'",
          },
        },
        required: ["pet_type"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "get_locations",
      description:
        "Get company locations with addresses, phone numbers, and working hours. Returns complete location info including Google Maps links if available.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "get_staff_list",
      description:
        "Get available staff members. Can filter by service to show only qualified staff. Returns staff names and roles.",
      parameters: {
        type: "object",
        properties: {
          service_id: {
            type: "string",
            description:
              "Optional service ID to filter staff. Omit to see all staff.",
          },
        },
        required: [],
        additionalProperties: false,
      },
      strict: false,
    },
  },
];
