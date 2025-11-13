import { createToolHandlers } from '../../lib/tools/index.js';
import { BookingService } from '../../../backend/src/services/bookingService.js';
import { Pet, Company, User, Appointment } from '@petbuddy/shared';

// Mock dependencies
jest.mock('../../../backend/src/services/bookingService.js');
jest.mock('../../services/contact.service.js');
jest.mock('../../lib/bookingContext.js');
jest.mock('../../lib/bookingHoldManager.js');
jest.mock('../../lib/authorization.js');

// Mock shared models
jest.mock('@petbuddy/shared', () => ({
  Pet: {
    findOne: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
  },
  Company: {
    findById: jest.fn(),
  },
  User: {
    find: jest.fn(),
  },
  ServiceCategory: {
    findOne: jest.fn(),
    find: jest.fn(),
  },
  ServiceItem: {
    findOne: jest.fn(),
    find: jest.fn(),
  },
  Location: {
    find: jest.fn(),
  },
  Appointment: {
    find: jest.fn(),
  },
}));

describe('Booking Conflict Handling', () => {
  let handlers;
  let mockContactService;
  let mockBookingContext;
  let mockBookingHoldManager;
  let mockAuthorization;

  const mockContext = {
    company_id: 'company123',
    chat_id: 'chat123',
    platform: 'facebook',
    timezone: 'America/New_York',
    working_hours: [
      { weekday: 1, startTime: '09:00', endTime: '18:00' }
    ],
  };

  const mockContact = {
    _id: 'contact123',
    fullName: 'John Doe',
    phone: '1234567890',
    contactStatus: 'customer',
  };

  const mockCompany = {
    _id: 'company123',
    timezone: 'America/New_York',
  };

  const mockBookingContextData = {
    company: mockCompany,
    timezone: 'America/New_York',
    workingHours: [{ weekday: 1, startTime: '09:00', endTime: '18:00' }],
    service: { name: 'Cat Nail Trim', _id: 'service123' },
    serviceId: 'service123',
    serviceItemId: 'item123',
    serviceDuration: 20,
    locationId: 'location123',
    qualifiedStaffIds: ['staff1', 'staff2'],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    handlers = createToolHandlers('facebook');
    mockContactService = require('../../services/contact.service.js');
    mockBookingContext = require('../../lib/bookingContext.js');
    mockBookingHoldManager = require('../../lib/bookingHoldManager.js');
    mockAuthorization = require('../../lib/authorization.js');

    // Setup default mocks
    mockContactService.getContactByChatId.mockResolvedValue(mockContact);
    mockBookingContext.getBookingContext.mockResolvedValue(mockBookingContextData);
    mockAuthorization.verifyAuthorization.mockResolvedValue(true);

    // Mock Pet.find to return an existing pet
    Pet.find.mockResolvedValue([
      { _id: 'pet123', name: 'Fluffy', species: 'cat' }
    ]);

    // Mock booking hold manager
    mockBookingHoldManager.createBookingHold.mockResolvedValue('hold123');
    mockBookingHoldManager.releaseBookingHold.mockResolvedValue(true);
  });

  describe('All staff unavailable - BOOKING_CONFLICT', () => {
    it('should return structured conflict response when all staff are booked', async () => {
      // Mock BookingService to throw BOOKING_CONFLICT for all staff
      BookingService.createAppointment = jest.fn()
        .mockRejectedValueOnce(Object.assign(
          new Error('Overlapping appointment'),
          { code: 'BOOKING_CONFLICT' }
        ))
        .mockRejectedValueOnce(Object.assign(
          new Error('Overlapping appointment'),
          { code: 'BOOKING_CONFLICT' }
        ));

      const result = await handlers.book_appointment(
        {
          appointment_time: 'tomorrow at 9:00',
          service_name: 'Cat Nail Trim',
          pet_name: 'Fluffy',
          pet_type: 'cat',
        },
        mockContext
      );

      // Verify structured response
      expect(result.success).toBe(false);
      expect(result.conflict).toBe(true);
      expect(result.all_staff_unavailable).toBe(true);
      expect(result.service_name).toBe('Cat Nail Trim');
      expect(result.qualified_staff_count).toBe(2);

      // Verify conflict metadata
      expect(result.conflict_metadata).toBeDefined();
      expect(result.conflict_metadata.failedStaffCount).toBe(2);
      expect(result.conflict_metadata.conflicts).toHaveLength(2);
      expect(result.conflict_metadata.conflicts[0].reason).toBe('booking_conflict');

      // Verify suggested action
      expect(result.suggested_action).toBe('call_get_available_times');
      expect(result.get_available_times_params).toEqual({
        service_name: 'Cat Nail Trim',
        appointment_date: expect.any(String),
        pet_size: null,
      });

      // Verify instructive message
      expect(result.message).toContain('BOOKING CONFLICT');
      expect(result.message).toContain('get_available_times');
      expect(result.message).toContain('Cat Nail Trim');
      expect(result.message).toContain('DO NOT just say');
    });

    it('should track booking hold conflicts in metadata', async () => {
      // First staff: booking hold exists
      mockBookingHoldManager.createBookingHold
        .mockRejectedValueOnce(Object.assign(
          new Error('Booking hold already exists'),
          { code: 'BOOKING_HOLD_EXISTS' }
        ))
        .mockResolvedValueOnce('hold124');

      // Second staff: booking conflict
      BookingService.createAppointment = jest.fn()
        .mockRejectedValueOnce(Object.assign(
          new Error('Overlapping appointment'),
          { code: 'BOOKING_CONFLICT' }
        ));

      const result = await handlers.book_appointment(
        {
          appointment_time: 'tomorrow at 9:00',
          service_name: 'Cat Nail Trim',
        },
        mockContext
      );

      // Verify both types of conflicts are tracked
      expect(result.conflict_metadata.failedStaffCount).toBe(2);
      expect(result.conflict_metadata.conflicts[0].reason).toBe('booking_hold_exists');
      expect(result.conflict_metadata.conflicts[1].reason).toBe('booking_conflict');
    });

    it('should not throw error when all staff unavailable', async () => {
      // All staff have conflicts
      BookingService.createAppointment = jest.fn()
        .mockRejectedValue(Object.assign(
          new Error('Overlapping appointment'),
          { code: 'BOOKING_CONFLICT' }
        ));

      // Should not throw, should return structured response
      await expect(
        handlers.book_appointment(
          {
            appointment_time: 'tomorrow at 14:00',
            service_name: 'Cat Nail Trim',
          },
          mockContext
        )
      ).resolves.toBeDefined();
    });

    it('should include requested time details in conflict response', async () => {
      BookingService.createAppointment = jest.fn()
        .mockRejectedValue(Object.assign(
          new Error('Overlapping appointment'),
          { code: 'BOOKING_CONFLICT' }
        ));

      const result = await handlers.book_appointment(
        {
          appointment_time: 'tomorrow at 14:30',
          service_name: 'Cat Nail Trim',
        },
        mockContext
      );

      expect(result.requested_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.requested_time).toBe('14:30');
      expect(result.requested_end).toBe('14:50'); // 20 min duration
      expect(result.conflict_metadata.requestedTime.start).toBe('14:30');
    });
  });

  describe('Partial staff availability', () => {
    it('should succeed with second staff when first staff is unavailable', async () => {
      // First staff: conflict
      // Second staff: success
      BookingService.createAppointment = jest.fn()
        .mockRejectedValueOnce(Object.assign(
          new Error('Overlapping appointment'),
          { code: 'BOOKING_CONFLICT' }
        ))
        .mockResolvedValueOnce({
          _id: 'appointment123',
          start: new Date(),
          end: new Date(),
        });

      const result = await handlers.book_appointment(
        {
          appointment_time: 'tomorrow at 9:00',
          service_name: 'Cat Nail Trim',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.appointment_id).toBe('appointment123');
      expect(BookingService.createAppointment).toHaveBeenCalledTimes(2);
    });

    it('should release booking hold on conflict before trying next staff', async () => {
      BookingService.createAppointment = jest.fn()
        .mockRejectedValueOnce(Object.assign(
          new Error('Overlapping appointment'),
          { code: 'BOOKING_CONFLICT' }
        ))
        .mockResolvedValueOnce({
          _id: 'appointment123',
          start: new Date(),
          end: new Date(),
        });

      await handlers.book_appointment(
        {
          appointment_time: 'tomorrow at 9:00',
          service_name: 'Cat Nail Trim',
        },
        mockContext
      );

      // Verify booking hold was released after first staff failed
      expect(mockBookingHoldManager.releaseBookingHold).toHaveBeenCalledWith(
        'hold123',
        expect.objectContaining({
          chatId: 'chat123',
          platform: 'facebook',
        })
      );
    });
  });

  describe('Non-conflict errors', () => {
    it('should throw error for RESOURCE_CONFLICT without iterating staff', async () => {
      // Simulate resource conflict (e.g., equipment unavailable)
      BookingService.createAppointment = jest.fn()
        .mockRejectedValueOnce(Object.assign(
          new Error('Required equipment unavailable'),
          { code: 'RESOURCE_CONFLICT' }
        ));

      await expect(
        handlers.book_appointment(
          {
            appointment_time: 'tomorrow at 9:00',
            service_name: 'Cat Nail Trim',
          },
          mockContext
        )
      ).rejects.toThrow('RESOURCE CONFLICT');

      // Should only try once, not iterate through all staff
      expect(BookingService.createAppointment).toHaveBeenCalledTimes(1);
    });

    it('should throw error for STAFF_NOT_QUALIFIED without iterating', async () => {
      BookingService.createAppointment = jest.fn()
        .mockRejectedValueOnce(Object.assign(
          new Error('Staff not qualified'),
          { code: 'STAFF_NOT_QUALIFIED' }
        ));

      await expect(
        handlers.book_appointment(
          {
            appointment_time: 'tomorrow at 9:00',
            service_name: 'Cat Nail Trim',
          },
          mockContext
        )
      ).rejects.toThrow('STAFF ERROR');

      expect(BookingService.createAppointment).toHaveBeenCalledTimes(1);
    });

    it('should throw error for unexpected booking service errors', async () => {
      BookingService.createAppointment = jest.fn()
        .mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(
        handlers.book_appointment(
          {
            appointment_time: 'tomorrow at 9:00',
            service_name: 'Cat Nail Trim',
          },
          mockContext
        )
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('Edge cases', () => {
    it('should handle single qualified staff member', async () => {
      // Only one staff member qualified
      mockBookingContext.getBookingContext.mockResolvedValueOnce({
        ...mockBookingContextData,
        qualifiedStaffIds: ['staff1'],
      });

      BookingService.createAppointment = jest.fn()
        .mockRejectedValueOnce(Object.assign(
          new Error('Overlapping appointment'),
          { code: 'BOOKING_CONFLICT' }
        ));

      const result = await handlers.book_appointment(
        {
          appointment_time: 'tomorrow at 9:00',
          service_name: 'Cat Nail Trim',
        },
        mockContext
      );

      expect(result.conflict).toBe(true);
      expect(result.qualified_staff_count).toBe(1);
      expect(result.conflict_metadata.failedStaffCount).toBe(1);
    });

    it('should handle many qualified staff members', async () => {
      // Five staff members, all unavailable
      mockBookingContext.getBookingContext.mockResolvedValueOnce({
        ...mockBookingContextData,
        qualifiedStaffIds: ['staff1', 'staff2', 'staff3', 'staff4', 'staff5'],
      });

      BookingService.createAppointment = jest.fn()
        .mockRejectedValue(Object.assign(
          new Error('Overlapping appointment'),
          { code: 'BOOKING_CONFLICT' }
        ));

      const result = await handlers.book_appointment(
        {
          appointment_time: 'tomorrow at 9:00',
          service_name: 'Cat Nail Trim',
        },
        mockContext
      );

      expect(result.qualified_staff_count).toBe(5);
      expect(result.conflict_metadata.conflicts).toHaveLength(5);
      expect(BookingService.createAppointment).toHaveBeenCalledTimes(5);
    });
  });
});
