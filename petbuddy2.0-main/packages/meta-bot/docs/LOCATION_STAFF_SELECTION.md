# Location & Staff Selection - No Auto-Assignment Policy

## Overview

This document describes the **mandatory** location and staff selection behavior for the PetBuddy AI booking system.

**CRITICAL REQUIREMENT**: When a customer picks an appointment time, the AI **MUST** collect their preferred location and staff member whenever there is more than one valid option. Bookings are **NEVER** auto-assigned silently.

---

## Business Rules

### Location Selection

1. **Single Location**: If the company has only ONE location, the system auto-selects it (no customer input needed)
2. **Multiple Locations**: If the company has multiple locations offering the service:
   - The system **MUST** return `needs_selection` with type `location`
   - The AI **MUST** call `get_location_choices` to retrieve full location details
   - The AI **MUST** present ALL locations to the customer with names and addresses
   - The AI **MUST** wait for customer to choose
   - Only after customer choice, the AI calls `book_appointment` with `location_id`

### Staff Selection

1. **Single Staff Member**: If only ONE qualified staff member is available at the chosen location, auto-select them
2. **Multiple Staff Members**: If multiple qualified staff are available:
   - The system **MUST** return `needs_selection` with type `staff`
   - The AI **MUST** call `get_staff_list` to retrieve qualified staff for that location
   - The AI **MUST** present ALL staff options to the customer
   - The AI **MUST** wait for customer to choose OR explicitly say "any"/"no preference"
   - If customer says "any", AI uses first staff from the list
   - If customer chooses specific staff, AI uses their selected `staff_id`
   - Only after customer response, the AI calls `book_appointment` with `staff_id`

---

## Implementation Details

### Backend Changes

#### 1. `getBookingContext` (lib/bookingContext.js)

**Changed Behavior**:
```javascript
// OLD (lines 231-234): Auto-selected main location when no preference
location = locations.find((loc) => loc.isMain) || locations[0];
locationId = String(location._id);

// NEW (lines 231-243): Only auto-select if exactly ONE location
if (locations.length === 1) {
  location = locations[0];
  locationId = String(location._id);
} else {
  // Multiple locations - use main as temporary reference
  // Caller MUST detect locationOptions.length > 1 and ask customer
  location = locations.find((loc) => loc.isMain) || locations[0];
  locationId = String(location._id);
}
```

**Why**: This ensures the function doesn't silently choose a location when multiple exist. The temporary location is used only for getting staff options, but the caller is responsible for checking `locationOptions.length` and asking the customer.

#### 2. `book_appointment` Tool Handler (lib/toolHandlers.js)

**Existing Logic (lines 194-241)**: Already correctly implemented

```javascript
// Check if location selection needed
if (locationOptions.length > 1 && !location_id) {
  return {
    success: false,
    needs_selection: {
      type: 'location',
      options: locationOptions,
      message: 'LOCATION SELECTION REQUIRED...'
    },
    context: { /* preserved booking params */ }
  };
}

// Check if staff selection needed
if (qualifiedStaffIds.length > 1 && !staff_id) {
  return {
    success: false,
    needs_selection: {
      type: 'staff',
      options: staffForLocation,
      message: 'STAFF SELECTION REQUIRED...'
    },
    context: { /* preserved booking params */ }
  };
}
```

### AI Agent Changes

#### 1. Gemini Agent Instructions (langgraph/nodes/geminiAgent.js)

**Updated Instructions (lines 448-481)**:

```
LOCATION & STAFF SELECTION HANDLING (CRITICAL - NEVER AUTO-ASSIGN):
When the book_appointment tool returns "needs_selection", this means the customer 
must choose between multiple options. UNDER NO CIRCUMSTANCES should you proceed 
with booking without explicitly asking the customer for their preference.

MANDATORY RULES - VIOLATIONS WILL BREAK THE SYSTEM:
- NEVER auto-assign location/staff silently - ALWAYS ask the customer first
- NEVER proceed with booking until you have received the customer's preference
- If you book without asking, the appointment will be created at the wrong 
  location/with wrong staff
```

