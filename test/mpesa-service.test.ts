// test/MpesaService.test.ts
import { MpesaService } from '../src/mpesa-service';
import { MpesaAPIConfig } from '../src/types';
import axios from 'axios';

// Mock do axios para evitar chamadas reais à API
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MpesaService', () => {
  let mpesaService: MpesaService;
  const mockConfig: MpesaAPIConfig = {
    apiKey: 'mock_api_key',
    publicKey: 'mock_public_key',
    serviceProviderCode: 'mock_sp_code',
    origin: 'mock.origin.com',
    apiHost: 'api.sandbox.vm.co.mz',
  };

  beforeEach(() => {
    // Resetar mocks antes de cada teste
    mockedAxios.get.mockReset();
    mockedAxios.post.mockReset();
    mpesaService = new MpesaService(mockConfig);
  });

  describe('getAccessToken', () => {
    it('should return a new access token if none exists', async () => {
      const mockTokenResponse = {
        data: {
          output_ResponseCode: 'INS-0',
          output_ResponseDesc: 'Request processed successfully',
          output_TransactionID: 'mock_trx_id_token',
          output_ConversationID: 'mock_conv_id_token',
          output_ThirdPartyReference: 'mock_tpr_token',
          output_Token: 'new_mock_access_token',
          output_TokenExpiry: '3600', // 1 hora
        },
      };
      mockedAxios.get.mockResolvedValueOnce(mockTokenResponse);

      const token = await mpesaService.getAccessToken();
      expect(token).toBe('new_mock_access_token');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'sandbox/vodacom/c2b/v2/token',
        expect.any(Object)
      );
    });

    it('should reuse existing token if not expired', async () => {
      // Primeiro, simula a obtenção de um token (que será armazenado)
      const mockTokenResponse = {
        data: {
          output_ResponseCode: 'INS-0',
          output_ResponseDesc: 'Request processed successfully',
          output_TransactionID: 'mock_trx_id_token_1',
          output_ConversationID: 'mock_conv_id_token_1',
          output_ThirdPartyReference: 'mock_tpr_token_1',
          output_Token: 'first_mock_access_token',
          output_TokenExpiry: '3600', // Válido por 1 hora
        },
      };
      mockedAxios.get.mockResolvedValueOnce(mockTokenResponse);
      await mpesaService.getAccessToken();

      // Agora, chama novamente e espera que o token seja reutilizado
      const token = await mpesaService.getAccessToken();
      expect(token).toBe('first_mock_access_token');
      expect(mockedAxios.get).toHaveBeenCalledTimes(1); // Não deve ter chamado a API novamente
    });

    it('should throw an error if token request fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

      await expect(mpesaService.getAccessToken()).rejects.toThrow('Falha ao obter token de acesso: Network Error');
    });

    it('should throw an error if M-Pesa returns an error code for token', async () => {
      const mockErrorResponse = {
        data: {
          output_ResponseCode: 'INS-999',
          output_ResponseDesc: 'Invalid Credentials',
          output_TransactionID: '',
          output_ConversationID: '',
          output_ThirdPartyReference: '',
        },
      };
      mockedAxios.get.mockResolvedValueOnce(mockErrorResponse);

      await expect(mpesaService.getAccessToken()).rejects.toThrow('M-Pesa API Error [Token]: Invalid Credentials (Code: INS-999)');
    });
  });

  describe('initiateC2BPayment', () => {
    // Mock do token de acesso para os testes de transação
    beforeEach(() => {
      const mockTokenResponse = {
        data: {
          output_ResponseCode: 'INS-0',
          output_Token: 'mock_valid_token',
          output_TokenExpiry: '3600',
        },
      };
      mockedAxios.get.mockResolvedValue(mockTokenResponse); // Mock para qualquer chamada de getAccessToken
    });

    it('should successfully initiate a C2B payment', async () => {
      const mockC2BResponse = {
        data: {
          output_ResponseCode: 'INS-0',
          output_ResponseDesc: 'Request accepted for processing',
          output_TransactionID: 'MPA_C2B_TRX_123',
          output_ConversationID: 'CONV_C2B_123',
          output_ThirdPartyReference: 'THIRD_C2B_REF_123',
        },
      };
      mockedAxios.post.mockResolvedValueOnce(mockC2BResponse);

      const response = await mpesaService.initiateC2BPayment(
        100,
        '258841234567',
        'TRX_REF_C2B',
        'TP_REF_C2B'
      );

      expect(response).toEqual(mockC2BResponse.data);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'sandbox/vodacom/c2b/v2/singleStage',
        expect.objectContaining({ input_Amount: '100.00', input_CustomerMsisdn: '258841234567' }),
        expect.any(Object)
      );
    });

    it('should throw an error if C2B payment fails', async () => {
      const mockErrorResponse = {
        data: {
          output_ResponseCode: 'INS-10',
          output_ResponseDesc: 'Insufficient Funds',
          output_TransactionID: '',
          output_ConversationID: '',
          output_ThirdPartyReference: '',
        },
      };
      mockedAxios.post.mockResolvedValueOnce(mockErrorResponse);

      await expect(
        mpesaService.initiateC2BPayment(10, '258841234567', 'TRX_REF_FAIL', 'TP_REF_FAIL')
      ).rejects.toThrow('M-Pesa API Error [C2B]: Insufficient Funds (Code: INS-10)');
    });
  });

  // Você pode adicionar mais blocos describe para B2C, Query e Reversal
  // seguindo a mesma lógica de mock para axios.get (token) e axios.post (operação)
});