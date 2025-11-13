/**
 * Authorization Module Tests
 * 
 * Tests authorization checks for tool handlers to prevent unauthorized access.
 */

import { jest } from '@jest/globals';
import {
  verifyAuthorization,
  verifyResourceOwnership,
  verifyCustomerOwnership,
  isActionAllowed,
  AuthorizationError,
} from '../lib/authorization.js';

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

// Mock shared models
const mockCompany = {
  _id: 'company123',
  name: 'Test Company',
};

const mockIntegration = {
  _id: 'integration123',
  companyId: 'company123',
  facebookChatId: 'facebook_page_123',
  instagramChatId: 'instagram_page_123',
};

jest.mock('@petbuddy/shared', () => ({
  Company: {
    findById: jest.fn(),
  },
}));

jest.mock('../models/CompanyIntegration.js', () => ({
  default: {
    findOne: jest.fn(),
  },
}));

import { Company } from '@petbuddy/shared';
import CompanyIntegration from '../models/CompanyIntegration.js';

describe('Authorization - verifyAuthorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Company.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockCompany),
    });
    CompanyIntegration.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockIntegration),
    });
  });

  test('should authorize valid Facebook company with integration', async () => {
    const context = {
      chat_id: 'user_sender_id_123', // User ID (for logging)
      company_id: 'company123',
      platform: 'facebook',
    };

    const result = await verifyAuthorization(context, 'view', 'staff_list');

    expect(result.authorized).toBe(true);
    expect(result.company).toEqual(mockCompany);
  });

  test('should authorize valid Instagram company with integration', async () => {
    const context = {
      chat_id: 'user_sender_id_456', // User ID (for logging)
      company_id: 'company123',
      platform: 'instagram',
    };

    const result = await verifyAuthorization(context, 'view', 'staff_list');

    expect(result.authorized).toBe(true);
    expect(result.company).toEqual(mockCompany);
  });

  test('should reject company without integration record', async () => {
    // Company exists but no CompanyIntegration record
    CompanyIntegration.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });

    const context = {
      chat_id: 'user_sender_id_123',
      company_id: 'company123',
      platform: 'facebook',
    };

    await expect(
      verifyAuthorization(context, 'view', 'staff_list')
    ).rejects.toThrow(AuthorizationError);

    await expect(
      verifyAuthorization(context, 'view', 'staff_list')
    ).rejects.toThrow('no integration configured');
  });

  test('should reject company without facebook platform configured', async () => {
    // Integration exists but no facebookChatId
    CompanyIntegration.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: 'integration123',
        companyId: 'company123',
        instagramChatId: 'instagram_page_123',
        // Missing facebookChatId
      }),
    });

    const context = {
      chat_id: 'user_sender_id_123',
      company_id: 'company123',
      platform: 'facebook',
    };

    await expect(
      verifyAuthorization(context, 'view', 'staff_list')
    ).rejects.toThrow(AuthorizationError);

    await expect(
      verifyAuthorization(context, 'view', 'staff_list')
    ).rejects.toThrow('no facebook integration configured');
  });

  test('should allow missing chat_id (used only for logging)', async () => {
    const context = {
      // Missing chat_id - this is OK, it's only used for logging
      company_id: 'company123',
      platform: 'facebook',
    };

    const result = await verifyAuthorization(context, 'view', 'staff_list');

    expect(result.authorized).toBe(true);
    expect(result.company).toEqual(mockCompany);
  });
  
  test('should reject missing company_id', async () => {
    const context = {
      chat_id: 'facebook_chat_123',
      // Missing company_id
      platform: 'facebook',
    };
    
    await expect(
      verifyAuthorization(context, 'view', 'staff_list')
    ).rejects.toThrow(AuthorizationError);
    
    await expect(
      verifyAuthorization(context, 'view', 'staff_list')
    ).rejects.toThrow('Missing company_id');
  });
  
  test('should reject missing platform', async () => {
    const context = {
      chat_id: 'facebook_chat_123',
      company_id: 'company123',
      // Missing platform
    };
    
    await expect(
      verifyAuthorization(context, 'view', 'staff_list')
    ).rejects.toThrow(AuthorizationError);
    
    await expect(
      verifyAuthorization(context, 'view', 'staff_list')
    ).rejects.toThrow('Missing platform');
  });
  
  test('should reject invalid platform', async () => {
    const context = {
      chat_id: 'chat_123',
      company_id: 'company123',
      platform: 'twitter', // Invalid platform
    };
    
    await expect(
      verifyAuthorization(context, 'view', 'staff_list')
    ).rejects.toThrow(AuthorizationError);
    
    await expect(
      verifyAuthorization(context, 'view', 'staff_list')
    ).rejects.toThrow('Invalid platform');
  });
  
  test('should reject non-existent company', async () => {
    Company.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });
    
    const context = {
      chat_id: 'facebook_chat_123',
      company_id: 'nonexistent_company',
      platform: 'facebook',
    };
    
    await expect(
      verifyAuthorization(context, 'view', 'staff_list')
    ).rejects.toThrow(AuthorizationError);
    
    await expect(
      verifyAuthorization(context, 'view', 'staff_list')
    ).rejects.toThrow('Company nonexistent_company not found');
  });
  
  test('should handle database errors gracefully', async () => {
    Company.findById.mockReturnValue({
      lean: jest.fn().mockRejectedValue(new Error('Database connection failed')),
    });
    
    const context = {
      chat_id: 'facebook_chat_123',
      company_id: 'company123',
      platform: 'facebook',
    };
    
    await expect(
      verifyAuthorization(context, 'view', 'staff_list')
    ).rejects.toThrow(AuthorizationError);
  });
});

