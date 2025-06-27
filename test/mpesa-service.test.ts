// src/MpesaService.test.ts
import axios from 'axios';
import { MpesaService, MpesaError } from '../src/mpesa-service'; // Import MpesaError
import { MpesaAPIConfig, MpesaC2BResponse, MpesaQueryResponse, MpesaB2CResponse, MpesaReversalResponse, MpesaB2BResponse } from '../src/types';
import { encodePublicKeyToBase64 } from '../src/utils';

// Mockar o módulo axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MpesaService', () => {
  let mpesaService: MpesaService;
  const mockConfig: MpesaAPIConfig = {
    apiKey: process.env.MPESA_API_KEY || 'test_api_key',
    publicKey: process.env.MPESA_PUBLIC_KEY || 'test_public_key', // This will now be encoded and used as the Bearer token
    serviceProviderCode: process.env.MPESA_SERVICE_PROVIDER_CODE || '12345',
    origin: process.env.MPESA_ORIGIN || 'developer.mpesa.vm.co.mz',
    apiHost: process.env.MPESA_API_HOST || 'api.sandbox.vm.co.mz:18352', // Ensure host includes port
    timeout: 5000,
  };

  const encodedPublicKey = encodePublicKeyToBase64(mockConfig.publicKey);

  beforeEach(() => {
    // Reset mocks before each test
    mockedAxios.create.mockReturnThis(); // Ensure axios.create returns itself for chaining
    mockedAxios.post.mockClear();
    mockedAxios.get.mockClear(); // Though getAccessToken is removed, clear just in case
    mpesaService = new MpesaService(mockConfig);
  });

  // Since getAccessToken is removed, no need to test it explicitly.
  // The encodedPublicKey is now passed directly in the Authorization header.

  describe('initiateC2BPayment', () => {
    const mockC2BPayload = {
      input_Amount: '100.00',
      input_CustomerMsisdn: '258841234567',
      input_ThirdPartyReference: 'REF123C2B',
      input_TransactionReference: 'TRX123C2B',
      input_ServiceProviderCode: '12345',
    };
    const mockC2BResponse: MpesaC2BResponse = {
      output_ResponseCode: 'INS-0',
      output_ResponseDesc: 'Request processed successfully',
      output_ConversationID: 'conv_c2b_123',
      output_TransactionID: 'trx_c2b_123',
      output_ThirdPartyReference: 'REF123C2B',
    };

    it('should successfully initiate a C2B payment', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: mockC2BResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

      const response = await mpesaService.initiateC2BPayment(
        100,
        '258841234567',
        'TRX123C2B',
        'REF123C2B'
      );

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/ipg/v1x/c2bPayment/singleStage/',
        mockC2BPayload,
        {
          headers: {
            'Authorization': `Bearer ${encodedPublicKey}`, // Assert on encoded Public Key
            'Origin': mockConfig.origin,
            'X-Api-Key': mockConfig.apiKey,
          },
        }
      );
      expect(response).toEqual(mockC2BResponse);
    });

    it('should throw MpesaError for C2B payment failure (API error code)', async () => {
      const errorResponse: MpesaC2BResponse = {
        output_ResponseCode: 'INS-2006',
        output_ResponseDesc: 'Insufficient balance',
        output_ConversationID: 'conv_c2b_fail',
        output_TransactionID: 'trx_c2b_fail',
        output_ThirdPartyReference: 'REF123C2B',
      };
      mockedAxios.post.mockResolvedValueOnce({
        data: errorResponse,
        status: 200, // HTTP 200 but M-Pesa error code
        statusText: 'OK',
        headers: {},
        config: {},
      });

      await expect(
        mpesaService.initiateC2BPayment(100, '258841234567', 'TRX123C2B', 'REF123C2B')
      ).rejects.toThrow(MpesaError);

      await expect(
        mpesaService.initiateC2BPayment(100, '258841234567', 'TRX123C2B', 'REF123C2B')
      ).rejects.toHaveProperty('details', {
        code: 'INS-2006',
        description: 'Insufficient balance',
        httpStatus: 200,
        conversationId: 'conv_c2b_fail',
        transactionId: 'trx_c2b_fail',
        thirdPartyReference: 'REF123C2B',
      });
    });

    it('should throw MpesaError for C2B payment failure (HTTP error)', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          data: {
            output_ResponseCode: 'INS-1',
            output_ResponseDesc: 'Internal Error',
          },
          status: 500,
          statusText: 'Internal Server Error',
        },
      });

      await expect(
        mpesaService.initiateC2BPayment(100, '258841234567', 'TRX123C2B', 'REF123C2B')
      ).rejects.toThrow(MpesaError);

      await expect(
        mpesaService.initiateC2BPayment(100, '258841234567', 'TRX123C2B', 'REF123C2B')
      ).rejects.toHaveProperty('details', {
        code: 'INS-1',
        description: 'Internal Error',
        httpStatus: 500,
        conversationId: undefined, // These might be undefined for HTTP errors without Mpesa details
        transactionId: undefined,
        thirdPartyReference: undefined,
      });
    });
  });

  describe('initiateB2CPayment', () => {
    const mockB2CPayload = {
      input_Amount: '50.00',
      input_CustomerMsisdn: '258847654321',
      input_ThirdPartyReference: 'REF123B2C',
      input_TransactionReference: 'TRX123B2C',
      input_ServiceProviderCode: '12345',
      input_PaymentServices: 'BusinessPayBill',
    };
    const mockB2CResponse: MpesaB2CResponse = {
      output_ResponseCode: 'INS-0',
      output_ResponseDesc: 'Request processed successfully',
      output_ConversationID: 'conv_b2c_123',
      output_TransactionID: 'trx_b2c_123',
      output_ThirdPartyReference: 'REF123B2C',
      output_Amount: '50.00',
      output_PrimaryPartyCode: '12345',
      output_RecipientFirstName: 'John',
      output_RecipientLastName: 'Doe',
      output_SettlementAmount: '49.50',
    };

    it('should successfully initiate a B2C payment', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: mockB2CResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

      const response = await mpesaService.initiateB2CPayment(
        50,
        '258847654321',
        'TRX123B2C',
        'REF123B2C'
      );

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/ipg/v1x/b2cPayment/singleStage/',
        mockB2CPayload,
        {
          headers: {
            'Authorization': `Bearer ${encodedPublicKey}`,
            'Origin': mockConfig.origin,
            'X-Api-Key': mockConfig.apiKey,
          },
        }
      );
      expect(response).toEqual(mockB2CResponse);
    });

    it('should throw MpesaError for B2C payment failure', async () => {
      const errorResponse: MpesaB2CResponse = {
        output_ResponseCode: 'INS-5',
        output_ResponseDesc: 'Transaction cancelled by customer',
        output_ConversationID: 'conv_b2c_fail',
        output_TransactionID: 'trx_b2c_fail',
        output_ThirdPartyReference: 'REF123B2C',
      };
      mockedAxios.post.mockResolvedValueOnce({
        data: errorResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

      await expect(
        mpesaService.initiateB2CPayment(50, '258847654321', 'TRX123B2C', 'REF123B2C')
      ).rejects.toThrow(MpesaError);
    });
  });

  describe('queryTransactionStatus', () => {
    const mockQueryPayload = {
      input_QueryReference: 'QUERYREF123',
      input_ServiceProviderCode: '12345',
      input_ThirdPartyReference: 'REFQUERY',
    };
    const mockQueryResponse: MpesaQueryResponse = {
      output_ResponseCode: 'INS-0',
      output_ResponseDesc: 'Request processed successfully',
      output_ConversationID: 'conv_query_123',
      output_TransactionID: 'trx_query_123',
      output_ThirdPartyReference: 'REFQUERY',
      output_ResponseTransactionStatus: 'Completed',
      output_ResponsePaymentStatusCode: '00',
      output_ResponsePaymentStatusDesc: 'Transaction successful',
    };

    it('should successfully query transaction status', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: mockQueryResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

      const response = await mpesaService.queryTransactionStatus(
        'QUERYREF123',
        'REFQUERY'
      );

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/ipg/v1x/queryPaymentStatus/',
        mockQueryPayload,
        {
          headers: {
            'Authorization': `Bearer ${encodedPublicKey}`,
            'Origin': mockConfig.origin,
            'X-Api-Key': mockConfig.apiKey,
          },
        }
      );
      expect(response).toEqual(mockQueryResponse);
    });

    it('should throw MpesaError for query failure', async () => {
      const errorResponse: MpesaQueryResponse = {
        output_ResponseCode: 'INS-18',
        output_ResponseDesc: 'Invalid TransactionID Used',
      };
      mockedAxios.post.mockResolvedValueOnce({
        data: errorResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

      await expect(
        mpesaService.queryTransactionStatus('INVALID_ID', 'REFQUERY')
      ).rejects.toThrow(MpesaError);
    });
  });

  describe('reverseTransaction', () => {
    const mockReversalPayload = {
      input_ReversalAmount: '20.00',
      input_TransactionID: 'ORIGINAL_TRX_ID',
      input_ThirdPartyReference: 'REFREV',
      input_ServiceProviderCode: '12345',
    };
    const mockReversalResponse: MpesaReversalResponse = {
      output_ResponseCode: 'INS-0',
      output_ResponseDesc: 'Request processed successfully',
      output_ConversationID: 'conv_rev_123',
      output_TransactionID: 'trx_rev_123',
      output_ThirdPartyReference: 'REFREV',
    };

    it('should successfully reverse a transaction', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: mockReversalResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

      const response = await mpesaService.reverseTransaction(
        'ORIGINAL_TRX_ID',
        20,
        'REFREV'
      );

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/ipg/v1x/reversal/',
        mockReversalPayload,
        {
          headers: {
            'Authorization': `Bearer ${encodedPublicKey}`,
            'Origin': mockConfig.origin,
            'X-Api-Key': mockConfig.apiKey,
          },
        }
      );
      expect(response).toEqual(mockReversalResponse);
    });

    it('should throw MpesaError for reversal failure', async () => {
      const errorResponse: MpesaReversalResponse = {
        output_ResponseCode: 'INS-6',
        output_ResponseDesc: 'Transaction Failed',
      };
      mockedAxios.post.mockResolvedValueOnce({
        data: errorResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

      await expect(
        mpesaService.reverseTransaction('INVALID_TRX', 20, 'REFREV')
      ).rejects.toThrow(MpesaError);
    });
  });

  describe('initiateB2BPayment', () => {
    const mockB2BPayload = {
      input_Amount: '200.00',
      input_PrimaryPartyCode: 'COMPANY001',
      input_RecipientPartyCode: 'COMPANY002',
      input_ThirdPartyReference: 'REF123B2B',
      input_TransactionReference: 'TRX123B2B',
      input_ServiceProviderCode: '12345',
      input_PaymentServices: 'BusinessToBusinessTransfer',
    };
    const mockB2BResponse: MpesaB2BResponse = {
      output_ResponseCode: 'INS-0',
      output_ResponseDesc: 'Request processed successfully',
      output_ConversationID: 'conv_b2b_123',
      output_TransactionID: 'trx_b2b_123',
      output_ThirdPartyReference: 'REF123B2B',
      output_Amount: '200.00',
      output_PrimaryPartyCode: 'COMPANY001',
      output_RecipientPartyCode: 'COMPANY002',
      output_SettlementAmount: '199.00',
    };

    it('should successfully initiate a B2B payment', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: mockB2BResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

      const response = await mpesaService.initiateB2BPayment(
        200,
        'COMPANY001',
        'COMPANY002',
        'TRX123B2B',
        'REF123B2B'
      );

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/ipg/v1x/b2bPayment/singleStage/',
        mockB2BPayload,
        {
          headers: {
            'Authorization': `Bearer ${encodedPublicKey}`,
            'Origin': mockConfig.origin,
            'X-Api-Key': mockConfig.apiKey,
          },
        }
      );
      expect(response).toEqual(mockB2BResponse);
    });

    it('should throw MpesaError for B2B payment failure', async () => {
      const errorResponse: MpesaB2BResponse = {
        output_ResponseCode: 'INS-9',
        output_ResponseDesc: 'Invalid recipient',
        output_ConversationID: 'conv_b2b_fail',
        output_TransactionID: 'trx_b2b_fail',
        output_ThirdPartyReference: 'REF123B2B',
      };
      mockedAxios.post.mockResolvedValueOnce({
        data: errorResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

      await expect(
        mpesaService.initiateB2BPayment(200, 'COMPANY001', 'COMPANY002', 'TRX123B2B', 'REF123B2B')
      ).rejects.toThrow(MpesaError);
    });
  });
});