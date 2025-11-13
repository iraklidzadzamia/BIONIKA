import axios from 'axios';
import { MessageForwardingService } from '../services/messageForwarding.service.js';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock logger
jest.mock('../utils/logger.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

describe('MessageForwardingService', () => {
  let messageForwardingService;

  beforeEach(() => {
    jest.clearAllMocks();
    messageForwardingService = new MessageForwardingService();
    messageForwardingService.metaBotBaseUrl = 'http://localhost:3001';
  });

  describe('sendToMetaBot', () => {
    const mockPayload = {
      company_id: 'company123',
      customer_id: 'customer123',
      platform: 'facebook',
      content: 'Hello world',
      external_message_id: 'msg123',
      access_token: 'token123',
      customer_social_id: 'social123',
    };

    const mockEndpoint = 'http://localhost:3001/chat/facebook';

    it('should successfully send message to Meta Bot', async () => {
      const mockResponse = { data: { success: true, messageId: 'meta123' } };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await messageForwardingService.sendToMetaBot(mockEndpoint, mockPayload);

      expect(mockedAxios.post).toHaveBeenCalledWith(mockEndpoint, mockPayload, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle ECONNREFUSED error with specific message', async () => {
      const error = new Error('Connection refused');
      error.code = 'ECONNREFUSED';
      mockedAxios.post.mockRejectedValueOnce(error);

      await expect(
        messageForwardingService.sendToMetaBot(mockEndpoint, mockPayload)
      ).rejects.toThrow('Meta Bot server is not reachable. Message forwarding failed.');
    });

    it('should handle ETIMEDOUT error with specific message', async () => {
      const error = new Error('Timeout');
      error.code = 'ETIMEDOUT';
      mockedAxios.post.mockRejectedValueOnce(error);

      await expect(
        messageForwardingService.sendToMetaBot(mockEndpoint, mockPayload)
      ).rejects.toThrow('Meta Bot server timed out. Message forwarding failed.');
    });

    it('should handle HTTP 500 server errors', async () => {
      const error = {
        response: {
          status: 500,
          data: { message: 'Internal server error' },
        },
      };
      mockedAxios.post.mockRejectedValueOnce(error);

      await expect(
        messageForwardingService.sendToMetaBot(mockEndpoint, mockPayload)
      ).rejects.toThrow('Meta Bot server error (500): Internal server error');
    });

    it('should handle HTTP 400 client errors', async () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'Bad request' },
        },
      };
      mockedAxios.post.mockRejectedValueOnce(error);

      await expect(
        messageForwardingService.sendToMetaBot(mockEndpoint, mockPayload)
      ).rejects.toThrow('Meta Bot client error (400): Bad request');
    });

    it('should handle HTTP errors without message in response', async () => {
      const error = {
        response: {
          status: 404,
          statusText: 'Not Found',
        },
      };
      mockedAxios.post.mockRejectedValueOnce(error);

      await expect(
        messageForwardingService.sendToMetaBot(mockEndpoint, mockPayload)
      ).rejects.toThrow('Meta Bot client error (404): Not Found');
    });

    it('should handle generic network errors', async () => {
      const error = new Error('Network error occurred');
      mockedAxios.post.mockRejectedValueOnce(error);

      await expect(
        messageForwardingService.sendToMetaBot(mockEndpoint, mockPayload)
      ).rejects.toThrow('Failed to communicate with Meta Bot: Network error occurred');
    });

    it('should include payload context in error logs', async () => {
      const error = new Error('Test error');
      mockedAxios.post.mockRejectedValueOnce(error);

      try {
        await messageForwardingService.sendToMetaBot(mockEndpoint, mockPayload);
      } catch (e) {
        // Expected to throw
      }

      // Verify logger was called with payload context
      const logger = require('../utils/logger.js');
      expect(logger.error).toHaveBeenCalledWith(
        'Meta Bot communication failed:',
        expect.objectContaining({
          endpoint: mockEndpoint,
          error: 'Test error',
          payload: {
            company_id: 'company123',
            platform: 'facebook',
            customer_social_id: 'social123',
          },
        })
      );
    });
  });
});
