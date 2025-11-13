# Booking Flow Diagram: Location & Staff Selection

## Overview Flow

```
Customer Request
      ↓
[AI: Parse Intent]
      ↓
[AI: Call book_appointment]
      ↓
   ┌──────────────────┐
   │ Check Locations  │
   └────────┬─────────┘
            │
     ┌──────┴──────┐
     │             │
   [1 Loc]    [Multiple Locs]
     │             │
     │        ┌────┴────────────────────┐
     │        │ Return needs_selection  │
     │        │ type: 'location'        │
     │        └─────────┬───────────────┘
     │                  ↓
     │        [AI: Call get_location_choices]
     │                  ↓
     │        [AI: Present all locations]
     │                  ↓
     │        [AI: Wait for customer choice]
     │                  ↓
     │        [Customer: Choose location]
     │                  ↓
     │        [AI: Call book_appointment with location_id]
     │                  │
     └──────────────────┘
            ↓
   ┌──────────────────┐
   │  Check Staff     │
   └────────┬─────────┘
            │
     ┌──────┴──────┐
     │             │
   [1 Staff]  [Multiple Staff]
     │             │
     │        ┌────┴────────────────────┐
     │        │ Return needs_selection  │
     │        │ type: 'staff'           │
     │        └─────────┬───────────────┘
     │                  ↓
     │        [AI: Call get_staff_list]
     │                  ↓
     │        [AI: Present all staff]
     │                  ↓
     │        [AI: Wait for customer response]
     │                  ↓
     │        [Customer: Choose staff OR say "any"]
     │                  ↓
     │        [AI: Call book_appointment with staff_id]
     │                  │
     └──────────────────┘
            ↓
   ┌──────────────────┐
   │ Create Booking   │
   └────────┬─────────┘
            ↓
   [Return success: true]
            ↓
   [AI: Confirm to customer]
```

---

## Detailed Interaction Examples

### Scenario 1: Single Location, Multiple Staff

```
Customer: "I want to book a full groom tomorrow at 2pm"
    ↓
AI: [Calls book_appointment without location_id or staff_id]
    ← Returns: {
        success: false,
        needs_selection: {
          type: 'staff',
          location_id: '12345',
          location_name: 'Main Salon',
          options: [
            { id: 'staff1', name: 'Sarah' },
            { id: 'staff2', name: 'Mike' }
          ]
        }
      }
    ↓
AI: [Calls get_staff_list with service_name and location_id]
    ← Returns: { staff: [...] }
    ↓
AI: "We have 2 groomers available at Main Salon:
     - Sarah
     - Mike
     Do you have a preference?"
    ↓
Customer: "Sarah please"
    ↓
AI: [Calls book_appointment with staff_id='staff1']
    ← Returns: { success: true, appointment_id: '...' }
    ↓
AI: "Perfect! I've booked your full groom with Sarah 
     tomorrow at 2:00 PM at Main Salon. 
     Confirmation ID: #ABC123"
```

### Scenario 2: Multiple Locations, Single Staff per Location

```
Customer: "Book a bath and brush for Friday at 10am"
    ↓
AI: [Calls book_appointment without location_id]
    ← Returns: {
        success: false,
        needs_selection: {
          type: 'location',
          options: [
            { id: 'loc1', name: 'Downtown', address: '123 Main St' },
            { id: 'loc2', name: 'Westside', address: '456 Oak Ave' },
            { id: 'loc3', name: 'Eastside', address: '789 Pine Rd' }
          ]
        }
      }
    ↓
AI: [Calls get_location_choices with service_name]
    ← Returns: { locations: [...] }
    ↓
AI: "We have 3 locations that offer Bath & Brush:
     1. Downtown - 123 Main St
     2. Westside - 456 Oak Ave
     3. Eastside - 789 Pine Rd
     Which location works best for you?"
    ↓
Customer: "Westside"
    ↓
AI: [Calls book_appointment with location_id='loc2']
    ← Returns: { success: true, appointment_id: '...' }
         (Only 1 staff at Westside, auto-assigned)
    ↓
AI: "Great! Your bath & brush is booked for Friday 
     at 10:00 AM at Westside (456 Oak Ave).
     Confirmation ID: #DEF456"
```

### Scenario 3: Multiple Locations AND Multiple Staff

```
Customer: "I need a nail trim for Monday at 3pm"
    ↓
AI: [Calls book_appointment]
    ← Returns: needs_selection type='location'
    ↓
AI: [Presents locations]
    ↓
Customer: "Downtown"
    ↓
AI: [Calls book_appointment with location_id]
    ← Returns: needs_selection type='staff'
    ↓
AI: [Calls get_staff_list]
    ← Returns: { staff: [Sarah, Mike, Jennifer] }
    ↓
AI: "We have 3 groomers at Downtown who can do nail trims:
     - Sarah
     - Mike
     - Jennifer
     Do you have a preference?"
    ↓
Customer: "Any is fine"
    ↓
AI: [Calls book_appointment with staff_id='sarah_id']
    ← Returns: { success: true }
    ↓
AI: "Excellent! I've booked your nail trim with Sarah
     for Monday at 3:00 PM at Downtown.
     Confirmation ID: #GHI789"
```

