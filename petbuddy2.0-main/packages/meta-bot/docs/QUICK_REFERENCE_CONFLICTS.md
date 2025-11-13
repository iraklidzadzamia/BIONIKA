# Booking Conflicts - Quick Reference

## TL;DR

When all staff are unavailable, the system now returns structured JSON (not an error) and Gemini automatically shows alternative times.

## Code Locations

| Component | File | Lines |
|-----------|------|-------|
| Conflict detection & metadata | `lib/toolHandlers.js` | 394-579 |
| AI instructions | `langgraph/nodes/geminiAgent.js` | 379-406, 144-147 |
| Tests | `langgraph/__tests__/bookingConflict.test.js` | All |
| Documentation | `BOOKING_CONFLICT_IMPROVEMENTS.md` | All |

## Response Format

### Success (Staff Available)
```json
{
  "success": true,
  "appointment_id": "690a8ef21bd5305d1fcd67bf",
  "appointment_date": "2025-11-06",
  "start_time": "09:00",
  "end_time": "09:20"
}
```

### Conflict (All Staff Unavailable)
```json
{
  "success": false,
  "conflict": true,
  "all_staff_unavailable": true,
  "service_name": "Cat Nail Trim",
  "requested_date": "2025-11-06",
  "requested_time": "09:00",
  "qualified_staff_count": 2,
  "conflict_metadata": {
    "requestedTime": { "date": "...", "start": "...", "end": "..." },
    "failedStaffCount": 2,
    "conflicts": [
      { "staffId": "...", "reason": "booking_conflict", "message": "..." }
    ]
  },
  "suggested_action": "call_get_available_times",
  "get_available_times_params": {
    "service_name": "Cat Nail Trim",
    "appointment_date": "2025-11-06",
    "pet_size": null
  }
}
```

## Conflict Reasons

| Reason | Meaning | Action |
|--------|---------|--------|
| `booking_conflict` | Staff has overlapping appointment | Try next staff |
| `booking_hold_exists` | Time slot temporarily reserved | Try next staff |
| `RESOURCE_CONFLICT` | Equipment unavailable | Throw error (no retry) |
| `STAFF_NOT_QUALIFIED` | Staff lacks service qualification | Throw error (no retry) |

## Testing

### Unit Tests
```bash
npm test -- bookingConflict.test.js
```

### Manual Test
1. Pre-book all staff for tomorrow at 9:00 AM
2. Try to book: "Cat Nail Trim tomorrow at 9:00"
3. Verify bot shows alternative times automatically

### Expected Logs
```
[book_appointment] Trying staff 1/2: [id]
[book_appointment] ❌ Staff 1/2 unavailable: Overlapping appointment
[book_appointment] Trying staff 2/2: [id]
[book_appointment] ❌ Staff 2/2 unavailable: Overlapping appointment
[book_appointment] ❌ All 2 qualified staff are unavailable
[gemini-tool-detection] Gemini detected 1 tool calls
[tool-executor] Executing get_available_times
```

## Key Metrics

Monitor these in production:

```javascript
// Conflict rate
const conflictRate = conflicts / totalBookingAttempts;

// Recovery rate
const recoveryRate = subsequentBookings / conflicts;

// Average time to recovery
const avgRecoveryTime = sum(timeToBooking) / recoveries;
```

## Debugging

### Check if conflict response is correct
```bash
grep "all_staff_unavailable.*true" logs/meta-bot.log | jq '.'
```

### Verify tool chain
```bash
grep -A10 "all_staff_unavailable" logs/meta-bot.log | grep "get_available_times"
```

### View conflict metadata
```bash
grep "conflict_metadata" logs/meta-bot.log | jq '.conflict_metadata'
```

## Common Issues

### Issue: Bot still says "sorry, can't book"
**Cause**: Gemini not detecting conflict response
**Fix**: Check system prompt includes "BOOKING CONFLICT HANDLING" section

### Issue: Bot doesn't call get_available_times
**Cause**: Missing or malformed `suggested_action` field
**Fix**: Verify toolHandlers.js returns `suggested_action: "call_get_available_times"`

### Issue: Conflict metadata empty
**Cause**: Staff iteration not tracking conflicts
**Fix**: Check `conflictMetadata.conflicts.push()` calls in staff loop

## Related Commands

```bash
# View recent conflicts
tail -f logs/meta-bot.log | grep "all_staff_unavailable"

# Count conflicts today
grep "$(date +%Y-%m-%d)" logs/meta-bot.log | grep -c "all_staff_unavailable"

# Test conflict response format
node -e "const h = require('./lib/toolHandlers.js'); console.log(h)"
```

## Support

- Full docs: [BOOKING_CONFLICT_IMPROVEMENTS.md](../../BOOKING_CONFLICT_IMPROVEMENTS.md)
- Flow diagram: [booking-conflict-flow.md](booking-conflict-flow.md)
- Tests: [bookingConflict.test.js](../langgraph/__tests__/bookingConflict.test.js)
