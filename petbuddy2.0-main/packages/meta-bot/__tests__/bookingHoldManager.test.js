/**
 * Booking Hold Manager Tests
 * 
 * Tests race condition prevention through booking holds.
 */

import { jest } from '@jest/globals';
import {
  createBookingHold,
  releaseBookingHold,
  isSlotHeld,
  cleanupExpiredHolds,
  getActiveHolds,
} from '../lib/bookingHoldManager.js';

// Mock logger
jest.mock('../utils/logger.js', () => ({
  default: {
    messageFlow: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  },
}));

// Mock BookingHold model
const mockHolds = [];

jest.mock('../../../backend/src/models/BookingHold.js', () => {
  return {
    default: class BookingHold {
      constructor(data) {
        this.data = data;
        this._id = `hold_${Date.now()}_${Math.random()}`;
      }
      
      static async create(data) {
        const hold = {
          _id: `hold_${Date.now()}_${Math.random()}`,
          ...data,
        };
        mockHolds.push(hold);
        return hold;
      }
      
      static async findOne(query) {
        // Simulate database query
        return {
          lean: async () => {
            const hold = mockHolds.find(h => {
              if (h.staffId !== query.staffId) return false;
              if (h.companyId !== query.companyId) return false;
              if (h.expiresAt < new Date()) return false;
              
              // Check time overlap
              if (query.$or) {
                return query.$or.some(condition => {
                  const queryStart = condition.startTime?.$lt;
                  const queryEnd = condition.endTime?.$gt;
                  return h.startTime < queryEnd && h.endTime > queryStart;
                });
              }
              
              return true;
            });
            return hold || null;
          },
        };
      }
      
      static async deleteOne({ _id }) {
        const index = mockHolds.findIndex(h => h._id === _id);
        if (index >= 0) {
          mockHolds.splice(index, 1);
          return { deletedCount: 1 };
        }
        return { deletedCount: 0 };
      }
      
      static async deleteMany(query) {
        if (query.expiresAt?.$lt) {
          const expiresBefore = query.expiresAt.$lt;
          const toDelete = mockHolds.filter(h => h.expiresAt < expiresBefore);
          mockHolds.splice(0, mockHolds.length, 
            ...mockHolds.filter(h => h.expiresAt >= expiresBefore)
          );
          return { deletedCount: toDelete.length };
        }
        return { deletedCount: 0 };
      }
      
      static async find(query) {
        return {
          sort: () => ({
            limit: () => ({
              lean: async () => {
                return mockHolds.filter(h => {
                  if (query.expiresAt?.$gt && h.expiresAt < query.expiresAt.$gt) {
                    return false;
                  }
                  if (query.companyId && h.companyId !== query.companyId) {
                    return false;
                  }
                  return true;
                });
              },
            }),
          }),
        };
      }
    },
  };
});

// Mock database wrapper
jest.mock('../lib/databaseWrapper.js', () => ({
  executeDatabaseOperation: async (name, fn) => await fn(),
}));

describe('Booking Hold Manager - createBookingHold', () => {
  beforeEach(() => {
    mockHolds.splice(0, mockHolds.length); // Clear holds
  });
  
  test('should create a booking hold successfully', async () => {
    const staffId = 'staff123';
    const startTime = new Date('2025-12-01T10:00:00Z');
    const endTime = new Date('2025-12-01T11:00:00Z');
    const companyId = 'company123';
    
    const holdId = await createBookingHold(
      staffId,
      startTime,
      endTime,
      companyId,
      { chatId: 'chat123', platform: 'facebook' }
    );
    
    expect(holdId).toBeDefined();
    expect(holdId).toMatch(/^hold_/);
    expect(mockHolds).toHaveLength(1);
    expect(mockHolds[0].staffId).toBe(staffId);
    expect(mockHolds[0].startTime).toEqual(startTime);
    expect(mockHolds[0].endTime).toEqual(endTime);
  });
  
  test('should prevent creating overlapping holds', async () => {
    const staffId = 'staff123';
    const startTime1 = new Date('2025-12-01T10:00:00Z');
    const endTime1 = new Date('2025-12-01T11:00:00Z');
    const companyId = 'company123';
    
    // Create first hold
    await createBookingHold(
      staffId,
      startTime1,
      endTime1,
      companyId
    );
    
    // Try to create overlapping hold
    const startTime2 = new Date('2025-12-01T10:30:00Z');
    const endTime2 = new Date('2025-12-01T11:30:00Z');
    
    await expect(
      createBookingHold(staffId, startTime2, endTime2, companyId)
    ).rejects.toThrow('Time slot already held');
    
    await expect(
      createBookingHold(staffId, startTime2, endTime2, companyId)
    ).rejects.toMatchObject({ code: 'BOOKING_HOLD_EXISTS' });
  });
  
  test('should allow holds for different staff', async () => {
    const startTime = new Date('2025-12-01T10:00:00Z');
    const endTime = new Date('2025-12-01T11:00:00Z');
    const companyId = 'company123';
    
    const hold1 = await createBookingHold('staff1', startTime, endTime, companyId);
    const hold2 = await createBookingHold('staff2', startTime, endTime, companyId);
    
    expect(hold1).not.toBe(hold2);
    expect(mockHolds).toHaveLength(2);
  });
  
  test('should set expiration time to 30 seconds', async () => {
    const staffId = 'staff123';
    const startTime = new Date('2025-12-01T10:00:00Z');
    const endTime = new Date('2025-12-01T11:00:00Z');
    const companyId = 'company123';
    
    const beforeCreate = Date.now();
    
    await createBookingHold(staffId, startTime, endTime, companyId);
    
    const afterCreate = Date.now();
    
    const hold = mockHolds[0];
    const expiresIn = hold.expiresAt.getTime() - beforeCreate;
    
    // Should expire in approximately 30 seconds
    expect(expiresIn).toBeGreaterThanOrEqual(29000);
    expect(expiresIn).toBeLessThanOrEqual(31000);
  });
});

