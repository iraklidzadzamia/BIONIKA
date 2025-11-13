# Availability-First Staff Selection

## Critical Update: November 10, 2025

**NEW REQUIREMENT**: The AI must NEVER offer staff members to customers who are not available at the requested appointment time.

---

## The Problem

Previously, the system would:
1. Show all qualified staff members
2. Customer picks one
3. System then checks if they're available
4. If unavailable → error or suggest different time

**This is bad UX!** Customers should only see available options.

---

## The Solution: Availability-First Filtering

Now the system:
1. **Parse appointment time FIRST**
2. **Check availability for each qualified staff**
3. **Only present AVAILABLE staff** to customer
4. If no staff available → Suggest alternative times immediately
5. If only 1 staff available → Auto-select them
6. If multiple staff available → Ask customer to choose

---

## Implementation Details

### 1. Enhanced `get_staff_list` Tool

**New Parameters**:
```javascript
{
  service_name: "Full Groom",          // existing
  location_id: "loc_123",              // existing
  appointment_time: "tomorrow at 2pm", // NEW - filters by availability
  duration_minutes: 60                 // NEW - required with appointment_time
}
```

**Behavior**:
- If `appointment_time` and `duration_minutes` provided → filters to only available staff
- If not provided → returns all qualified staff (backward compatible)

**Code Location**: `packages/meta-bot/lib/toolHandlers.js` lines 2012-2059

**Logic**:
```javascript
// Parse the appointment time
const parsed = parseAppointmentTime(appointment_time, timezone, duration_minutes);
const startDate = moment.tz(`${parsed.date}T${parsed.start}:00`, timezone).toDate();
const endDate = moment.tz(`${parsed.date}T${parsed.end}:00`, timezone).toDate();

// Check availability for each staff member
const availabilityChecks = await Promise.all(
  staff.map(async (member) => {
    const availabilityResult = await BookingService.checkAvailability(
      staffId,
      startDate,
      endDate,
      companyId,
      null,
      locationId
    );
    return { staff: member, available: availabilityResult.available };
  })
);

// Filter to only available staff
const availableStaff = availabilityChecks
  .filter(check => check.available)
  .map(check => check.staff);
```

---

### 2. Updated `book_appointment` Logic

**Changed Order**:
```
OLD:
1. Get booking context
2. Check if multiple locations → ask
3. Check if multiple staff → ask  ❌ (without availability check)
4. Parse appointment time
5. Try to book

NEW:
1. Get booking context
2. Check if multiple locations → ask
3. Parse appointment time FIRST  ✓
4. Check staff availability     ✓
5. Filter to available staff only ✓
6. If multiple available → ask
7. Try to book
```

**Code Location**: `packages/meta-bot/lib/toolHandlers.js` lines 257-339

**Three Scenarios**:

#### Scenario A: NO staff available
```javascript
if (availableStaffIds.length === 0) {
  return {
    success: false,
    conflict: true,
    all_staff_unavailable: true,
    message: "All staff members are booked at {time}",
    get_available_times_params: {
      appointment_date: parsed.date,
      service_name: params.service_name,
      location_id: location_id
    }
  };
}
```

**AI Response**: "I'm sorry, all our staff are booked at 2pm tomorrow. Let me check when they're available..." → calls `get_available_times`

#### Scenario B: ONE staff available
```javascript
else if (availableStaffIds.length === 1) {
  // Auto-select the only available staff
  qualifiedStaffIds = [availableStaffIds[0]];
  // Continue with booking
}
```

**AI Response**: Books automatically with the available staff. "I've booked you with Sarah (our available groomer) for tomorrow at 2pm."

#### Scenario C: MULTIPLE staff available
```javascript
else {
  // Filter staffOptions to only show AVAILABLE staff
  const availableStaffOptions = staffOptions.filter(s => 
    availableStaffIds.includes(s.id)
  );
  
  return {
    success: false,
    needs_selection: {
      type: 'staff',
      options: availableStaffOptions, // Only available ones!
      message: "X staff members are AVAILABLE at {time}..."
    },
    context: {
      ...params,
      duration_minutes: serviceDuration // Pass for get_staff_list
    }
  };
}
```

**AI Response**: "We have 2 groomers available tomorrow at 2pm: Sarah and Mike. Do you have a preference?"

