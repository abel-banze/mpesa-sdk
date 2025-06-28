// src/MpesaService.test.ts
import axios from 'axios';
import { MpesaService, MpesaError } from '../src/mpesa-service'; // Import MpesaError
import { MpesaAPIConfig, MpesaC2BResponse, MpesaQueryResponse, MpesaB2CResponse, MpesaReversalResponse, MpesaB2BResponse, MpesaResponse, C2BResponseData, B2CResponseData, B2BResponseData, QueryResponseData, ReversalResponseData } from '../src/types';
import { encodePublicKeyToBase64 } from '../src/utils';
import * as utils from '../src/utils';

// Mockar o módulo axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MpesaService', () => {
  let mpesaService: MpesaService;
  const mockConfig: MpesaAPIConfig = {
    apiKey: 'test-api-key',
    publicKey: 'test-public-key',
    serviceProviderCode: 'test-provider',
    origin: 'test-origin',
    env: 'sandbox'
  };

  const encodedPublicKey = encodePublicKeyToBase64(mockConfig.publicKey);

  beforeEach(() => {
    // Reset mocks before each test
    mockedAxios.create.mockReturnThis(); // Ensure axios.create returns itself for chaining
    mockedAxios.post.mockClear();
    mockedAxios.get.mockClear(); // Though getAccessToken is removed, clear just in case
    jest.spyOn(utils, 'generateBearerToken').mockReturnValue('mocked-bearer-token');
    mpesaService = new MpesaService(mockConfig);
  });

  // Since getAccessToken is removed, no need to test it explicitly.
  // The encodedPublicKey is now passed directly in the Authorization header.

  describe('c2b', () => {
    it('should initiate a C2B payment successfully', async () => {
      const mockResponse: MpesaC2BResponse = {
        output_ResponseCode: 'INS-0',
        output_ResponseDesc: 'Request processed successfully',
        output_TransactionID: 'test-transaction-id',
        output_ConversationID: 'test-conversation-id',
        output_ThirdPartyReference: 'test-third-party-ref'
      };

      (axios.post as jest.Mock).mockResolvedValueOnce({ data: mockResponse });

      const result = await mpesaService.c2b({
        amount: 100.00,
        number: '25884xxxxxxx',
        transactionReference: 'test-ref',
        thirdPartyReference: 'test-third-party-ref'
      });

      expect(result).toMatchObject({
        status: 'success',
        message: 'Request processed successfully',
        code: 'INS-0',
        httpStatus: 200,
        data: {
          transactionId: 'test-transaction-id',
          conversationId: 'test-conversation-id',
          thirdPartyReference: 'test-third-party-ref',
          amount: '100.00',
          customerMsisdn: '25884xxxxxxx',
          transactionReference: 'test-ref'
        }
      });
      expect(axios.post).toHaveBeenCalledWith(
        '/ipg/v1x/c2bPayment/singleStage/',
        expect.objectContaining({
          input_Amount: '100.00',
          input_CustomerMSISDN: '25884xxxxxxx',
          input_TransactionReference: 'test-ref',
          input_ThirdPartyReference: 'test-third-party-ref',
          input_ServiceProviderCode: 'test-provider'
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer '),
            'Origin': 'test-origin'
          })
        })
      );
    });

    it('should throw MpesaError when C2B payment fails', async () => {
      const mockErrorResponse: MpesaC2BResponse = {
        output_ResponseCode: 'INS-1',
        output_ResponseDesc: 'Authentication failed',
        output_TransactionID: '',
        output_ConversationID: '',
        output_ThirdPartyReference: ''
      };

      (axios.post as jest.Mock).mockResolvedValueOnce({ data: mockErrorResponse });

      try {
        await mpesaService.c2b({
          amount: 100.00,
          number: '25884xxxxxxx',
          transactionReference: 'test-ref',
          thirdPartyReference: 'test-third-party-ref'
        });
        fail('Should have thrown MpesaError');
      } catch (error) {
        // Type assertion para evitar erro TS18046
        const mpesaErr = error as MpesaError;
        expect(mpesaErr).toBeInstanceOf(MpesaError);
        expect(mpesaErr.details.code).toBe('INS-1');
      }
    });
  });

  describe('b2c', () => {
    it('should initiate a B2C payment successfully', async () => {
      const mockResponse: MpesaB2CResponse = {
        output_ResponseCode: 'INS-0',
        output_ResponseDesc: 'Request processed successfully',
        output_TransactionID: 'test-transaction-id',
        output_ConversationID: 'test-conversation-id',
        output_ThirdPartyReference: 'test-third-party-ref',
        output_RecipientFirstName: 'John',
        output_RecipientLastName: 'Doe',
        output_SettlementAmount: '50.00'
      };

      (axios.post as jest.Mock).mockResolvedValueOnce({ data: mockResponse });

      const result = await mpesaService.b2c({
        amount: 100.00,
        number: '25884xxxxxxx',
        transactionReference: 'test-ref',
        thirdPartyReference: 'test-third-party-ref'
      });

      expect(result).toMatchObject({
        status: 'success',
        message: 'Request processed successfully',
        code: 'INS-0',
        httpStatus: 200,
        data: {
          transactionId: 'test-transaction-id',
          conversationId: 'test-conversation-id',
          thirdPartyReference: 'test-third-party-ref',
          amount: '100.00',
          customerMsisdn: '25884xxxxxxx',
          transactionReference: 'test-ref',
          recipientFirstName: 'John',
          recipientLastName: 'Doe',
          settlementAmount: '50.00'
        }
      });
      expect(axios.post).toHaveBeenCalledWith(
        '/ipg/v1x/b2cPayment/singleStage/',
        expect.objectContaining({
          input_Amount: '100.00',
          input_CustomerMsisdn: '25884xxxxxxx',
          input_TransactionReference: 'test-ref',
          input_ThirdPartyReference: 'test-third-party-ref',
          input_ServiceProviderCode: 'test-provider',
          input_PaymentServices: 'BusinessPayBill'
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer '),
            'Origin': 'test-origin',
            'X-Api-Key': 'test-api-key'
          })
        })
      );
    });
  });

  describe('b2b', () => {
    it('should initiate a B2B payment successfully', async () => {
      const mockResponse: MpesaB2BResponse = {
        output_ResponseCode: 'INS-0',
        output_ResponseDesc: 'Request processed successfully',
        output_TransactionID: 'test-transaction-id',
        output_ConversationID: 'test-conversation-id',
        output_ThirdPartyReference: 'test-third-party-ref',
        output_SettlementAmount: '1000.00'
      };

      (axios.post as jest.Mock).mockResolvedValueOnce({ data: mockResponse });

      const result = await mpesaService.b2b({
        amount: 100.00,
        primaryPartyCode: 'COMPANY001',
        recipientPartyCode: 'COMPANY002',
        transactionReference: 'test-ref',
        thirdPartyReference: 'test-third-party-ref'
      });

      expect(result).toMatchObject({
        status: 'success',
        message: 'Request processed successfully',
        code: 'INS-0',
        httpStatus: 200,
        data: {
          transactionId: 'test-transaction-id',
          conversationId: 'test-conversation-id',
          thirdPartyReference: 'test-third-party-ref',
          amount: '100.00',
          primaryPartyCode: 'COMPANY001',
          recipientPartyCode: 'COMPANY002',
          transactionReference: 'test-ref',
          settlementAmount: '1000.00'
        }
      });
      expect(axios.post).toHaveBeenCalledWith(
        '/ipg/v1x/b2bPayment/singleStage/',
        expect.objectContaining({
          input_Amount: '100.00',
          input_PrimaryPartyCode: 'COMPANY001',
          input_RecipientPartyCode: 'COMPANY002',
          input_TransactionReference: 'test-ref',
          input_ThirdPartyReference: 'test-third-party-ref',
          input_ServiceProviderCode: 'test-provider',
          input_PaymentServices: 'BusinessToBusinessTransfer'
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer '),
            'Origin': 'test-origin',
            'X-Api-Key': 'test-api-key'
          })
        })
      );
    });
  });

  describe('query', () => {
    it('should query transaction status successfully', async () => {
      const mockResponse: MpesaQueryResponse = {
        output_ResponseCode: 'INS-0',
        output_ResponseDesc: 'Request processed successfully',
        output_TransactionID: 'test-transaction-id',
        output_ConversationID: 'test-conversation-id',
        output_ThirdPartyReference: 'test-third-party-ref',
        output_ResponseTransactionStatus: 'SUCCESS',
        output_ResponsePaymentStatusCode: 'INS-0',
        output_ResponsePaymentStatusDesc: 'Payment successful'
      };

      (axios.post as jest.Mock).mockResolvedValueOnce({ data: mockResponse });

      const result = await mpesaService.query({
        queryReference: 'test-query-ref',
        thirdPartyReference: 'test-third-party-ref'
      });

      expect(result).toMatchObject({
        status: 'success',
        message: 'Request processed successfully',
        code: 'INS-0',
        httpStatus: 200,
        data: {
          transactionId: 'test-transaction-id',
          conversationId: 'test-conversation-id',
          thirdPartyReference: 'test-third-party-ref',
          queryReference: 'test-query-ref',
          transactionStatus: 'SUCCESS',
          paymentStatusCode: 'INS-0',
          paymentStatusDesc: 'Payment successful'
        }
      });
      expect(axios.post).toHaveBeenCalledWith(
        '/ipg/v1x/queryPaymentStatus/',
        expect.objectContaining({
          input_QueryReference: 'test-query-ref',
          input_ServiceProviderCode: 'test-provider',
          input_ThirdPartyReference: 'test-third-party-ref'
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer '),
            'Origin': 'test-origin',
            'X-Api-Key': 'test-api-key'
          })
        })
      );
    });
  });

  describe('reversal', () => {
    it('should reverse transaction successfully', async () => {
      const mockResponse: MpesaReversalResponse = {
        output_ResponseCode: 'INS-0',
        output_ResponseDesc: 'Request processed successfully',
        output_TransactionID: 'test-transaction-id',
        output_ConversationID: 'test-conversation-id',
        output_ThirdPartyReference: 'test-third-party-ref'
      };

      (axios.post as jest.Mock).mockResolvedValueOnce({ data: mockResponse });

      const result = await mpesaService.reversal({
        originalTransactionId: 'original-transaction-id',
        reversalAmount: 50.00,
        thirdPartyReference: 'test-third-party-ref'
      });

      expect(result).toMatchObject({
        status: 'success',
        message: 'Request processed successfully',
        code: 'INS-0',
        httpStatus: 200,
        data: {
          transactionId: 'test-transaction-id',
          conversationId: 'test-conversation-id',
          thirdPartyReference: 'test-third-party-ref',
          originalTransactionId: 'original-transaction-id',
          reversalAmount: '50.00'
        }
      });
      expect(axios.post).toHaveBeenCalledWith(
        '/ipg/v1x/reversal/',
        expect.objectContaining({
          input_ReversalAmount: '50.00',
          input_TransactionID: 'original-transaction-id',
          input_ThirdPartyReference: 'test-third-party-ref',
          input_ServiceProviderCode: 'test-provider'
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer '),
            'Origin': 'test-origin',
            'X-Api-Key': 'test-api-key'
          })
        })
      );
    });
  });
});