describe('Authorization - verifyResourceOwnership', () => {
  test('should verify resource belongs to company', async () => {
    const resource = {
      _id: 'appointment123',
      companyId: 'company123',
      customerId: 'customer123',
    };
    
    const result = await verifyResourceOwnership(
      resource,
      'company123',
      'appointment'
    );
    
    expect(result).toBe(true);
  });
  
  test('should reject resource from different company', async () => {
    const resource = {
      _id: 'appointment123',
      companyId: 'company_other',
      customerId: 'customer123',
    };
    
    await expect(
      verifyResourceOwnership(resource, 'company123', 'appointment')
    ).rejects.toThrow(AuthorizationError);
    
    await expect(
      verifyResourceOwnership(resource, 'company123', 'appointment')
    ).rejects.toThrow('Resource belongs to different company');
  });
  
  test('should reject null resource', async () => {
    await expect(
      verifyResourceOwnership(null, 'company123', 'appointment')
    ).rejects.toThrow(AuthorizationError);
    
    await expect(
      verifyResourceOwnership(null, 'company123', 'appointment')
    ).rejects.toThrow('Resource not found');
  });
  
  test('should reject resource without company identifier', async () => {
    const resource = {
      _id: 'appointment123',
      // Missing companyId
      customerId: 'customer123',
    };
    
    await expect(
      verifyResourceOwnership(resource, 'company123', 'appointment')
    ).rejects.toThrow(AuthorizationError);
    
    await expect(
      verifyResourceOwnership(resource, 'company123', 'appointment')
    ).rejects.toThrow('no company identifier');
  });
  
  test('should handle different company ID field names', async () => {
    const resources = [
      { companyId: 'company123' },
      { company_id: 'company123' },
      { company: 'company123' },
    ];
    
    for (const resource of resources) {
      const result = await verifyResourceOwnership(
        resource,
        'company123',
        'test_resource'
      );
      expect(result).toBe(true);
    }
  });
});

describe('Authorization - verifyCustomerOwnership', () => {
  test('should verify customer belongs to company', async () => {
    const customer = {
      _id: 'customer123',
      companyId: 'company123',
    };
    
    const result = await verifyCustomerOwnership(customer, 'company123');
    
    expect(result).toBe(true);
  });
  
  test('should reject customer from different company', async () => {
    const customer = {
      _id: 'customer123',
      companyId: 'company_other',
    };
    
    await expect(
      verifyCustomerOwnership(customer, 'company123')
    ).rejects.toThrow(AuthorizationError);
  });
});

describe('Authorization - isActionAllowed', () => {
  test('should allow all actions for authenticated context', () => {
    const context = {
      chat_id: 'chat123',
      company_id: 'company123',
      platform: 'facebook',
    };
    
    expect(isActionAllowed('view', 'staff', context)).toBe(true);
    expect(isActionAllowed('create', 'appointment', context)).toBe(true);
    expect(isActionAllowed('update', 'pet', context)).toBe(true);
    expect(isActionAllowed('delete', 'appointment', context)).toBe(true);
  });
});

describe('Authorization - AuthorizationError', () => {
  test('should create error with all metadata', () => {
    const error = new AuthorizationError(
      'view',
      'staff_list',
      'Chat not authorized',
      {
        platform: 'facebook',
        chatId: 'chat123',
        companyId: 'company123',
      }
    );
    
    expect(error.name).toBe('AuthorizationError');
    expect(error.action).toBe('view');
    expect(error.resource).toBe('staff_list');
    expect(error.reason).toBe('Chat not authorized');
    expect(error.details.platform).toBe('facebook');
    expect(error.message).toContain('Cannot view staff_list');
  });
  
  test('should serialize to JSON properly', () => {
    const error = new AuthorizationError(
      'create',
      'appointment',
      'Unauthorized access',
      { chatId: 'chat123' }
    );
    
    const json = error.toJSON();
    
    expect(json.name).toBe('AuthorizationError');
    expect(json.action).toBe('create');
    expect(json.resource).toBe('appointment');
    expect(json.reason).toBe('Unauthorized access');
    expect(json.timestamp).toBeInstanceOf(Date);
  });
});

describe('Authorization - Integration Tests', () => {
  test('should prevent cross-company data access', async () => {
    Company.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockCompany),
    });
    
    // Company A's chat tries to access Company B's data
    const context = {
      chat_id: 'facebook_chat_123', // Authorized for company123
      company_id: 'company123',
      platform: 'facebook',
    };
    
    // Verify authorization passes
    await expect(
      verifyAuthorization(context, 'view', 'appointment')
    ).resolves.toBeDefined();
    
    // But resource from different company should fail
    const resourceFromOtherCompany = {
      _id: 'appointment999',
      companyId: 'company_other',
    };
    
    await expect(
      verifyResourceOwnership(
        resourceFromOtherCompany,
        context.company_id,
        'appointment'
      )
    ).rejects.toThrow(AuthorizationError);
  });
  
  test('should allow same company access through different platforms', async () => {
    Company.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockCompany),
    });
    
    // Test Facebook access
    const facebookContext = {
      chat_id: 'facebook_chat_123',
      company_id: 'company123',
      platform: 'facebook',
    };
    
    await expect(
      verifyAuthorization(facebookContext, 'view', 'staff')
    ).resolves.toBeDefined();
    
    // Test Instagram access for same company
    const instagramContext = {
      chat_id: 'instagram_chat_123',
      company_id: 'company123',
      platform: 'instagram',
    };
    
    await expect(
      verifyAuthorization(instagramContext, 'view', 'staff')
    ).resolves.toBeDefined();
  });
});