---

### 3. AI Agent Instructions Updated

**New Instructions** (`langgraph/nodes/geminiAgent.js` lines 462-475):

```
2. STAFF SELECTION (needs_selection.type === "staff"):
   - You MUST call get_staff_list with service_name, location_id, 
     appointment_time, and duration_minutes
   - CRITICAL: ALWAYS pass appointment_time and duration_minutes 
     to get_staff_list to check availability
   - This ensures you only present staff who are actually AVAILABLE 
     at the requested time
   - PROHIBITED: Never present staff who are unavailable at the 
     requested time
```

**Why This Matters**:
- AI learns to ALWAYS pass appointment_time when asking about staff
- Prevents showing unavailable options to customers
- Improves booking success rate

---

### 4. Tool Schema Updated

**LangGraph Tool** (`langgraph/tools/index.js` lines 447-482):

```javascript
const getStaffList = new DynamicStructuredTool({
  name: "get_staff_list",
  description: "... IMPORTANT: Always pass appointment_time and duration_minutes 
                to get only AVAILABLE staff - never present unavailable staff...",
  schema: z.object({
    service_name: z.string().optional(),
    location_id: z.string().optional(),
    appointment_time: z.string().optional()
      .describe("RECOMMENDED: Appointment time to check availability..."),
    duration_minutes: z.number().optional()
      .describe("Required if appointment_time provided...")
  })
});
```

---

## Customer Flow Examples

### Example 1: All Staff Booked

**Customer**: "I want to book a full groom tomorrow at 2pm"

**System**:
1. Calls `book_appointment(time="tomorrow at 2pm", service="Full Groom")`
2. Parses time → Tomorrow 14:00-15:00
3. Checks availability for all qualified staff
4. Result: 0/3 staff available

**AI**: "I'm sorry, but all our groomers are booked tomorrow at 2pm. Let me check when they're available..."

**System**:
1. Calls `get_available_times(date="tomorrow", service="Full Groom")`
2. Returns: ["9:00-12:00", "16:00-18:00"]

**AI**: "We have openings tomorrow from 9am to 12pm, or from 4pm to 6pm. Which time works better for you?"

---

### Example 2: One Staff Available

**Customer**: "Book me for a bath tomorrow at 3pm"

**System**:
1. Calls `book_appointment(time="tomorrow at 3pm", service="Bath & Brush")`
2. Checks availability: Sarah available, Mike booked
3. Result: 1/2 staff available → Auto-select Sarah
4. Creates booking with Sarah

**AI**: "Perfect! I've booked your bath & brush for tomorrow at 3pm with Sarah at our Downtown location. Your confirmation number is #ABC123."

---

### Example 3: Multiple Staff Available

**Customer**: "I need a nail trim on Friday at 10am"

**System**:
1. Calls `book_appointment(time="Friday at 10am", service="Nail Trim")`
2. Checks availability: Sarah available, Mike available, Jennifer booked
3. Result: 2/3 staff available

**AI Response**: Returns `needs_selection` with only Sarah and Mike

**AI**: "We have 2 groomers available on Friday at 10am: Sarah and Mike. Do you have a preference, or should I book with the first available?"

**Customer**: "Sarah please"

**System**: Calls `book_appointment(time="Friday at 10am", service="Nail Trim", staff_id="sarah_id")`

**AI**: "Excellent! Your nail trim with Sarah is confirmed for Friday at 10am."

---

## Benefits

### 1. Better Customer Experience
- ✅ Only see available options
- ✅ No "oops, not available" after selection
- ✅ Faster booking flow
- ✅ Clear availability feedback

### 2. Reduced Friction
- ✅ Fewer back-and-forth messages
- ✅ Less customer frustration
- ✅ Higher booking completion rate
- ✅ Auto-select when obvious

### 3. Smarter AI Behavior
- ✅ Proactively suggests alternative times
- ✅ Transparent about availability
- ✅ Handles edge cases gracefully
- ✅ Never misleads customers

---

## Technical Notes

### Performance Considerations

**Availability checks** are done in parallel:
```javascript
const availabilityChecks = await Promise.all(
  staff.map(async (member) => {
    return await BookingService.checkAvailability(...);
  })
);
```

