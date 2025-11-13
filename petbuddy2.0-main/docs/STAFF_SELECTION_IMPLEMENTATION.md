# Staff & Location Selection Implementation

## Overview

This document describes the implementation of explicit location and staff selection for the PetBuddy booking system. The system now requires customers to explicitly choose their preferred location and staff member when multiple valid options exist, preventing silent auto-assignment.

## Motivation

**Problem**: Previously, the booking system would auto-assign locations (preferring `isMain: true`) and staff members (trying each sequentially) without customer input. This could lead to:
- Customers being booked at undesired locations
- Appointments with unfamiliar staff members
- Lack of transparency in the booking process

**Solution**: Implement explicit location and staff selection where the AI assistant:
1. Detects when multiple locations or staff are available
2. Presents options to the customer with full details
3. Collects customer preference before finalizing booking
4. Only proceeds when customer makes an explicit choice

## Architecture

### Core Components

#### 1. Enhanced `getBookingContext` ([bookingContext.js:62-322](packages/meta-bot/lib/bookingContext.js#L62-L322))

**New Parameters**:
- `preferredLocationId` (optional): Customer's chosen location ID
- `preferredStaffId` (optional): Customer's chosen staff ID

**New Return Values**:
- `locationOptions`: Array of all available locations with `{ id, name, isMain, address }`
- `staffOptions`: Array of all qualified staff with `{ id, name, role, locationIds, primaryLocationId }`

**Location Selection Logic**:
```javascript
// 1. Fetch all company locations
const locations = await Location.find({ companyId }).sort({ isMain: -1 });

// 2. Build location options for presentation
const locationOptions = locations.map(loc => ({
  id: String(loc._id),
  name: loc.label || loc.address,
  isMain: loc.isMain || false,
  address: loc.address
}));

// 3. Validate and use preferred location if provided
if (preferredLocationId) {
  location = locations.find(loc => String(loc._id) === preferredLocationId);
  if (!location) {
    throw new Error(`Invalid location ID: ${preferredLocationId}`);
  }
} else {
  // Auto-select main location (backward compatible)
  location = locations.find(loc => loc.isMain) || locations[0];
}
```

**Staff Filtering Logic**:
```javascript
// 1. Get staff with allowed roles for the service
const staffWithRoles = await User.find({
  companyId,
  isActive: true,
  role: { $in: serviceAllowedRoles }
});

// 2. Filter by service qualification
let qualifiedStaff = filterQualifiedStaff(staffWithRoles, serviceId);

// 3. Filter by location assignment
const qualifiedStaffForLocation = filterStaffByLocation(qualifiedStaff, locationId);

// 4. If preferred staff specified, validate and restrict
if (preferredStaffId) {
  const preferredStaff = qualifiedStaff.find(s => String(s._id) === preferredStaffId);

  if (!preferredStaff) {
    throw new Error('Staff not qualified for this service');
  }

  const staffAtLocation = filterStaffByLocation([preferredStaff], locationId);
  if (staffAtLocation.length === 0) {
    throw new Error('Staff not assigned to selected location');
  }

  qualifiedStaff = [preferredStaff];
} else {
  qualifiedStaff = qualifiedStaffForLocation;
}
```

