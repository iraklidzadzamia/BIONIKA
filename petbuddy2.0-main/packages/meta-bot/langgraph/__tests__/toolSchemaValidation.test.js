import { z } from 'zod';

// Import the schema validation logic from the tools file
// Since the validation is embedded in the tool definition, we'll test the schema directly

describe('Tool Schema Validation', () => {
  describe('bookAppointment schema', () => {
    // Define the schema to match the improved validation in tools/index.js
    const bookAppointmentSchema = z
      .object({
        appointment_time: z
          .string()
          .min(1, "Appointment time is required")
          .max(200, "Appointment time description too long")
          .describe(
            "Appointment time in ENGLISH format: 'today', 'tomorrow', 'day after tomorrow', 'next [weekday]', weekday names, or 'YYYY-MM-DD'. Include the time (e.g., 'tomorrow at 14:00', 'next Monday at 3pm'). ALWAYS translate non-English phrases to English."
          ),
        service_name: z
          .string()
          .min(2, "Service name must be at least 2 characters")
          .max(100, "Service name too long")
          .describe(
            "Service name (e.g., 'Full Groom', 'Bath & Brush', 'Nail Trim'). Case-insensitive fuzzy matching supported."
          ),
        pet_size: z
          .enum(["S", "M", "L", "XL"])
          .optional()
          .describe(
            "Optional pet size: 'S' (small), 'M' (medium), 'L' (large), or 'XL' (extra large). Omit if unknown - system will use cheapest service item."
          ),
        pet_name: z
          .string()
          .max(50, "Pet name too long (max 50 characters)")
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
          .max(500, "Notes too long (max 500 characters)")
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
      );

    describe('appointment_time validation', () => {
      it('should accept valid relative date formats', () => {
        const validTimes = [
          'tomorrow at 2pm',
          'next Monday at 10:30',
          'today at 3:00 PM',
          'day after tomorrow at 14:00',
          'next friday at 9am',
          '2024-12-25 at 11:00',
        ];

        validTimes.forEach(time => {
          expect(() => bookAppointmentSchema.parse({
            appointment_time: time,
            service_name: 'Full Groom',
          })).not.toThrow();
        });
      });

      it('should reject invalid appointment times', () => {
        const invalidTimes = [
          '', // Empty
          'a', // Too short
          'sometime', // No time component
          'yesterday at 2pm', // Past date
          'invalid date format', // No recognizable date
          'next year at some point', // Too vague
        ];

        invalidTimes.forEach(time => {
          expect(() => bookAppointmentSchema.parse({
            appointment_time: time,
            service_name: 'Full Groom',
          })).toThrow('Invalid appointment time format');
        });
      });

      it('should reject past times for today appointments', () => {
        const now = new Date();
        const pastHour = now.getHours() - 1;
        const pastTime = `today at ${pastHour}:00`;

        expect(() => bookAppointmentSchema.parse({
          appointment_time: pastTime,
          service_name: 'Full Groom',
        })).toThrow('Invalid appointment time format');
      });

      it('should accept future times for today appointments', () => {
        const now = new Date();
        const futureHour = now.getHours() + 2; // 2 hours from now
        const futureTime = `today at ${futureHour}:00`;

        expect(() => bookAppointmentSchema.parse({
          appointment_time: futureTime,
          service_name: 'Full Groom',
        })).not.toThrow();
      });

      it('should reject overly long appointment time strings', () => {
        const longTimeString = 'a'.repeat(201); // Over 200 characters

        expect(() => bookAppointmentSchema.parse({
          appointment_time: longTimeString,
          service_name: 'Full Groom',
        })).toThrow('Appointment time description too long');
      });
    });

    describe('service_name validation', () => {
      it('should accept valid service names', () => {
        const validNames = [
          'Full Groom',
          'Bath & Brush',
          'Nail Trim Service',
          'AB', // Minimum 2 characters
        ];

        validNames.forEach(name => {
          expect(() => bookAppointmentSchema.parse({
            appointment_time: 'tomorrow at 2pm',
            service_name: name,
          })).not.toThrow();
        });
      });

      it('should reject invalid service names', () => {
        const invalidNames = [
          '', // Empty
          'A', // Too short (1 character)
        ];

        invalidNames.forEach(name => {
          expect(() => bookAppointmentSchema.parse({
            appointment_time: 'tomorrow at 2pm',
            service_name: name,
          })).toThrow();
        });
      });

      it('should reject overly long service names', () => {
        const longName = 'A'.repeat(101); // Over 100 characters

        expect(() => bookAppointmentSchema.parse({
          appointment_time: 'tomorrow at 2pm',
          service_name: longName,
        })).toThrow('Service name too long');
      });
    });

    describe('pet_size validation', () => {
      it('should accept valid pet sizes', () => {
        const validSizes = ['S', 'M', 'L', 'XL'];

        validSizes.forEach(size => {
          expect(() => bookAppointmentSchema.parse({
            appointment_time: 'tomorrow at 2pm',
            service_name: 'Full Groom',
            pet_size: size,
          })).not.toThrow();
        });
      });

      it('should reject invalid pet sizes', () => {
        const invalidSizes = ['XS', 'XXL', 'small', 'large', '1', ''];

        invalidSizes.forEach(size => {
          expect(() => bookAppointmentSchema.parse({
            appointment_time: 'tomorrow at 2pm',
            service_name: 'Full Groom',
            pet_size: size,
          })).toThrow();
        });
      });
    });

    describe('pet_name validation', () => {
      it('should accept valid pet names', () => {
        const validNames = [
          'Fluffy',
          'Max',
          'Mr. Whiskers',
          'A', // Single character
        ];

        validNames.forEach(name => {
          expect(() => bookAppointmentSchema.parse({
            appointment_time: 'tomorrow at 2pm',
            service_name: 'Full Groom',
            pet_name: name,
          })).not.toThrow();
        });
      });

      it('should reject overly long pet names', () => {
        const longName = 'A'.repeat(51); // Over 50 characters

        expect(() => bookAppointmentSchema.parse({
          appointment_time: 'tomorrow at 2pm',
          service_name: 'Full Groom',
          pet_name: longName,
        })).toThrow('Pet name too long');
      });
    });

    describe('pet_type validation', () => {
      it('should accept valid pet types', () => {
        const validTypes = ['dog', 'cat', 'other'];

        validTypes.forEach(type => {
          expect(() => bookAppointmentSchema.parse({
            appointment_time: 'tomorrow at 2pm',
            service_name: 'Full Groom',
            pet_type: type,
          })).not.toThrow();
        });
      });

      it('should reject invalid pet types', () => {
        const invalidTypes = ['bird', 'fish', 'DOG', 'Cat', ''];

        invalidTypes.forEach(type => {
          expect(() => bookAppointmentSchema.parse({
            appointment_time: 'tomorrow at 2pm',
            service_name: 'Full Groom',
            pet_type: type,
          })).toThrow();
        });
      });
    });

    describe('notes validation', () => {
      it('should accept valid notes', () => {
        const validNotes = [
          '',
          'First time grooming',
          'Dog is anxious around other pets',
          'Please be gentle with the tail',
        ];

        validNotes.forEach(notes => {
          expect(() => bookAppointmentSchema.parse({
            appointment_time: 'tomorrow at 2pm',
            service_name: 'Full Groom',
            notes,
          })).not.toThrow();
        });
      });

      it('should reject overly long notes', () => {
        const longNotes = 'A'.repeat(501); // Over 500 characters

        expect(() => bookAppointmentSchema.parse({
          appointment_time: 'tomorrow at 2pm',
          service_name: 'Full Groom',
          notes: longNotes,
        })).toThrow('Notes too long');
      });
    });
  });
});
