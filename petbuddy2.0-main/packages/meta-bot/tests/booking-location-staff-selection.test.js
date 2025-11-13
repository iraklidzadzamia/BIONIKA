/**
 * Test suite for location and staff selection in booking flow
 * 
 * This test verifies that the AI NEVER auto-assigns location or staff
 * when multiple options are available.
 * 
 * CRITICAL REQUIREMENT: When there are multiple locations or staff members,
 * the system MUST ask the customer for their preference before proceeding.
 */

import { getBookingContext } from '../lib/bookingContext.js';
import { createToolHandlers } from '../lib/toolHandlers.js';

// Mock data setup
const mockCompanyId = '507f1f77bcf86cd799439011';
const mockLocationId1 = '507f1f77bcf86cd799439012';
const mockLocationId2 = '507f1f77bcf86cd799439013';
const mockStaffId1 = '507f1f77bcf86cd799439014';
const mockStaffId2 = '507f1f77bcf86cd799439015';
const mockServiceId = '507f1f77bcf86cd799439016';
const mockServiceItemId = '507f1f77bcf86cd799439017';

// Mock database models
const mockModels = {
  Company: {
    findById: jest.fn().mockResolvedValue({
      _id: mockCompanyId,
      name: 'Test Pet Grooming',
      timezone: 'America/New_York',
      settings: {
        workHours: {
          monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' }
        }
      }
    })
  },
  Location: {
    find: jest.fn(),
    findOne: jest.fn()
  },
  User: {
    find: jest.fn()
  },
  ServiceCategory: {
    findOne: jest.fn()
  },
  ServiceItem: {
    findOne: jest.fn(),
    find: jest.fn()
  }
};

