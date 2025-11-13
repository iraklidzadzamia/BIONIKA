import { createToolHandlers } from '../../lib/tools/index.js';
import { BookingService } from '../../../backend/src/services/bookingService.js';

// Mock dependencies
jest.mock('../../../backend/src/services/bookingService.js');
jest.mock('../../services/contact.service.js', () => ({
  getContactByChatId: jest.fn(),
  updateContactInfo: jest.fn(),
  convertContactToCustomer: jest.fn(),
}));

jest.mock('../../lib/bookingContext.js', () => ({
  getBookingContext: jest.fn(),
}));

jest.mock('../../utils/logger.js', () => ({
  messageFlow: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Tool Handlers - Booking Logic Error Handling', () => {
  let handlers;
  let mockBookingService;
  let mockContactService;
  let mockBookingContext;
  let mockLogger;

  const mockContext = {
    company_id: 'company123',
    chat_id: 'chat123',
    timezone: 'America/New_York',
    working_hours: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    handlers = createToolHandlers('facebook');
    mockBookingService = BookingService;
    mockContactService = require('../../services/contact.service.js');
    mockBookingContext = require('../../lib/bookingContext.js');
    mockLogger = require('../../utils/logger.js').messageFlow;
  });

  describe('book_appointment - pet handling error scenarios', () => {
    const validParams = {
      appointment_time: 'tomorrow at 2pm',
      service_name: 'Full Groom',
    };

    beforeEach(() => {
      // Mock successful booking context
      mockBookingContext.getBookingContext.mockResolvedValue({
        company: { _id: 'company123' },
        timezone: 'America/New_York',
        workingHours: [],
        service: { name: 'Full Groom' },
        serviceId: 'service123',
        serviceItemId: 'item123',
        serviceDuration: 60,
        locationId: 'location123',
        qualifiedStaffIds: ['staff1'],
      });

      // Mock contact lookup
      mockContactService.getContactByChatId.mockResolvedValue({
        _id: 'contact123',
        fullName: 'John Doe',
        phone: '1234567890',
        contactStatus: 'customer',
      });
    });

    describe('pet creation errors', () => {
      it('should handle database errors when finding existing pet', async () => {
        // Mock Pet.findOne to throw error
        const mockPetModel = {
          findOne: jest.fn().mockRejectedValue(new Error('Database connection failed')),
          create: jest.fn(),
          find: jest.fn(),
        };

        // Mock the Pet model in the handlers
        jest.doMock('@petbuddy/shared', () => ({
          Pet: mockPetModel,
          Company: { findById: jest.fn() },
          Location: { find: jest.fn() },
          ServiceCategory: { findOne: jest.fn(), find: jest.fn() },
          ServiceItem: { findOne: jest.fn(), find: jest.fn() },
          User: { find: jest.fn() },
          Appointment: { find: jest.fn() },
        }));

        const result = await handlers.book_appointment({
          ...validParams,
          pet_name: 'Fluffy',
          pet_type: 'dog',
        }, mockContext);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Failed to process pet information');
        expect(mockLogger.error).toHaveBeenCalledWith(
          '[book_appointment] Failed to handle pet data:',
          expect.any(Error)
        );
      });

      it('should handle database errors when creating new pet', async () => {
        // Mock Pet.findOne to return null (pet doesn't exist)
        // Mock Pet.create to throw error
        const mockPetModel = {
          findOne: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockRejectedValue(new Error('Failed to create pet')),
          find: jest.fn(),
        };

        jest.doMock('@petbuddy/shared', () => ({
          Pet: mockPetModel,
          Company: { findById: jest.fn() },
          Location: { find: jest.fn() },
          ServiceCategory: { findOne: jest.fn(), find: jest.fn() },
          ServiceItem: { findOne: jest.fn(), find: jest.fn() },
          User: { find: jest.fn() },
          Appointment: { find: jest.fn() },
        }));

        const result = await handlers.book_appointment({
          ...validParams,
          pet_name: 'Fluffy',
          pet_type: 'dog',
        }, mockContext);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Failed to process pet information');
      });

      it('should log successful pet creation', async () => {
        const mockPet = { _id: 'pet123', name: 'Fluffy', species: 'dog' };

        const mockPetModel = {
          findOne: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(mockPet),
          find: jest.fn(),
        };

        jest.doMock('@petbuddy/shared', () => ({
          Pet: mockPetModel,
          Company: { findById: jest.fn() },
          Location: { find: jest.fn() },
          ServiceCategory: { findOne: jest.fn(), find: jest.fn() },
          ServiceItem: { findOne: jest.fn(), find: jest.fn() },
          User: { find: jest.fn() },
          Appointment: { find: jest.fn() },
        }));

        // Mock successful booking
        mockBookingService.createAppointment = jest.fn().mockResolvedValue({
          _id: 'appointment123',
        });

        await handlers.book_appointment({
          ...validParams,
          pet_name: 'Fluffy',
          pet_type: 'dog',
        }, mockContext);

        expect(mockLogger.info).toHaveBeenCalledWith(
          '[book_appointment] Created new pet: Fluffy (dog) for customer contact123'
        );
      });
    });

    describe('pet lookup errors', () => {
      it('should handle database errors when finding registered pets', async () => {
        const mockPetModel = {
          findOne: jest.fn(),
          create: jest.fn(),
          find: jest.fn().mockRejectedValue(new Error('Database query failed')),
        };

        jest.doMock('@petbuddy/shared', () => ({
          Pet: mockPetModel,
          Company: { findById: jest.fn() },
          Location: { find: jest.fn() },
          ServiceCategory: { findOne: jest.fn(), find: jest.fn() },
          ServiceItem: { findOne: jest.fn(), find: jest.fn() },
          User: { find: jest.fn() },
          Appointment: { find: jest.fn() },
        }));

        const result = await handlers.book_appointment(validParams, mockContext);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Failed to retrieve pet information');
        expect(mockLogger.error).toHaveBeenCalledWith(
          '[book_appointment] Failed to retrieve customer\'s pets:',
          expect.any(Error)
        );
      });

      it('should log successful pet lookup', async () => {
        const mockPet = { _id: 'pet123', name: 'Fluffy' };

        const mockPetModel = {
          findOne: jest.fn(),
          create: jest.fn(),
          find: jest.fn().mockResolvedValue([mockPet]),
        };

        jest.doMock('@petbuddy/shared', () => ({
          Pet: mockPetModel,
          Company: { findById: jest.fn() },
          Location: { find: jest.fn() },
          ServiceCategory: { findOne: jest.fn(), find: jest.fn() },
          ServiceItem: { findOne: jest.fn(), find: jest.fn() },
          User: { find: jest.fn() },
          Appointment: { find: jest.fn() },
        }));

        // Mock successful booking
        mockBookingService.createAppointment = jest.fn().mockResolvedValue({
          _id: 'appointment123',
        });

        await handlers.book_appointment(validParams, mockContext);

        expect(mockLogger.info).toHaveBeenCalledWith(
          '[book_appointment] Using existing pet: Fluffy for customer contact123'
        );
      });
    });

    describe('successful pet operations', () => {
      it('should successfully create new pet when specified', async () => {
        const mockPet = { _id: 'pet123', name: 'Fluffy', species: 'dog' };

        const mockPetModel = {
          findOne: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(mockPet),
          find: jest.fn(),
        };

        jest.doMock('@petbuddy/shared', () => ({
          Pet: mockPetModel,
          Company: { findById: jest.fn() },
          Location: { find: jest.fn() },
          ServiceCategory: { findOne: jest.fn(), find: jest.fn() },
          ServiceItem: { findOne: jest.fn(), find: jest.fn() },
          User: { find: jest.fn() },
          Appointment: { find: jest.fn() },
        }));

        // Mock successful booking
        mockBookingService.createAppointment = jest.fn().mockResolvedValue({
          _id: 'appointment123',
        });

        const result = await handlers.book_appointment({
          ...validParams,
          pet_name: 'Fluffy',
          pet_type: 'dog',
        }, mockContext);

        expect(result.success).toBe(true);
        expect(result.customer_id).toBe('contact123');
        expect(mockPetModel.create).toHaveBeenCalledWith({
          companyId: 'company123',
          customerId: 'contact123',
          name: 'Fluffy',
          species: 'dog',
          sex: 'unknown',
        });
      });

      it('should successfully use existing registered pet', async () => {
        const mockPet = { _id: 'pet123', name: 'Fluffy' };

        const mockPetModel = {
          findOne: jest.fn(),
          create: jest.fn(),
          find: jest.fn().mockResolvedValue([mockPet]),
        };

        jest.doMock('@petbuddy/shared', () => ({
          Pet: mockPetModel,
          Company: { findById: jest.fn() },
          Location: { find: jest.fn() },
          ServiceCategory: { findOne: jest.fn(), find: jest.fn() },
          ServiceItem: { findOne: jest.fn(), find: jest.fn() },
          User: { find: jest.fn() },
          Appointment: { find: jest.fn() },
        }));

        // Mock successful booking
        mockBookingService.createAppointment = jest.fn().mockResolvedValue({
          _id: 'appointment123',
        });

        const result = await handlers.book_appointment(validParams, mockContext);

        expect(result.success).toBe(true);
        expect(result.customer_id).toBe('contact123');
        expect(mockPetModel.find).toHaveBeenCalledWith({
          companyId: 'company123',
          customerId: 'contact123',
        }, undefined, { sort: { createdAt: 1 }, limit: 1, lean: true });
      });
    });
  });
});