---

## Code Flow Diagram

### book_appointment Tool Handler

```javascript
async book_appointment(params, context) {
  // 1. Get booking context
  const bookingCtx = await getBookingContext({
    companyId: context.company_id,
    serviceName: params.service_name,
    preferredLocationId: params.location_id,  // ← May be undefined
    preferredStaffId: params.staff_id         // ← May be undefined
  });

  // 2. Check location selection
  if (bookingCtx.locationOptions.length > 1 && !params.location_id) {
    return {
      success: false,
      needs_selection: {
        type: 'location',
        options: bookingCtx.locationOptions,
        message: 'LOCATION SELECTION REQUIRED...'
      }
    };
  }

  // 3. Check staff selection  
  if (bookingCtx.qualifiedStaffIds.length > 1 && !params.staff_id) {
    return {
      success: false,
      needs_selection: {
        type: 'staff',
        location_id: bookingCtx.locationId,
        location_name: bookingCtx.location.name,
        options: bookingCtx.staffOptions,
        message: 'STAFF SELECTION REQUIRED...'
      }
    };
  }

  // 4. Proceed with booking (all selections made)
  const appointment = await BookingService.createAppointment({
    locationId: bookingCtx.locationId,
    staffId: bookingCtx.qualifiedStaffIds[0],
    ...otherData
  });

  return {
    success: true,
    appointment_id: appointment._id,
    ...confirmationDetails
  };
}
```

### getBookingContext Function

```javascript
async getBookingContext(params) {
  // ... fetch company, service, etc.

  // Get all active locations
  const locations = await Location.find({ companyId, active: true });
  
  const locationOptions = locations.map(loc => ({
    id: String(loc._id),
    name: loc.name,
    address: loc.address,
    isMain: loc.isMain
  }));

  let locationId;
  let location;

  if (params.preferredLocationId) {
    // Customer specified a location - use it
    location = locations.find(loc => 
      String(loc._id) === params.preferredLocationId
    );
    locationId = String(location._id);
  } else if (locations.length === 1) {
    // Only one location - auto-select OK
    location = locations[0];
    locationId = String(location._id);
  } else {
    // Multiple locations - use main as temporary reference
    // Caller MUST check locationOptions.length and ask customer
    location = locations.find(loc => loc.isMain) || locations[0];
    locationId = String(location._id);
  }

  // Get qualified staff for the location
  const qualifiedStaff = await getQualifiedStaff(
    serviceId,
    locationId,
    params.preferredStaffId
  );

  return {
    locationOptions,    // ← All available locations
    locationId,         // ← Selected or temporary location
    location,           // ← Location details
    qualifiedStaff,     // ← Filtered by location
    staffOptions,       // ← All qualified staff
    // ... other data
  };
}
```

---

## Decision Tree

```
                    Customer Books Appointment
                              │
                              ↓
                    [Call book_appointment]
                              │
                              ↓
                  ┌───────────┴───────────┐
                  │                       │
          location_id provided?     location_id missing
                  │                       │
                  ↓                       ↓
                 YES              ┌──────────────┐
                  │               │ Multiple     │
                  │               │ Locations?   │
                  │               └──┬────────┬──┘
                  │                  │        │
                  │                 YES      NO (1 location)
                  │                  │        │
                  │                  ↓        │
                  │      [Return needs_selection]  │
                  │      [AI asks customer]   │
                  │                  │        │
                  │      [Customer chooses]   │
                  │                  │        │
                  │                  ↓        │
                  └──────────────────┴────────┘
                              │
                              ↓
                      [Location Selected]
                              │
                              ↓
                  ┌───────────┴───────────┐
                  │                       │
          staff_id provided?       staff_id missing
                  │                       │
                  ↓                       ↓
                 YES              ┌──────────────┐
                  │               │ Multiple     │
                  │               │ Staff?       │
                  │               └──┬────────┬──┘
                  │                  │        │
                  │                 YES      NO (1 staff)
                  │                  │        │
                  │                  ↓        │
                  │      [Return needs_selection]  │
                  │      [AI asks customer]   │
                  │                  │        │
                  │      [Customer chooses    │
                  │       OR says "any"]     │
                  │                  │        │
                  │                  ↓        │
                  └──────────────────┴────────┘
                              │
                              ↓
                    [Both Selections Made]
                              │
                              ↓
                     [Create Appointment]
                              │
                              ↓
                      [Return success: true]
```

---

## State Diagram