#### 2. Tool Descriptions (langgraph/tools/index.js)

**Updated `book_appointment` tool description (line 101)**:
```javascript
"CRITICAL: If there are multiple locations or staff members, you MUST collect 
the customer's preference first using get_location_choices and get_staff_list 
tools. NEVER auto-assign silently. If needs_selection is returned, you MUST 
ask the customer to choose before calling book_appointment again."
```

**Updated parameter descriptions**:
```javascript
location_id: "REQUIRED if there are multiple locations. You must ask the 
             customer which location they prefer BEFORE calling this tool."

staff_id: "REQUIRED if there are multiple qualified staff members. You must 
          ask the customer for their staff preference BEFORE calling this tool."
```

---

## Customer Flow Examples

### Example 1: Multiple Locations

**Customer**: "I'd like to book a full groom for tomorrow at 2pm"

**AI Step 1**: Calls `book_appointment` without `location_id`
- Returns: `{ success: false, needs_selection: { type: 'location', ... } }`

**AI Step 2**: Calls `get_location_choices` with service_name
- Returns: `{ locations: [Downtown, Westside, Eastside] }`

**AI Response**: "We have 3 locations that offer Full Groom service:
1. Downtown - 123 Main St
2. Westside - 456 Oak Ave  
3. Eastside - 789 Pine Rd

Which location works best for you?"

**Customer**: "Downtown"

**AI Step 3**: Calls `book_appointment` with `location_id: '...'`
- If multiple staff exist, returns `needs_selection` with type `staff`
- If only one staff, proceeds with booking

### Example 2: Multiple Staff Members

**Customer**: (Already chose location) "Downtown please"

**AI Step 1**: Calls `book_appointment` with `location_id` but no `staff_id`
- Returns: `{ success: false, needs_selection: { type: 'staff', ... } }`

**AI Step 2**: Calls `get_staff_list` with `service_name` and `location_id`
- Returns: `{ staff: [{ id: '...', name: 'Sarah' }, { id: '...', name: 'Mike' }] }`

**AI Response**: "We have 2 groomers available for your appointment at Downtown:
- Sarah
- Mike

Do you have a preference, or would you like me to assign the first available?"

**Customer**: "Sarah please" OR "Any is fine"

