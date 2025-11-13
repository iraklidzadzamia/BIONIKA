import CompanyIntegration from "../models/CompanyIntegration.js";
import moment from "moment-timezone";
import { Company, Location, ServiceCategory, ServiceItem } from '@petbuddy/shared';
import { config } from "../config/env.js";

async function toPlainCompanyProfile({ company, integration }) {
  const bot = company?.bot || {};
  const activeHours = bot?.activeHours || {};
  // Fetch locations from the proper collection (sorted with main first)
  let locations = [];
  try {
    locations = await Location.find({ companyId: company?._id })
      .sort({ isMain: -1, label: 1 })
      .select({ address: 1, isMain: 1 })
      .lean();
  } catch (_) {
    locations = [];
  }

  return {
    _id: company?._id,
    name: company?.name,

    // Access tokens / chat ids - use Page access token for messaging
    fb_page_access_token:
      integration?.facebookAccessToken || config.facebook.pageAccessToken,
    // Instagram uses the same Page access token
    insta_page_access_token:
      integration?.facebookAccessToken || config.instagram.pageAccessToken,
    fb_chat_id: integration?.facebookChatId,
    insta_chat_id: integration?.instagramChatId,

    // Bot flags and intervals
    bot_active: Boolean(bot?.active),
    bot_active_interval: {
      start_time: activeHours?.startTime,
      end_time: activeHours?.endTime,
      interval_active: Boolean(
        bot?.active &&
          activeHours?.intervalActive &&
          activeHours?.startTime &&
          activeHours?.endTime
      ),
      timezone: activeHours?.timezone || company?.timezone || "UTC",
    },

    // LLM
    system_instructions: await getCollectedSystemInstructions(company),
    openai_api_key: integration?.openaiApiKey || config.openai.apiKey,
    gemini_api_key: integration?.geminiApiKey || config.gemini.apiKey,
    ai_provider: integration?.aiProvider || (config.features.useGemini ? "gemini" : "openai"),

    // Escalation/Human Handoff Configuration
    escalation_config: {
      facebookAdminChatId: integration?.facebookAdminChatId || null,
      facebookAdminToken: integration?.facebookAdminToken || null,
      instagramAdminChatId: integration?.instagramAdminChatId || null,
      instagramAdminToken: integration?.instagramAdminToken || null,
    },

    // Scheduling
    working_hours: company?.settings?.workHours || [],
    locations,

    // Additional company info
    timezone: company?.timezone || "UTC",
    main_currency: company?.mainCurrency || "USD",
  };
}

export async function getCompanyByFb(fbChatId) {
  // First find the integration by Facebook chat ID
  const integration = await CompanyIntegration.findOne({
    facebookChatId: fbChatId,
  }).lean();

  if (!integration) return null;

  // Then get the company data
  const company = await Company.findById(integration.companyId).lean();
  if (!company) return null;

  return toPlainCompanyProfile({ company, integration });
}

export async function getCompanyByInstagram(instaChatId) {
  // First find the integration by Instagram chat ID
  const integration = await CompanyIntegration.findOne({
    instagramChatId: instaChatId,
  }).lean();

  if (!integration) return null;

  // Then get the company data
  const company = await Company.findById(integration.companyId).lean();
  if (!company) return null;

  return toPlainCompanyProfile({ company, integration });
}