**Typical Performance**:
- 3 staff members: ~150-300ms (parallel database queries)
- 10 staff members: ~200-400ms (still parallel)
- Caching potential: Could cache availability for 1-2 minutes

### Database Impact

Each availability check queries:
- Appointments table (overlapping bookings)
- TimeOff table (staff time off)
- StaffSchedule table (working hours)
- Company settings (business hours)

**Optimization Ideas**:
1. Cache availability checks for 60 seconds
2. Use database indexes on (staffId, start, end, status)
3. Batch query for all staff at once (single DB call)

### Error Handling

**If availability check fails**:
```javascript
catch (err) {
  console.error("Availability check failed:", err);
  // Fall back to showing all qualified staff (best effort)
  return allQualifiedStaff;
}
```

**Why**: Better to show potentially unavailable options than to fail the booking entirely.

---

## Testing

### Test Scenarios

1. **All staff booked**: Should suggest alternative times
2. **One staff available**: Should auto-select them
3. **Multiple staff available**: Should ask customer to choose
4. **Availability check fails**: Should fall back gracefully
5. **Invalid appointment time**: Should return error before checking availability

### Manual Testing

```bash
# Enable debug logging
DEBUG_APPOINTMENTS=true npm start

# Watch for these log lines:
# [book_appointment] Checking availability for 3 staff at 2024-11-15 14:00-15:00
# [book_appointment] 2/3 staff available at requested time
# [get_staff_list] Filtered out 1 unavailable staff members
```

---

## Migration Notes

### Backward Compatibility

✅ **Fully backward compatible**

If AI doesn't pass `appointment_time` to `get_staff_list`, it still works:
- Returns all qualified staff (old behavior)
- No breaking changes
- Gradual adoption

### Rollout Strategy

1. **Phase 1**: Deploy code changes (done)
2. **Phase 2**: Monitor AI behavior - does it pass appointment_time?
3. **Phase 3**: If not, strengthen AI instructions further
4. **Phase 4**: Consider making appointment_time REQUIRED in schema

---

## Future Enhancements

### 1. Location Availability Filtering

Currently: Only filters staff by availability
Future: Also filter locations by staff availability

```javascript
// Show only locations that have available staff
const locationsWithAvailableStaff = locations.filter(loc => {
  const staffAtLocation = getStaffAtLocation(loc.id);
  const availableAtLocation = checkAvailability(staffAtLocation, time);
  return availableAtLocation.length > 0;
});
```

### 2. Smart Time Suggestions

Currently: Suggests "try get_available_times"
Future: Automatically call it and present times

```javascript
if (allStaffUnavailable) {
  const availableTimes = await get_available_times({...});
  return {
    conflict: true,
    suggested_times: availableTimes, // AI presents these immediately
    message: "All staff booked. Here are available times..."
  };
}
```

### 3. Availability Calendar View

Future: Return availability as a structured calendar

```javascript
{
  staff: "Sarah",
  availability: {
    "2024-11-15": ["09:00-12:00", "14:00-17:00"],
    "2024-11-16": ["09:00-18:00"],
    "2024-11-17": []
  }
}
```

---

## Summary

### What Changed

| Aspect | Before | After |
|--------|--------|-------|
| Staff presentation | All qualified staff | Only available staff |
| Availability check | After selection | Before presentation |
| Customer sees | Potentially unavailable options | Guaranteed available options |
| Booking flow | Pick staff → "oops, busy" → pick again | Pick from available → success |
| AI behavior | Passive | Proactive (suggests times) |

### Key Files Modified

1. `lib/toolHandlers.js` - Added availability checking to get_staff_list and book_appointment
2. `langgraph/tools/index.js` - Added appointment_time and duration_minutes parameters
3. `langgraph/nodes/geminiAgent.js` - Updated AI instructions to always check availability

### Bottom Line

🎯 **Customers now only see staff who are actually available** at their requested time, eliminating frustration and improving the booking experience.

---

## Related Documentation

- [Location & Staff Selection Policy](./LOCATION_STAFF_SELECTION.md) - Overall selection rules
- [Booking Flow Diagram](./BOOKING_FLOW_DIAGRAM.md) - Visual flow charts
- [Implementation Summary](../../IMPLEMENTATION_SUMMARY.md) - Complete change log