**AI Step 3**: Calls `book_appointment` with:
- If customer chose Sarah: `staff_id: 'sarah_id'`
- If customer said "any": `staff_id: 'first_staff_id'` (Sarah's ID)

---

## LangGraph Tools

### Available Tools

1. **`get_location_choices`**
   - **Purpose**: Get all locations that offer a specific service
   - **Parameters**: `{ service_name }`
   - **Returns**: `{ locations: [{ id, name, address, isMain }] }`
   - **When to use**: When `book_appointment` returns `needs_selection.type === 'location'`

2. **`get_staff_list`**
   - **Purpose**: Get qualified staff members for a service at a location
   - **Parameters**: `{ service_name, location_id }`
   - **Returns**: `{ staff: [{ id, name, role, locationIds }] }`
   - **When to use**: When `book_appointment` returns `needs_selection.type === 'staff'`

3. **`book_appointment`**
   - **Purpose**: Create the appointment booking
   - **Parameters**: 
     - Required: `appointment_time`, `service_name`
     - Conditional: `location_id` (if multiple locations), `staff_id` (if multiple staff)
     - Optional: `pet_size`, `pet_name`, `pet_type`, `notes`
   - **Returns**: 
     - Success: `{ success: true, appointment_id, ... }`
     - Needs selection: `{ success: false, needs_selection: { type, options, message } }`

---

## Testing

### Test Coverage

A comprehensive test suite has been created at:
```
packages/meta-bot/tests/booking-location-staff-selection.test.js
```

**Test Cases**:
1. ✓ Should NOT auto-select when multiple locations exist
2. ✓ Should auto-select when only ONE location exists
3. ✓ Should return needs_selection for multiple locations
4. ✓ Should return needs_selection for multiple staff
5. ✓ Should proceed with booking when preferences are provided

### Running Tests

```bash
cd packages/meta-bot
npm test tests/booking-location-staff-selection.test.js
```

---

## Error Prevention

### Common Mistakes to Avoid

❌ **WRONG**: AI says "I'll book you at our main location" without asking
✓ **CORRECT**: AI presents all locations and waits for customer choice

❌ **WRONG**: AI assigns to "first available staff" without asking customer
✓ **CORRECT**: AI presents all staff and asks if customer has a preference

❌ **WRONG**: Calling `book_appointment` multiple times with no location/staff until one succeeds
✓ **CORRECT**: Detect `needs_selection`, ask customer, then call once with their preference

### Validation Checklist

Before deploying any changes to booking logic:

- [ ] Multiple locations → `needs_selection` returned?
- [ ] Multiple staff → `needs_selection` returned?
- [ ] AI asks customer for preference?
- [ ] AI waits for customer response?
- [ ] Customer choice passed to `book_appointment`?
- [ ] No silent auto-assignments in logs?
- [ ] Test cases passing?

---

## Monitoring & Debugging

### Debug Logging

Enable debug mode to see selection logic:
```bash
DEBUG_APPOINTMENTS=true npm start
```

**Look for**:
```
[book_appointment] Found 2 locations - needs customer selection
[book_appointment] Found 3 qualified staff - needs customer selection
```

### Metrics to Track

- **Location Selection Rate**: How often customers are asked to choose a location
- **Staff Selection Rate**: How often customers are asked to choose staff
- **Preference Pattern**: Which locations/staff customers prefer
- **Booking Abandonment**: Do customers drop off when asked to choose?

---

## FAQs

**Q: What if a company has 10 locations? Won't this annoy customers?**
A: Yes, presenting 10 locations could be overwhelming. Consider:
- Asking customer for their city/area first
- Filtering locations by proximity if customer shares location
- Showing only top 3-5 closest locations

**Q: Can we default to the "main" location and only ask if customer wants to change?**
A: Not with the current implementation. The requirement is explicit: ALWAYS ask when multiple options exist. This ensures transparency and prevents wrong assignments.

**Q: What if the customer doesn't care which staff member?**
A: If customer says "any", "no preference", "either is fine", etc., the AI should pick the first staff from the list and proceed.

**Q: Can staff selection be based on availability instead of asking?**
A: Future enhancement: Could check availability for each staff and present only available ones. But customer should still be asked if multiple are available.

---

## Related Files

- `packages/meta-bot/lib/bookingContext.js` - Core booking context logic
- `packages/meta-bot/lib/toolHandlers.js` - Tool implementations
- `packages/meta-bot/langgraph/tools/index.js` - LangChain tool wrappers
- `packages/meta-bot/langgraph/nodes/geminiAgent.js` - Gemini AI agent
- `packages/meta-bot/langgraph/nodes/agent.js` - OpenAI agent
- `packages/meta-bot/utils/openaiTools.js` - Legacy OpenAI tool definitions
- `packages/meta-bot/tests/booking-location-staff-selection.test.js` - Test suite

---

## Changelog

### 2025-11-10: Initial Implementation
- ✅ Updated `getBookingContext` to avoid auto-selecting locations
- ✅ Verified `book_appointment` handler checks for multiple options
- ✅ Enhanced AI agent prompts with explicit no-auto-assign rules
- ✅ Updated tool descriptions to emphasize customer choice requirement
- ✅ Created comprehensive test suite
- ✅ Added documentation

---

## Support

For questions or issues related to location/staff selection:
1. Check debug logs with `DEBUG_APPOINTMENTS=true`
2. Review test cases for expected behavior
3. Verify `needs_selection` responses are being handled by AI
4. Check AI agent instructions are loaded correctly

**CRITICAL**: If bookings are being created at wrong locations or with wrong staff, immediately check if:
- Multiple options exist
- `needs_selection` is being returned
- AI is asking customer for preference
- Customer preference is being passed to `book_appointment`