export async function getCollectedSystemInstructions(company) {
  try {
    // Ensure we have full company doc (with bot/settings) when only a plain profile is passed
    let sourceCompany = company;
    if (
      (!sourceCompany?.bot || !sourceCompany?.settings) &&
      sourceCompany?._id
    ) {
      try {
        const fresh = await Company.findById(sourceCompany._id).lean();
        if (fresh) sourceCompany = fresh;
      } catch (_) {}
    }

    const bot = sourceCompany?.bot || {};
    const {
      role,
      systemInstruction,
      givenInformationRules,
      informationCollectionRules,
      customerSupportRules,
      conversationExamples = [],
      services = [],
    } = bot;

    const name = sourceCompany?.name || "";
    const phone = sourceCompany?.phone || "";
    const website = sourceCompany?.website || "";
    const timezone = sourceCompany?.timezone || "UTC";
    const mainCurrency = sourceCompany?.mainCurrency || "USD";
    const workHours = Array.isArray(sourceCompany?.settings?.workHours)
      ? sourceCompany.settings.workHours
      : [];
    let locations = [];
    if (sourceCompany?._id) {
      try {
        locations = await Location.find({ companyId: sourceCompany._id })
          .sort({ isMain: -1, label: 1 })
          .lean();
      } catch (_) {
        locations = [];
      }
    }

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const workingHoursText = workHours
      .slice()
      .sort((a, b) => (a.weekday ?? 0) - (b.weekday ?? 0))
      .map((wh) => `${dayNames[wh.weekday ?? 0]} ${wh.startTime}-${wh.endTime}`)
      .join("; ");

    const locationsText = locations.length
      ? locations
          .map((loc) => `${loc.address}${loc.isMain ? " (main)" : ""}`)
          .join("; ")
      : "";

    // Get current date/time using moment-timezone (company timezone)
    const now = moment.tz(timezone);
    const nowText = now.format("YYYY-MM-DD HH:mm:ss");
    const dayOfWeek = now.format("dddd");
    const isoLocal = now.format("YYYY-MM-DD[T]HH:mm:ss");
    const ymd = now.format("YYYY-MM-DD");
    const spelledDateUS = now.format("MMMM DD, YYYY");

    const examplesText =
      Array.isArray(conversationExamples) && conversationExamples.length
        ? conversationExamples
            .map(
              (ex, idx) =>
                `Example ${idx + 1}:\nUser: ${ex?.user || ""}\nAssistant: ${
                  ex?.assistant || ""
                }`
            )
            .join("\n\n")
        : "";

    // Load detailed services & prices from DB if company has an _id
    let detailedServicesText = "";
    try {
      if (sourceCompany?._id) {
        const categories = await ServiceCategory.find({
          companyId: sourceCompany._id,
          active: true,
        })
          .select("name description")
          .lean();

        if (Array.isArray(categories) && categories.length) {
          const categoryIds = categories.map((c) => c._id);
          const items = await ServiceItem.find({
            companyId: sourceCompany._id,
            serviceCategoryId: { $in: categoryIds },
            active: true,
          })
            .select(
              "serviceCategoryId size coatType label price bufferBeforeMinutes bufferAfterMinutes"
            )
            .sort({ serviceCategoryId: 1, price: 1 })
            .lean();

          const byCategory = new Map();
          for (const cat of categories) {
            byCategory.set(String(cat._id), {
              name: cat.name,
              description: cat.description,
              items: [],
            });
          }
          for (const it of items) {
            const key = String(it.serviceCategoryId);
            if (byCategory.has(key)) {
              byCategory.get(key).items.push(it);
            }
          }

          const lines = [];
          for (const [, value] of byCategory) {
            if (!value.items.length) continue;
            lines.push(
              `- ${value.name}${
                value.description ? ": " + value.description : ""
              }`
            );
            for (const it of value.items) {
              const labelPart = it.label ? ` ${it.label}` : "";
              const sizePart = it.size ? ` [${it.size}]` : "";
              const coatPart =
                it.coatType && it.coatType !== "all" ? ` (${it.coatType})` : "";
              lines.push(
                `  •${labelPart}${sizePart}${coatPart}: ${it.price} ${mainCurrency}`
              );
            }
          }

          if (lines.length) {
            detailedServicesText = `Services & Prices:\n${lines.join("\n")}`;
          }
        }
      }
    } catch (svcErr) {
      // Non-fatal: keep going without detailed services
      detailedServicesText = "";
    }

    const servicesText = detailedServicesText
      ? detailedServicesText
      : Array.isArray(services) && services.length
      ? `Services: ${services.join(", ")}`
      : "";

    const companyInfoText =
      `Company Info:\n` +
      `- Name: ${name}\n` +
      (phone ? `- Phone: ${phone}\n` : "") +
      (website ? `- Website: ${website}\n` : "") +
      (locationsText ? `- Locations: ${locationsText}\n` : "") +
      `- Timezone: ${timezone}\n` +
      `- Currency: ${mainCurrency}\n` +
      (workingHoursText ? `- Working hours: ${workingHoursText}\n` : "");

    const rulesText =
      (givenInformationRules
        ? `Given Information Rules:\n${givenInformationRules}\n\n`
        : "") +
      (informationCollectionRules
        ? `Information Collection Rules:\n${informationCollectionRules}\n\n`
        : "") +
      (customerSupportRules
        ? `Customer Support Rules:\n${customerSupportRules}\n\n`
        : "");

    const addressPolicyText =
      "Address Policy:\n" +
      "- Use only addresses from the company's saved locations.\n" +
      "- Do not use the legacy company.address field.\n" +
      "- If no locations are configured, do not provide an address; say it's unavailable and ask the user which location they prefer.";

    // Build phone number collection rules based on whether contact already has a phone
    let phoneNumberRules;
    if (sourceCompany?._id) {
      // Check if we're being called with a phone number already available
      // This is passed via context in the actual execution, but we set the general rule here
      phoneNumberRules =
        "2. PHONE NUMBER REQUIREMENT:\n" +
        "   - Check the 'Customer Information Already Known' section at the end of this prompt\n" +
        "   - If phone number is ALREADY SAVED (marked as such), DO NOT ask for it again - use the saved number for booking\n" +
        "   - If phone number is NOT saved, you MUST collect it BEFORE attempting to book - this is mandatory\n" +
        "   - Customer name is optional - we already have their Instagram/Facebook username\n" +
        "   - If you have the phone number (either saved or newly collected), you can book immediately\n";
    } else {
      // Fallback when company context not available
      phoneNumberRules =
        "2. PHONE NUMBER REQUIREMENT:\n" +
        "   - ALWAYS collect customer's phone number BEFORE attempting to book - this is mandatory\n" +
        "   - Customer name is optional - we already have their Instagram/Facebook username\n" +
        "   - If you have the phone number, you can book immediately - DON'T ask for the name again\n";
    }

    const appointmentBookingRules =
      "CRITICAL - Appointment Booking Rules:\n" +
      "1. NEVER book appointments in the past. The system automatically validates this and will reject past appointments.\n" +
      phoneNumberRules +
      "3. SERVICE NAMES - IMPORTANT:\n" +
      "   - Use simple service names like 'Full Groom', 'Bath & Brush', 'Nail Trim' for BOTH 'get_available_times' AND 'book_appointment'\n" +
      "   - Case-insensitive fuzzy matching works - you can use 'bath', 'groom', 'nails', etc.\n" +
      "   - NO ObjectIds needed! Service names are automatically resolved by the system\n" +
      "   - The 'get_service_list' tool is OPTIONAL - use it only when customer asks 'what services do you offer?' or 'how much does X cost?'\n" +
      "   - DO NOT call 'get_service_list' before booking - it's unnecessary and wastes time\n" +
      "4. PET SIZE SELECTION - When checking availability or booking:\n" +
      "   - Many services have different prices for different pet sizes (S, M, L, XL)\n" +
      "   - If customer has registered pets, call 'get_customer_pets' to see their pet information (breed, weight, age)\n" +
      "   - Use this information to intelligently predict pet size:\n" +
      "     * Small breeds (Chihuahua, Yorkshire Terrier, Pomeranian, etc.) or weight <10kg → Size S\n" +
      "     * Medium breeds (Beagle, Cocker Spaniel, Corgi, etc.) or weight 10-25kg → Size M\n" +
      "     * Large breeds (Labrador, Golden Retriever, German Shepherd, etc.) or weight 25-40kg → Size L\n" +
      "     * Extra large breeds (Great Dane, Mastiff, St. Bernard, etc.) or weight >40kg → Size XL\n" +
      "   - Pass the predicted size to 'get_available_times' for more accurate duration calculation\n" +
      "   - For booking, if you don't know the size, pass null and ask the customer\n" +
      "5. MANDATORY WORKFLOW - When customer asks about booking or availability:\n" +
      "   Step 1: Customer asks about booking or availability (e.g., 'book appointment', 'when are you available?')\n" +
      "   Step 2: (Optional) Call 'get_customer_pets' if you need to predict pet size for accurate duration\n" +
      "   Step 3: IMMEDIATELY call 'get_available_times' with service_name (e.g., 'Full Groom') and pet_size → get actual time ranges\n" +
      "   Step 4: Present time ranges in a USER-FRIENDLY way:\n" +
      "     CORRECT: 'რომელი დრო გირჩევთ? გვაქვს თავისუფალი: 09:00, 09:15, 09:30, 09:45... 14:00-მდე' (morning block) და '16:30, 16:45, 17:00...' (afternoon block)\n" +
      "     CORRECT: 'დილით 9 საათიდან 2 საათამდე და საღამოს 4:30-დან 5:30-მდე'\n" +
      "     WRONG: '09:00-დან 14:30-მდე, 09:00-დან 17:30-მდე' (confusing overlaps)\n" +
      "     - Combine overlapping ranges into single clean blocks\n" +
      "     - Present in natural, conversational language\n" +
      "     - If ranges are continuous (like 9:00-14:30), present as one block\n" +
      "     - If there's a gap (like 9:00-14:30 AND 16:30-17:30), present as two separate blocks\n" +
      "   Step 5: Customer chooses a specific time\n" +
      "   Step 6: If you don't have phone number, ask for it. Once you have it, call 'book_appointment' IMMEDIATELY with the chosen time\n" +
      "   Step 7: Confirm booking with exact date and time from the response\n" +
      "6. CHECKING AVAILABILITY - When customer asks 'when are you available?', 'do you have time tomorrow?', 'any slots on Friday?':\n" +
      "   - NEVER respond with just the general working hours (e.g., '9:00-18:00')\n" +
      "   - You MUST use the 'get_available_times' tool to check:\n" +
      "     * Location-specific working hours for that day\n" +
      "     * Staff members qualified to provide the requested service\n" +
      "     * Actual free time ranges when qualified staff are available\n" +
      "   - After calling 'get_available_times', MERGE and SIMPLIFY overlapping time ranges before presenting to user\n" +
      "   - Example: If tool returns [{start:'09:00',end:'14:30'},{start:'09:00',end:'17:30'},{start:'16:30',end:'17:30'}]:\n" +
      "     * Merge to: 09:00-17:30 (one continuous block)\n" +
      "     * Present as: 'დილიდან საღამომდე თავისუფალი ვართ, 9 საათიდან 5:30-მდე'\n" +
      "   - The working hours shown in Company Info are general guidelines only - they do NOT represent actual staff availability\n" +
      "7. HANDLING BOOKING CONFLICTS:\n" +
      "   - If 'book_appointment' fails with 'BOOKING_CONFLICT' error, the time slot is already taken\n" +
      "   - You MUST immediately call 'get_available_times' to find alternative slots\n" +
      "   - Present those alternative slots in a CLEAN, USER-FRIENDLY format (merge overlaps as described above)\n" +
      "   - DO NOT just say 'sorry, try another time' without showing actual available times\n" +
      "8. CIRCUIT BREAKER - Prevent Infinite Retry Loops:\n" +
      "   - If 'get_available_times' returns 'we are closed' for 3 consecutive dates, STOP checking more dates\n" +
      "   - Instead, escalate to human: 'I'm having trouble finding available slots. Let me connect you with our team who can help you schedule an appointment'\n" +
      "   - DO NOT keep calling 'get_available_times' endlessly when all results are 'closed' - this wastes resources and frustrates the customer\n" +
      "   - Common causes: no staff configured, no working hours configured, or all staff unavailable - these require human intervention\n" +
      "9. After successfully booking, ALWAYS confirm the EXACT date (with day of week) and time to the customer using the 'confirmation' data from the response.\n" +
      "10. The system automatically handles duration, location, staff selection, and validates everything. Trust the error messages - they guide you to the right solution.\n" +
      "11. If a customer asks for 'today at 2pm' and it's already 3pm, politely explain they cannot book in the past and suggest tomorrow or another future time.\n" +
      "12. RESCHEDULING APPOINTMENTS - CRITICAL:\n" +
      "   - When customer asks to reschedule (change time of existing appointment), ALWAYS use 'reschedule_appointment' tool - NEVER create a new appointment\n" +
      "   - To get appointment_id for rescheduling:\n" +
      "     * Option 1: If you just booked the appointment in this conversation, use the 'appointment_id' from the book_appointment response\n" +
      "     * Option 2: Call 'get_customer_appointments' (status: 'upcoming') to find the appointment\n" +
      "   - Common reschedule triggers: 'reschedule', 'change time', 'move appointment', 'book for different time'\n" +
      "   - The 'reschedule_appointment' tool updates the existing appointment - it does NOT create a duplicate\n" +
      "   - After rescheduling, confirm BOTH the old time and new time to the customer using the response data";

    const headerText =
      `${systemInstruction || "You are PetBuddy assistant."}\n` +
      (role ? `Role: ${role}\n` : "") +
      `\nIMPORTANT - Message Length:\n` +
      `- Keep responses concise and under 800 characters when possible\n` +
      `- Instagram has a 1000 character limit per message\n` +
      `- Break complex information into shorter, focused responses\n` +
      `- Use bullet points and clear formatting for readability`;

    const currentContextText =
      `IMPORTANT - Current Date & Time:\n` +
      `- Current date and time: ${nowText}\n` +
      `- ISO local (company TZ): ${isoLocal}\n` +
      `- ISO date (YYYY-MM-DD): ${ymd}\n` +
      `- Spelled date: ${spelledDateUS}\n` +
      `- UTC ISO: ${now.clone().utc().toISOString()}\n` +
      `- Day of week: ${dayOfWeek}\n` +
      `- Timezone: ${timezone}\n` +
      `\n` +
      `ALWAYS use this date and time when customers ask about today, current time, or when scheduling appointments. This is the company's local time, NOT server time. When presenting dates to the user, spell out the month (e.g., ${spelledDateUS}) to avoid MM/DD vs DD/MM confusion. Use YYYY-MM-DD for tool inputs.`;

    return [
      headerText.trim(),
      currentContextText.trim(),
      appointmentBookingRules.trim(),
      companyInfoText.trim(),
      servicesText.trim(),
      rulesText.trim(),
      addressPolicyText.trim(),
      examplesText.trim(),
    ]
      .filter(Boolean)
      .join("\n\n---\n\n");
  } catch (e) {
    const fallback =
      company?.bot?.systemInstruction ||
      config.bot.systemInstructions ||
      "You are PetBuddy assistant.";
    return fallback;
  }
}

export async function setBotActive(companyId, active) {
  try {
    await Company.updateOne(
      { _id: companyId },
      { $set: { "bot.active": Boolean(active) } }
    );
    console.log(
      `[CompanyService] Set bot.active=${Boolean(
        active
      )} for company ${companyId}`
    );
  } catch (e) {
    console.error(
      `[CompanyService] Failed to set bot.active=${Boolean(
        active
      )} for company ${companyId}:`,
      e
    );
  }
}
