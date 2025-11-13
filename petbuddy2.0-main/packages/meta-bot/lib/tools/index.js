/**
 * Tool Handlers Index
 *
 * Centralized export for all AI tool handlers.
 *
 * This module is being refactored from a single 2,090-line file into
 * focused domain modules. Current exports maintained for backward compatibility.
 *
 * Refactoring Progress:
 * ✅ datetime.js - DateTime tools (extracted)
 * ✅ customer.js - Customer info tools (extracted)
 * ⏳ appointments.js - Booking, cancellation, rescheduling (~800 lines)
 * ⏳ availability.js - Get available times (~400 lines)
 * ⏳ services.js - Service & location lists (~300 lines)
 * ⏳ pets.js - Pet management (~200 lines)
 *
 * TODO: Complete extraction of remaining tools from toolHandlers.js
 */

// Import new modular tools
import { getCurrentDatetime } from "./datetime.js";
import { createCustomerTools } from "./customer.js";

// Import legacy toolHandlers (to be split)
import { createToolHandlers as createLegacyToolHandlers } from "../toolHandlers.js";

/**
 * Create all tool handlers for a given platform
 * @param {string} platform - Platform name (facebook/instagram)
 * @returns {Object} All tool handlers
 */
export function createToolHandlers(platform) {
  // Get customer tools with platform context
  const customerTools = createCustomerTools(platform);

  // Get legacy tools (appointments, services, pets, etc.)
  const legacyTools = createLegacyToolHandlers(platform);

  // Merge new modular tools with legacy tools
  // New tools override legacy if same name exists
  return {
    ...legacyTools,

    // DateTime tools (from new module)
    get_current_datetime: getCurrentDatetime,

    // Customer tools (from new module)
    ...customerTools,

    // Note: Other tools still from legacy toolHandlers.js:
    // - book_appointment
    // - get_available_times
    // - get_customer_appointments
    // - cancel_appointment
    // - reschedule_appointment
    // - get_customer_pets
    // - add_pet
    // - get_service_list
    // - get_locations
    // - get_staff_list
  };
}

// Re-export for direct imports if needed
export { getCurrentDatetime } from "./datetime.js";
export { createCustomerTools } from "./customer.js";