**Staff Location Filtering** ([bookingContext.js:30-45](packages/meta-bot/lib/bookingContext.js#L30-L45)):
```javascript
function filterStaffByLocation(staffList, locationId) {
  return staffList.filter((staff) => {
    // Check locationIds array
    if (staff.locationIds && staff.locationIds.length > 0) {
      const locationIdStrings = staff.locationIds.map(id => String(id));
      if (locationIdStrings.includes(locationId)) return true;
    }
    // Fallback to primaryLocationId
    if (staff.primaryLocationId && String(staff.primaryLocationId) === locationId) {
      return true;
    }
    return false;
  });
}
```

#### 2. Updated `book_appointment` Tool ([langgraph/tools/index.js:98-204](packages/meta-bot/langgraph/tools/index.js#L98-L204))

**New Schema Parameters**:
```javascript
{
  location_id: z.string().optional().describe(
    "Location ID from get_location_choices. REQUIRED if multiple locations."
  ),
  staff_id: z.string().optional().describe(
    "Staff ID from get_staff_list. REQUIRED if multiple qualified staff."
  )
}
```

**Updated Description**:
```
"Book an appointment for the customer. If there are multiple locations or staff
members, you MUST collect the customer's preference first using get_location_choices
and get_staff_list tools. Returns confirmation details or needs_selection if
location/staff choice is required."
```

#### 3. Updated `book_appointment` Handler ([toolHandlers.js:135-602](packages/meta-bot/lib/toolHandlers.js#L135-L602))

**Location Selection Check**:
```javascript
// After getting booking context
if (locationOptions.length > 1 && !location_id) {
  return {
    success: false,
    needs_selection: {
      type: 'location',
      options: locationOptions,
      message: `LOCATION SELECTION REQUIRED: This company has ${locationOptions.length}
                locations. Please ask the customer which location they prefer and call
                get_location_choices to present the options with addresses.`
    },
    context: {
      appointment_time: params.appointment_time,
      service_name: params.service_name,
      pet_size: params.pet_size,
      pet_name: params.pet_name,
      pet_type: params.pet_type
    }
  };
}
```

**Staff Selection Check**:
```javascript
// After location is determined
if (qualifiedStaffIds.length > 1 && !staff_id) {
  const staffForLocation = staffOptions.filter(s => {
    const staffLocationIds = s.locationIds || [];
    return staffLocationIds.includes(resolved_location_id) ||
           s.primaryLocationId === resolved_location_id;
  });

  return {
    success: false,
    needs_selection: {
      type: 'staff',
      location_id: resolved_location_id,
      location_name: location.label || location.address,
      options: staffForLocation,
      message: `STAFF SELECTION REQUIRED: ${staffForLocation.length} staff members
                are qualified to provide "${serviceCategory.name}" service at
                ${location.label}. Please ask the customer if they have a preferred
                staff member.`
    },
    context: { /* booking parameters */ }
  };
}
```

**Enhanced Success Response**:
```javascript
return {
  success: true,
  appointment_id: String(appointment._id),
  staff_id,
  staff_name: bookedStaff.fullName,
  location_id: final_location_id,
  location_name: location.label || location.address,
  message_to_customer: `Your appointment is scheduled for ${date} at ${time}
                        with ${staff_name} at ${location_name}.`
};
```

#### 4. New `get_location_choices` Tool ([langgraph/tools/index.js:429-445](packages/meta-bot/langgraph/tools/index.js#L429-L445))

**Purpose**: Expose location options to the AI for presentation to customers.

**Schema**:
```javascript
{
  service_name: z.string().describe(
    "Service name to check location availability (e.g., 'Full Groom')"
  )
}
```

**Handler** ([toolHandlers.js:1844-1885](packages/meta-bot/lib/toolHandlers.js#L1844-L1885)):
```javascript
get_location_choices: async ({ service_name }, context) => {
  const bookingCtx = await getBookingContext({
    companyId: context.company_id,
    serviceName: service_name,
    workingHours: context.working_hours,
    timezone: context.timezone
  });

  return {
    success: true,
    service_name: bookingCtx.service.name,
    service_id: String(bookingCtx.service._id),
    locations: bookingCtx.locationOptions,
    message: `Found ${bookingCtx.locationOptions.length} locations that offer
              ${bookingCtx.service.name}`
  };
}
```

**Response Format**:
```json
{
  "success": true,
  "service_name": "Full Groom",
  "service_id": "507f1f77bcf86cd799439011",
  "locations": [
    {
      "id": "507f191e810c19729de860ea",
      "name": "Downtown Location",
      "isMain": true,
      "address": "123 Main St, City"
    },
    {
      "id": "507f191e810c19729de860eb",
      "name": "Westside Branch",
      "isMain": false,
      "address": "456 Oak Ave, City"
    }
  ],
  "message": "Found 2 locations that offer Full Groom"
}
```

#### 5. Enhanced `get_staff_list` Tool ([langgraph/tools/index.js:447-470](packages/meta-bot/langgraph/tools/index.js#L447-L470))

**Updated Schema**:
```javascript
{
  service_name: z.string().optional().describe(
    "Optional service name to filter by qualification"
  ),
  location_id: z.string().optional().describe(
    "Optional location ID to filter staff assigned to that location"
  )
}
```

**Handler Updates** ([toolHandlers.js:1887-2022](packages/meta-bot/lib/toolHandlers.js#L1887-L2022)):
- Accepts `service_name` (in addition to legacy `service_id`)
- Accepts `location_id` for location-based filtering
- Uses `getBookingContext` when both service and location specified
- Returns `locationIds` and `primaryLocationId` in response

**Response Format**:
```json
{
  "success": true,
  "staff": [
    {
      "id": "507f1f77bcf86cd799439012",
      "name": "Sarah Johnson",
      "role": "groomer",
      "locationIds": ["507f191e810c19729de860ea"],
      "primaryLocationId": "507f191e810c19729de860ea"
    },
    {
      "id": "507f1f77bcf86cd799439013",
      "name": "Mike Davis",
      "role": "groomer",
      "locationIds": ["507f191e810c19729de860ea", "507f191e810c19729de860eb"],
      "primaryLocationId": "507f191e810c19729de860ea"
    }
  ]
}
```

#### 6. Gemini Agent System Instructions ([geminiAgent.js:448-473](packages/meta-bot/langgraph/nodes/geminiAgent.js#L448-L473))

**Location Selection Flow**:
```
When book_appointment returns needs_selection.type === "location":
1. Call get_location_choices with the service_name
2. Present ALL location options with names and addresses
3. Ask customer which location they prefer
4. Once chosen, call book_appointment with location_id parameter
```

**Staff Selection Flow**:
```
When book_appointment returns needs_selection.type === "staff":
1. Call get_staff_list with service_name and location_id
2. Present ALL staff options with names
3. Ask if customer has a preferred staff member
4. If customer says "any" or "no preference", pick first staff from list
5. Once chosen, call book_appointment with both location_id and staff_id
```

**Critical Rules**:
- NEVER auto-assign location/staff silently - ALWAYS ask customer first
- Use exact "id" field from tool responses
- Keep original appointment_time, service_name, and other parameters
- DO NOT confirm booking until `book_appointment` returns `success: true`

## Conversation Flow Examples

### Example 1: Multiple Locations → Multiple Staff

**Customer**: "I'd like to book a full groom for tomorrow at 2pm"

**AI**:
1. Calls `get_available_times` → Sees 2pm available
2. Calls `book_appointment(appointment_time: "tomorrow at 2pm", service_name: "Full Groom")`
3. Receives `needs_selection: { type: "location", options: [...] }`
4. Calls `get_location_choices(service_name: "Full Groom")`
5. **Response**: "We have 2 locations that offer Full Groom:
   - Downtown Location (123 Main St)
   - Westside Branch (456 Oak Ave)

   Which location works best for you?"

**Customer**: "Downtown please"

**AI**:
1. Calls `book_appointment(appointment_time: "tomorrow at 2pm", service_name: "Full Groom", location_id: "507f...")`
2. Receives `needs_selection: { type: "staff", location_id: "507f...", options: [...] }`
3. Calls `get_staff_list(service_name: "Full Groom", location_id: "507f...")`
4. **Response**: "Great! We have 2 groomers available at Downtown:
   - Sarah Johnson
   - Mike Davis

   Do you have a preference, or shall I book with the first available?"

**Customer**: "Sarah please"

**AI**:
1. Calls `book_appointment(appointment_time: "tomorrow at 2pm", service_name: "Full Groom", location_id: "507f...", staff_id: "507f...")`
2. Receives `success: true, staff_name: "Sarah Johnson", location_name: "Downtown Location"`
3. **Response**: "Perfect! Your full groom appointment is confirmed for tomorrow at 2:00 PM with Sarah Johnson at our Downtown Location (123 Main St). The appointment will last until 3:00 PM."

### Example 2: Single Location → Multiple Staff

**Customer**: "Book a nail trim for Friday at 10am"

**AI**:
1. Calls `book_appointment(appointment_time: "Friday at 10am", service_name: "Nail Trim")`
2. Only 1 location → Auto-selected
3. Receives `needs_selection: { type: "staff", options: [...] }`
4. Calls `get_staff_list(service_name: "Nail Trim", location_id: "507f...")`
5. **Response**: "We have 3 staff members available for nail trim on Friday at 10am:
   - Sarah Johnson
   - Mike Davis
   - Emily Chen

   Would you like to choose a specific groomer, or shall I book with the first available?"

**Customer**: "First available is fine"

**AI**:
1. Selects first staff from list (`staff_id: "507f..."`)
2. Calls `book_appointment(appointment_time: "Friday at 10am", service_name: "Nail Trim", location_id: "507f...", staff_id: "507f...")`
3. **Response**: "All set! Your nail trim appointment is booked for Friday at 10:00 AM with Sarah Johnson at our main location."

### Example 3: No Selection Needed (Single Location, Single Staff)

**Customer**: "I need a bath and brush for my dog tomorrow at 3pm"

**AI**:
1. Calls `book_appointment(appointment_time: "tomorrow at 3pm", service_name: "Bath and Brush")`
2. Only 1 location, only 1 qualified staff → Auto-booked immediately
3. Receives `success: true`
4. **Response**: "Your bath and brush appointment is confirmed for tomorrow at 3:00 PM with Mike Davis at our location (123 Main St)."

## Testing Scenarios

### Unit Tests (to be implemented in `packages/meta-bot/langgraph/__tests__`)

#### Test File: `locationStaffSelection.test.js`

**Test 1: Multiple Locations - Returns needs_selection**
```javascript
it('should return needs_selection when multiple locations exist', async () => {
  // Mock: 2 locations, 1 staff
  Location.find.mockResolvedValue([
    { _id: 'loc1', label: 'Downtown', isMain: true },
    { _id: 'loc2', label: 'Westside', isMain: false }
  ]);

  const result = await handlers.book_appointment({
    appointment_time: 'tomorrow at 2pm',
    service_name: 'Full Groom'
  }, context);

  expect(result.success).toBe(false);
  expect(result.needs_selection.type).toBe('location');
  expect(result.needs_selection.options).toHaveLength(2);
});
```

**Test 2: Location Chosen - Returns needs_selection for Staff**
```javascript
it('should return staff needs_selection after location chosen', async () => {
  // Mock: 1 location chosen, 2 qualified staff
  User.find.mockResolvedValue([
    { _id: 'staff1', fullName: 'Sarah', locationIds: ['loc1'] },
    { _id: 'staff2', fullName: 'Mike', locationIds: ['loc1'] }
  ]);

  const result = await handlers.book_appointment({
    appointment_time: 'tomorrow at 2pm',
    service_name: 'Full Groom',
    location_id: 'loc1'
  }, context);

  expect(result.success).toBe(false);
  expect(result.needs_selection.type).toBe('staff');
  expect(result.needs_selection.options).toHaveLength(2);
});
```

**Test 3: Both Chosen - Success**
```javascript
it('should book successfully when location_id and staff_id provided', async () => {
  BookingService.createAppointment.mockResolvedValue({
    _id: 'appt1',
    staffId: 'staff1',
    locationId: 'loc1'
  });

  const result = await handlers.book_appointment({
    appointment_time: 'tomorrow at 2pm',
    service_name: 'Full Groom',
    location_id: 'loc1',
    staff_id: 'staff1'
  }, context);

  expect(result.success).toBe(true);
  expect(result.staff_name).toBeDefined();
  expect(result.location_name).toBeDefined();
});
```

**Test 4: Invalid Location ID**
```javascript
it('should throw error for invalid location_id', async () => {
  await expect(
    handlers.book_appointment({
      appointment_time: 'tomorrow at 2pm',
      service_name: 'Full Groom',
      location_id: 'invalid_id'
    }, context)
  ).rejects.toThrow('Invalid location ID');
});
```

**Test 5: Staff Not at Location**
```javascript
it('should throw error when staff not assigned to location', async () => {
  // Mock: staff1 assigned to loc1, booking attempted at loc2
  User.find.mockResolvedValue([
    { _id: 'staff1', fullName: 'Sarah', locationIds: ['loc1'] }
  ]);

  await expect(
    handlers.book_appointment({
      appointment_time: 'tomorrow at 2pm',
      service_name: 'Full Groom',
      location_id: 'loc2',
      staff_id: 'staff1'
    }, context)
  ).rejects.toThrow('not assigned to the selected location');
});
```

**Test 6: get_location_choices Returns All Locations**
```javascript
it('should return all locations via get_location_choices', async () => {
  Location.find.mockResolvedValue([
    { _id: 'loc1', label: 'Downtown', address: '123 Main St', isMain: true },
    { _id: 'loc2', label: 'Westside', address: '456 Oak Ave', isMain: false }
  ]);

  const result = await handlers.get_location_choices({
    service_name: 'Full Groom'
  }, context);

  expect(result.success).toBe(true);
  expect(result.locations).toHaveLength(2);
  expect(result.locations[0]).toMatchObject({
    id: expect.any(String),
    name: 'Downtown',
    address: '123 Main St',
    isMain: true
  });
});
```

**Test 7: get_staff_list Filters by Location**
```javascript
it('should filter staff by location_id', async () => {
  User.find.mockResolvedValue([
    { _id: 'staff1', fullName: 'Sarah', locationIds: ['loc1'] },
    { _id: 'staff2', fullName: 'Mike', locationIds: ['loc2'] }
  ]);

  const result = await handlers.get_staff_list({
    service_name: 'Full Groom',
    location_id: 'loc1'
  }, context);

  expect(result.success).toBe(true);
  expect(result.staff).toHaveLength(1);
  expect(result.staff[0].name).toBe('Sarah');
});
```

### Integration Tests

**Scenario: Full Multi-Step Booking Flow**
1. Customer initiates booking without location/staff
2. System returns location options
3. Customer chooses location
4. System returns staff options
5. Customer chooses staff
6. System confirms booking with both details

## Database Schema Reference

### User (Staff) Model
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,
  fullName: String,
  role: String, // 'groomer', 'receptionist', 'manager'
  roles: [String],
  isActive: Boolean,
  serviceCategoryIds: [ObjectId], // Empty array = qualified for ALL services
  locationIds: [ObjectId], // Assigned locations
  primaryLocationId: ObjectId // Main location
}
```

### Location Model
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,
  label: String,
  address: String,
  phone: String,
  timezone: String,
  isMain: Boolean, // Main location flag
  workHours: [{
    weekday: String,
    startTime: String,
    endTime: String
  }],
  holidays: [Date]
}
```

### ServiceCategory Model
```javascript
{
  _id: ObjectId,
  companyId: ObjectId,
  name: String,
  description: String,
  species: String,
  allowedRoles: [String], // ['groomer'] by default
  active: Boolean
}
```

## Migration Notes

### Backward Compatibility

The implementation maintains full backward compatibility:

1. **Single Location Companies**: Auto-selects the only location (no customer prompt)
2. **Single Qualified Staff**: Auto-assigns without prompting
3. **Legacy `service_id` Parameter**: Still supported in `get_staff_list`
4. **Existing Tool Calls**: Work unchanged when no selection needed

### Breaking Changes

None. All changes are additive:
- New optional parameters (`location_id`, `staff_id`)
- New tool (`get_location_choices`)
- Enhanced responses (backward compatible)

### Deployment Steps

1. Deploy backend changes (handlers, bookingContext)
2. Deploy tool schema updates
3. Deploy Gemini agent instructions
4. Add unit tests
5. Monitor `needs_selection` responses in logs
6. Verify customer experience in multi-location scenarios

## Monitoring & Metrics

### Key Metrics to Track

1. **Selection Rate**: % of bookings requiring location/staff selection
2. **Selection Type Distribution**:
   - Location only
   - Staff only
   - Both location and staff
3. **Customer Response Time**: Time between selection prompt and customer choice
4. **Auto-Assignment Rate**: % of bookings auto-assigned (single option)
5. **Error Rate**: Invalid location_id or staff_id attempts

### Log Monitoring

Search for these patterns in logs:
```bash
# Location selection triggered
grep "needs_selection.*location" logs/meta-bot.log

# Staff selection triggered
grep "needs_selection.*staff" logs/meta-bot.log

# Invalid selection attempts
grep "Invalid location ID\|not assigned to the selected location" logs/meta-bot.log
```

## Future Enhancements

### Potential Improvements

1. **Customer Preferences Persistence**:
   - Store customer's preferred location in Contact model
   - Store preferred staff in Contact model
   - Auto-suggest based on booking history

2. **Smart Defaults**:
   - Suggest closest location based on customer address
   - Suggest staff based on previous appointments
   - Recommend based on staff availability/schedule

3. **Availability-Aware Selection**:
   - Show only locations with availability for requested time
   - Show only staff available at requested time
   - Include availability info in option presentation

4. **Multi-Language Support**:
   - Translate location/staff options based on customer language
   - Support Georgian, English, and other languages

5. **Enhanced Presentation**:
   - Include staff photos in options
   - Show staff ratings/reviews
   - Display location photos/maps

## Troubleshooting

### Common Issues

**Issue**: Customer stuck in selection loop
- **Cause**: Repeated `needs_selection` returns
- **Solution**: Check LLM is passing `location_id`/`staff_id` correctly
- **Debug**: Log tool call parameters in `book_appointment`

**Issue**: Invalid location/staff IDs
- **Cause**: LLM passing wrong field (name instead of id)
- **Solution**: Verify tool descriptions emphasize using "id" field
- **Debug**: Add validation logging in handlers

**Issue**: Staff selection shows staff from wrong location
- **Cause**: Location filtering not applied correctly
- **Solution**: Check `filterStaffByLocation` logic
- **Debug**: Add logging in staff filtering

### Debug Commands

```bash
# Check location options for a service
node -e "
const { getBookingContext } = require('./packages/meta-bot/lib/bookingContext.js');
getBookingContext({
  companyId: 'YOUR_COMPANY_ID',
  serviceName: 'Full Groom'
}).then(ctx => console.log(ctx.locationOptions));
"

# Check staff options for location
node -e "
const { getBookingContext } = require('./packages/meta-bot/lib/bookingContext.js');
getBookingContext({
  companyId: 'YOUR_COMPANY_ID',
  serviceName: 'Full Groom',
  preferredLocationId: 'YOUR_LOCATION_ID'
}).then(ctx => console.log(ctx.staffOptions));
"
```

## References

- **Implementation PR**: [Link to PR]
- **Related Issues**: [Issue tracking multi-location support]
- **Design Doc**: This document
- **Test Coverage**: `packages/meta-bot/langgraph/__tests__/locationStaffSelection.test.js`

---

**Last Updated**: 2025-11-11
**Author**: PetBuddy Engineering Team
**Reviewers**: [Names]
**Status**: Implemented (Testing Pending)
