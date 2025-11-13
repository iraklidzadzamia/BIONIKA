# Quick Reference: Availability-First Booking

## TL;DR

✅ **DO**: Only show staff who are available at requested time
❌ **DON'T**: Show unavailable staff and deal with errors later

---

## For AI Developers

### When calling `get_staff_list`:

**BAD** ❌:
```javascript
get_staff_list({
  service_name: "Full Groom",
  location_id: "loc_123"
})
// Returns ALL qualified staff (might be unavailable)
```

**GOOD** ✅:
```javascript
get_staff_list({
  service_name: "Full Groom",
  location_id: "loc_123",
  appointment_time: "tomorrow at 2pm",  // ← ADD THIS
  duration_minutes: 60                   // ← AND THIS
})
// Returns ONLY available staff
```

---

## For Backend Developers

### book_appointment Flow:

```
1. Parse appointment time FIRST
   ↓
2. Check staff availability
   ↓
3. Filter to available staff only
   ↓
4. If 0 available → Return conflict + suggest times
   If 1 available → Auto-select
   If 2+ available → Ask customer
```

### Key Code Locations:

- **Availability check**: `toolHandlers.js` line 266-282
- **Staff filtering**: `toolHandlers.js` line 2012-2059
- **Auto-select logic**: `toolHandlers.js` line 304-310

---

## Decision Tree

```
Multiple qualified staff?
├─ NO → Use the one staff
└─ YES → Parse time & check availability
    ├─ 0 available → Suggest alternative times
    ├─ 1 available → Auto-select
    └─ 2+ available → Ask customer to choose
```

---

## Debug Checklist

If customers are seeing unavailable staff:

1. ☐ Check if AI is passing `appointment_time` to `get_staff_list`
2. ☐ Check if `duration_minutes` is also passed
3. ☐ Verify `BookingService.checkAvailability` is being called
4. ☐ Look for "[book_appointment] Checking availability" in logs
5. ☐ Check if availability checks are returning correct results

### Enable Debug Mode:
```bash
DEBUG_APPOINTMENTS=true npm start
```

### Look for these logs:
```
[book_appointment] Checking availability for 3 staff at 2024-11-15 14:00-15:00
[book_appointment] 2/3 staff available at requested time
[get_staff_list] Filtered out 1 unavailable staff members
```

---

## API Reference

### `get_staff_list` Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `service_name` | string | Optional | Filter by service qualification |
| `location_id` | string | Optional | Filter by location assignment |
| `appointment_time` | string | **Recommended** | Check availability at this time |
| `duration_minutes` | number | If time provided | Service duration for availability check |

### `book_appointment` Return Values

#### Scenario 1: All Staff Unavailable
```javascript
{
  success: false,
  conflict: true,
  all_staff_unavailable: true,
  message: "All staff members are booked at {time}",
  get_available_times_params: {
    appointment_date: "2024-11-15",
    service_name: "Full Groom",
    location_id: "loc_123"
  }
}
```

#### Scenario 2: Multiple Available
```javascript
{
  success: false,
  needs_selection: {
    type: 'staff',
    location_id: "loc_123",
    location_name: "Downtown",
    options: [
      { id: "staff1", name: "Sarah", ... },
      { id: "staff2", name: "Mike", ... }
    ],
    message: "2 staff members are available..."
  },
  context: {
    appointment_time: "tomorrow at 2pm",
    service_name: "Full Groom",
    location_id: "loc_123",
    duration_minutes: 60  // ← Pass this to get_staff_list
  }
}
```

---

## Common Mistakes

### ❌ Mistake 1: Not passing appointment_time
```javascript
// AI sees needs_selection but doesn't pass time to get_staff_list
get_staff_list({
  service_name: context.service_name,
  location_id: context.location_id
  // Missing: appointment_time & duration_minutes
})
```

**Fix**: Always include from context:
```javascript
get_staff_list({
  service_name: context.service_name,
  location_id: context.location_id,
  appointment_time: context.appointment_time,    // ✅
  duration_minutes: context.duration_minutes     // ✅
})
```

### ❌ Mistake 2: Checking availability after customer selects
```javascript
// OLD WAY:
1. Show all staff
2. Customer picks one
3. Check if available → ERROR!
```

**Fix**: Check before showing:
```javascript
// NEW WAY:
1. Check who's available
2. Show only available staff
3. Customer picks one → SUCCESS!
```

### ❌ Mistake 3: Not handling "all unavailable" scenario
```javascript
// AI doesn't know what to do when all staff are busy
if (result.all_staff_unavailable) {
  return "Sorry, no one is available"; // ❌ Unhelpful
}
```

**Fix**: Proactively suggest alternatives:
```javascript
if (result.all_staff_unavailable) {
  // Call get_available_times with provided params
  const times = await get_available_times(
    result.get_available_times_params
  );
  return `All staff are booked at that time. 
          We have openings at: ${times.join(", ")}`;
}
```

---

## Performance Tips

### Parallel Checks (Built-in ✅)
```javascript
// Already optimized - checks all staff in parallel
await Promise.all(
  staff.map(member => checkAvailability(member))
)
```

### Future: Add Caching
```javascript
// Cache availability for 60 seconds
const cacheKey = `avail:${staffId}:${date}:${time}`;
if (cached = await redis.get(cacheKey)) {
  return JSON.parse(cached);
}
```

### Future: Batch Query
```javascript
// Single DB query for all staff (not implemented yet)
const conflicts = await Appointment.find({
  staffId: { $in: allStaffIds },
  start: { $lt: endTime },
  end: { $gt: startTime }
});
```

---

## Testing Scenarios

### Scenario 1: Happy Path
```
1. Customer: "Book tomorrow at 2pm"
2. System: Checks Sarah (available), Mike (busy), Jennifer (available)
3. AI: "2 groomers available: Sarah and Jennifer. Your preference?"
4. Customer: "Sarah"
5. System: Books with Sarah ✅
```

### Scenario 2: All Busy
```
1. Customer: "Book tomorrow at 2pm"
2. System: Checks all staff → all busy
3. AI: "All booked at 2pm. Available 9am-12pm or 4pm-6pm?"
4. Customer: "4pm works"
5. System: Checks again at 4pm → presents available staff ✅
```

### Scenario 3: Only One Available
```
1. Customer: "Book tomorrow at 2pm"
2. System: Checks staff → only Sarah available
3. AI: "Booked with Sarah tomorrow at 2pm!" ✅
   (No need to ask customer when only one option)
```

---

## Files to Know

| File | What It Does |
|------|--------------|
| `lib/toolHandlers.js` | Core booking logic with availability checks |
| `langgraph/tools/index.js` | Tool schema definitions |
| `langgraph/nodes/geminiAgent.js` | AI instructions |
| `docs/AVAILABILITY_FIRST_SELECTION.md` | Full documentation |
| `AVAILABILITY_ENHANCEMENT_SUMMARY.md` | Implementation summary |

---

## One-Liner Summary

**Old Way**: Show everyone → customer picks → "oops, busy" → pick again 😞

**New Way**: Check who's available → show only them → customer picks → success! 😊

---

## Need Help?

1. **Read**: `/Users/alex/Desktop/Alex's Projects/petbuddy2.0/packages/meta-bot/docs/AVAILABILITY_FIRST_SELECTION.md`
2. **Debug**: `DEBUG_APPOINTMENTS=true npm start`
3. **Test**: Manual scenarios in documentation
4. **Check**: `[book_appointment]` and `[get_staff_list]` log entries