describe('Location and Staff Selection - No Auto-Assignment', () => {
  
  describe('getBookingContext - Location Handling', () => {
    
    test('Should NOT auto-select when multiple locations exist', async () => {
      // Setup: Multiple locations available
      mockModels.Location.find.mockResolvedValue([
        { _id: mockLocationId1, name: 'Downtown', isMain: true, active: true, address: '123 Main St' },
        { _id: mockLocationId2, name: 'Westside', isMain: false, active: true, address: '456 Oak Ave' }
      ]);
      
      mockModels.ServiceCategory.findOne.mockResolvedValue({
        _id: mockServiceId,
        name: 'Full Groom',
        active: true,
        allowedRoles: ['groomer']
      });
      
      mockModels.ServiceItem.find.mockResolvedValue([{
        _id: mockServiceItemId,
        durationMinutes: 60,
        price: 50
      }]);
      
      mockModels.User.find.mockResolvedValue([{
        _id: mockStaffId1,
        fullName: 'Sarah',
        role: 'groomer',
        serviceCategoryIds: [mockServiceId],
        locationIds: [mockLocationId1],
        primaryLocationId: mockLocationId1
      }]);
      
      // Mock the global models
      global.Company = mockModels.Company;
      global.Location = mockModels.Location;
      global.ServiceCategory = mockModels.ServiceCategory;
      global.ServiceItem = mockModels.ServiceItem;
      global.User = mockModels.User;
      
      const result = await getBookingContext({
        companyId: mockCompanyId,
        serviceName: 'Full Groom'
      });
      
      // CRITICAL ASSERTION: locationOptions should contain all locations
      expect(result.locationOptions).toHaveLength(2);
      expect(result.locationOptions).toContainEqual(
        expect.objectContaining({ id: mockLocationId1, name: 'Downtown' })
      );
      expect(result.locationOptions).toContainEqual(
        expect.objectContaining({ id: mockLocationId2, name: 'Westside' })
      );
      
      // The temporary location used for staff lookup should be set,
      // but the caller MUST check locationOptions.length and ask customer
      expect(result.location).toBeDefined();
      expect(result.locationId).toBeDefined();
    });
    
    test('Should auto-select when only ONE location exists', async () => {
      // Setup: Only one location
      mockModels.Location.find.mockResolvedValue([
        { _id: mockLocationId1, name: 'Downtown', isMain: true, active: true, address: '123 Main St' }
      ]);
      
      mockModels.ServiceCategory.findOne.mockResolvedValue({
        _id: mockServiceId,
        name: 'Full Groom',
        active: true,
        allowedRoles: ['groomer']
      });
      
      mockModels.ServiceItem.find.mockResolvedValue([{
        _id: mockServiceItemId,
        durationMinutes: 60,
        price: 50
      }]);
      
      mockModels.User.find.mockResolvedValue([{
        _id: mockStaffId1,
        fullName: 'Sarah',
        role: 'groomer',
        serviceCategoryIds: [mockServiceId],
        locationIds: [mockLocationId1],
        primaryLocationId: mockLocationId1
      }]);
      
      const result = await getBookingContext({
        companyId: mockCompanyId,
        serviceName: 'Full Groom'
      });
      
      // With only one location, auto-selection is OK
      expect(result.locationOptions).toHaveLength(1);
      expect(result.locationId).toBe(mockLocationId1);
      expect(result.location.name).toBe('Downtown');
    });
  });
  
  describe('book_appointment Tool Handler', () => {
    
    test('Should return needs_selection when multiple locations exist and no location_id provided', async () => {
      const platform = 'facebook';
      const handlers = createToolHandlers(platform);
      
      // Mock context
      const context = {
        company_id: mockCompanyId,
        chat_id: 'test_chat_123',
        platform: 'facebook',
        timezone: 'America/New_York'
      };
      
      // Mock getBookingContext to return multiple locations
      jest.mock('../lib/bookingContext.js', () => ({
        getBookingContext: jest.fn().mockResolvedValue({
          company: { _id: mockCompanyId, timezone: 'America/New_York' },
          timezone: 'America/New_York',
          service: { _id: mockServiceId, name: 'Full Groom' },
          serviceId: mockServiceId,
          serviceItemId: mockServiceItemId,
          serviceDuration: 60,
          location: { _id: mockLocationId1, name: 'Downtown', address: '123 Main St' },
          locationId: mockLocationId1,
          locationOptions: [
            { id: mockLocationId1, name: 'Downtown', address: '123 Main St', isMain: true },
            { id: mockLocationId2, name: 'Westside', address: '456 Oak Ave', isMain: false }
          ],
          qualifiedStaff: [{ _id: mockStaffId1, fullName: 'Sarah' }],
          qualifiedStaffIds: [mockStaffId1],
          staffOptions: [{ id: mockStaffId1, name: 'Sarah', role: 'groomer' }]
        })
      }));
      
      const result = await handlers.book_appointment({
        appointment_time: 'tomorrow at 2pm',
        service_name: 'Full Groom',
        // NO location_id provided - should trigger needs_selection
      }, context);
      
      // CRITICAL ASSERTION: Should NOT proceed with booking
      expect(result.success).toBe(false);
      expect(result.needs_selection).toBeDefined();
      expect(result.needs_selection.type).toBe('location');
      expect(result.needs_selection.options).toHaveLength(2);
      expect(result.needs_selection.message).toContain('LOCATION SELECTION REQUIRED');
    });
    
    test('Should return needs_selection when multiple staff exist and no staff_id provided', async () => {
      const platform = 'facebook';
      const handlers = createToolHandlers(platform);
      
      const context = {
        company_id: mockCompanyId,
        chat_id: 'test_chat_123',
        platform: 'facebook',
        timezone: 'America/New_York'
      };
      
      // Mock getBookingContext to return multiple staff at one location
      jest.mock('../lib/bookingContext.js', () => ({
        getBookingContext: jest.fn().mockResolvedValue({
          company: { _id: mockCompanyId, timezone: 'America/New_York' },
          timezone: 'America/New_York',
          service: { _id: mockServiceId, name: 'Full Groom' },
          serviceId: mockServiceId,
          serviceItemId: mockServiceItemId,
          serviceDuration: 60,
          location: { _id: mockLocationId1, name: 'Downtown', address: '123 Main St' },
          locationId: mockLocationId1,
          locationOptions: [
            { id: mockLocationId1, name: 'Downtown', address: '123 Main St', isMain: true }
          ],
          qualifiedStaff: [
            { _id: mockStaffId1, fullName: 'Sarah' },
            { _id: mockStaffId2, fullName: 'Mike' }
          ],
          qualifiedStaffIds: [mockStaffId1, mockStaffId2],
          staffOptions: [
            { id: mockStaffId1, name: 'Sarah', role: 'groomer', locationIds: [mockLocationId1] },
            { id: mockStaffId2, name: 'Mike', role: 'groomer', locationIds: [mockLocationId1] }
          ]
        })
      }));
      
      const result = await handlers.book_appointment({
        appointment_time: 'tomorrow at 2pm',
        service_name: 'Full Groom',
        location_id: mockLocationId1,
        // NO staff_id provided - should trigger needs_selection
      }, context);
      
      // CRITICAL ASSERTION: Should NOT proceed with booking
      expect(result.success).toBe(false);
      expect(result.needs_selection).toBeDefined();
      expect(result.needs_selection.type).toBe('staff');
      expect(result.needs_selection.options.length).toBeGreaterThan(1);
      expect(result.needs_selection.message).toContain('STAFF SELECTION REQUIRED');
    });
  });
});

console.log(`
====================================================================
LOCATION & STAFF SELECTION TEST SUITE
====================================================================

This test suite verifies the CRITICAL requirement that the AI
must NEVER auto-assign location or staff when multiple options exist.

Expected Behavior:
✓ When multiple locations exist → Return needs_selection, ask customer
✓ When multiple staff exist → Return needs_selection, ask customer
✓ When only one option exists → OK to auto-select
✓ When customer provides preference → Use their choice

VIOLATIONS of these rules will result in:
- Wrong location assignments
- Wrong staff assignments
- Poor customer experience
- Potential business logic errors

====================================================================
`);