describe('Booking Hold Manager - releaseBookingHold', () => {
  beforeEach(() => {
    mockHolds.splice(0, mockHolds.length);
  });
  
  test('should release a booking hold', async () => {
    const staffId = 'staff123';
    const startTime = new Date('2025-12-01T10:00:00Z');
    const endTime = new Date('2025-12-01T11:00:00Z');
    const companyId = 'company123';
    
    const holdId = await createBookingHold(
      staffId,
      startTime,
      endTime,
      companyId
    );
    
    expect(mockHolds).toHaveLength(1);
    
    await releaseBookingHold(holdId);
    
    expect(mockHolds).toHaveLength(0);
  });
  
  test('should handle releasing non-existent hold gracefully', async () => {
    await expect(
      releaseBookingHold('nonexistent_hold_id')
    ).resolves.not.toThrow();
  });
  
  test('should handle releasing with no holdId', async () => {
    await expect(
      releaseBookingHold(null)
    ).resolves.not.toThrow();
  });
});

describe('Booking Hold Manager - isSlotHeld', () => {
  beforeEach(() => {
    mockHolds.splice(0, mockHolds.length);
  });
  
  test('should return true for held slot', async () => {
    const staffId = 'staff123';
    const startTime = new Date('2025-12-01T10:00:00Z');
    const endTime = new Date('2025-12-01T11:00:00Z');
    const companyId = 'company123';
    
    await createBookingHold(staffId, startTime, endTime, companyId);
    
    const isHeld = await isSlotHeld(staffId, startTime, endTime, companyId);
    
    expect(isHeld).toBe(true);
  });
  
  test('should return false for non-held slot', async () => {
    const staffId = 'staff123';
    const startTime = new Date('2025-12-01T10:00:00Z');
    const endTime = new Date('2025-12-01T11:00:00Z');
    const companyId = 'company123';
    
    const isHeld = await isSlotHeld(staffId, startTime, endTime, companyId);
    
    expect(isHeld).toBe(false);
  });
});

describe('Booking Hold Manager - cleanupExpiredHolds', () => {
  beforeEach(() => {
    mockHolds.splice(0, mockHolds.length);
  });
  
  test('should clean up expired holds', async () => {
    const staffId = 'staff123';
    const companyId = 'company123';
    
    // Create holds with past expiration
    mockHolds.push({
      _id: 'hold1',
      staffId,
      companyId,
      startTime: new Date('2025-12-01T10:00:00Z'),
      endTime: new Date('2025-12-01T11:00:00Z'),
      expiresAt: new Date(Date.now() - 60000), // Expired 1 minute ago
    });
    
    mockHolds.push({
      _id: 'hold2',
      staffId,
      companyId,
      startTime: new Date('2025-12-01T11:00:00Z'),
      endTime: new Date('2025-12-01T12:00:00Z'),
      expiresAt: new Date(Date.now() + 30000), // Expires in 30 seconds
    });
    
    expect(mockHolds).toHaveLength(2);
    
    const cleaned = await cleanupExpiredHolds();
    
    expect(cleaned).toBe(1);
    expect(mockHolds).toHaveLength(1);
    expect(mockHolds[0]._id).toBe('hold2');
  });
  
  test('should return 0 when no holds to clean', async () => {
    const cleaned = await cleanupExpiredHolds();
    expect(cleaned).toBe(0);
  });
});

describe('Booking Hold Manager - Race Condition Prevention', () => {
  beforeEach(() => {
    mockHolds.splice(0, mockHolds.length);
  });
  
  test('should prevent concurrent bookings for same slot', async () => {
    const staffId = 'staff123';
    const startTime = new Date('2025-12-01T10:00:00Z');
    const endTime = new Date('2025-12-01T11:00:00Z');
    const companyId = 'company123';
    
    // Simulate two concurrent requests
    const request1 = createBookingHold(staffId, startTime, endTime, companyId);
    const request2 = createBookingHold(staffId, startTime, endTime, companyId);
    
    const results = await Promise.allSettled([request1, request2]);
    
    // One should succeed, one should fail
    const succeeded = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');
    
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    
    // Failed one should have BOOKING_HOLD_EXISTS error
    expect(failed[0].reason.code).toBe('BOOKING_HOLD_EXISTS');
  });
  
  test('should allow booking after hold is released', async () => {
    const staffId = 'staff123';
    const startTime = new Date('2025-12-01T10:00:00Z');
    const endTime = new Date('2025-12-01T11:00:00Z');
    const companyId = 'company123';
    
    // Create and release hold
    const holdId1 = await createBookingHold(
      staffId,
      startTime,
      endTime,
      companyId
    );
    await releaseBookingHold(holdId1);
    
    // Should be able to create new hold for same slot
    const holdId2 = await createBookingHold(
      staffId,
      startTime,
      endTime,
      companyId
    );
    
    expect(holdId2).toBeDefined();
    expect(holdId2).not.toBe(holdId1);
  });
});