```
┌─────────────────┐
│ Initial Request │
│  (No location   │
│   No staff)     │
└────────┬────────┘
         ↓
┌────────────────────┐
│ NEEDS_LOCATION     │◄───────┐
│ Waiting for        │        │
│ customer choice    │        │
└────────┬───────────┘        │
         ↓                    │
    [Customer chooses]        │
         ↓                    │
┌────────────────────┐        │
│ LOCATION_SELECTED  │        │
│ Has location_id    │        │
│ (No staff yet)     │        │
└────────┬───────────┘        │
         ↓                    │
┌────────────────────┐        │
│ Check Staff Count  │        │
└────┬───────────────┘        │
     │                        │
     ├─[1 staff]─────────────┐│
     │                       ││
     └─[Multiple staff]      ││
         ↓                   ││
┌────────────────────┐       ││
│ NEEDS_STAFF        │       ││
│ Waiting for        │       ││
│ customer choice    │       ││
└────────┬───────────┘       ││
         ↓                   ││
    [Customer chooses        ││
     OR says "any"]          ││
         ↓                   ││
┌────────────────────┐       ││
│ STAFF_SELECTED     │◄──────┘│
│ Has staff_id       │        │
└────────┬───────────┘        │
         ↓                    │
┌────────────────────┐        │
│ READY_TO_BOOK      │        │
│ Has location_id    │        │
│ Has staff_id       │        │
└────────┬───────────┘        │
         ↓                    │
┌────────────────────┐        │
│ CREATE_APPOINTMENT │        │
└────────┬───────────┘        │
         ↓                    │
┌────────────────────┐        │
│ COMPLETED          │        │
│ Booking confirmed  │        │
└────────────────────┘        │
                              │
                     [On Error: Retry]
```

---

## Error Handling

```
AI Calls book_appointment
      ↓
   ┌──────────────────┐
   │ Try Booking      │
   └────────┬─────────┘
            │
     ┌──────┴──────┬──────────┬───────────┐
     │             │          │           │
  Success    needs_selection  Error    needs_info
     │             │          │           │
     ↓             ↓          ↓           ↓
[Confirm]  [Ask customer] [Retry]  [Ask for info]
              ↓              ↓           ↓
      [Customer chooses] [Handle]  [Get name/phone]
              ↓              ↓           ↓
        [Retry book]    [Suggest   [Retry book]
              │          times]         │
              └────────────┴────────────┘
                          ↓
                      [Success]
                          ↓
                    [Confirm to customer]
```

---

## Tool Call Sequence

### Scenario: Multiple Locations & Staff

```
Turn 1:
  User → "Book full groom tomorrow at 2pm"
  
Turn 2 (AI):
  Tool Call 1: book_appointment(
    appointment_time: "tomorrow at 2pm",
    service_name: "Full Groom"
  )
  Result: { needs_selection: { type: 'location', options: [...] } }
  
Turn 3 (AI):
  Tool Call 2: get_location_choices(
    service_name: "Full Groom"
  )
  Result: { locations: [Downtown, Westside, Eastside] }
  
  AI → "We have 3 locations: Downtown, Westside, Eastside. 
        Which would you prefer?"

Turn 4:
  User → "Downtown"
  
Turn 5 (AI):
  Tool Call 3: book_appointment(
    appointment_time: "tomorrow at 2pm",
    service_name: "Full Groom",
    location_id: "loc_downtown_123"
  )
  Result: { needs_selection: { type: 'staff', options: [...] } }
  
Turn 6 (AI):
  Tool Call 4: get_staff_list(
    service_name: "Full Groom",
    location_id: "loc_downtown_123"
  )
  Result: { staff: [Sarah, Mike] }
  
  AI → "We have 2 groomers: Sarah and Mike. 
        Do you have a preference?"

Turn 7:
  User → "Sarah"
  
Turn 8 (AI):
  Tool Call 5: book_appointment(
    appointment_time: "tomorrow at 2pm",
    service_name: "Full Groom",
    location_id: "loc_downtown_123",
    staff_id: "staff_sarah_456"
  )
  Result: { success: true, appointment_id: "apt_789" }
  
  AI → "Perfect! Booked with Sarah tomorrow at 2 PM 
        at Downtown. Confirmation: #789"
```

**Total Tool Calls**: 5
- 1x book_appointment (needs location)
- 1x get_location_choices
- 1x book_appointment (needs staff)
- 1x get_staff_list
- 1x book_appointment (success)

---

## Summary

✅ **Never Auto-Assign**: System always asks when multiple options exist
✅ **Customer Choice**: Customer explicitly chooses location and/or staff  
✅ **Graceful Degradation**: Auto-selects when only one option exists
✅ **Clear Communication**: AI presents all options with details
✅ **Flexible Input**: Customer can say "any" for staff selection
✅ **Error Recovery**: Handles missing info, conflicts, and retries

🚫 **Prohibited**: Silent auto-assignment to main location or first staff
🚫 **Prohibited**: Proceeding without customer confirmation
🚫 **Prohibited**: Assuming customer preferences without asking

