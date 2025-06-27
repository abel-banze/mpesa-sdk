// src/MpesaService.ts
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { encodePublicKeyToBase64 } from './utils';
import {
  MpesaAPIConfig,
  MpesaAccessTokenResponse,
  MpesaC2BResponse,
  C2BPaymentPayload,
  MpesaB2CResponse,
  B2CPaymentPayload,
  MpesaQueryResponse,
  QueryPaymentPayload,
  MpesaReversalResponse,
  ReversalPaymentPayload,
  MpesaBaseResponse
} from './types';

export class MpesaService {
  private config: MpesaAPIConfig;
  private httpClient: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: MpesaAPIConfig) {
    if (!config.apiKey || !config.publicKey || !config.serviceProviderCode || !config.apiHost) {
      throw new Error('As configurações da API M-Pesa (apiKey, publicKey, serviceProviderCode, apiHost) são obrigatórias.');
    }

    this.config = {
      ...config,
      timeout: config.timeout || 30000 // Padrão de 30 segundos
    };

    this.httpClient = axios.create({
      baseURL: `https://${this.config.apiHost}/`,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: this.config.timeout,
    });
  }

  /**
   * Valida e obtém um novo token de acesso se o atual estiver expirado ou ausente.
   * Caching do token é implementado para otimização.
   * @returns O token de acesso válido.
   */
  public async getAccessToken(): Promise<string> {
    const now = new Date();
    // Verifica se o token existe e ainda é válido (com um buffer de 60 segundos)
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry.getTime() > (now.getTime() + 60 * 1000)) {
      // console.log('Reutilizando token de acesso existente.');
      return this.accessToken;
    }

    // console.log('Obtendo novo token de acesso...');
    try {
      const response: AxiosResponse<MpesaAccessTokenResponse> = await this.httpClient.get('sandbox/vodacom/c2b/v2/token', {
        headers: {
          'Authorization': `Bearer ${encodePublicKeyToBase64(this.config.publicKey)}`,
          'Origin': this.config.origin,
          'X-Api-Key': this.config.apiKey
        }
      });

      if (response.data.output_ResponseCode === 'INS-0') {
        this.accessToken = response.data.output_Token;
        // A API retorna a validade em segundos.
        const expirySeconds = parseInt(response.data.output_TokenExpiry);
        this.tokenExpiry = new Date(now.getTime() + (expirySeconds * 1000));
        // console.log('Token de acesso obtido com sucesso!');
        return this.accessToken;
      } else {
        throw new Error(`M-Pesa API Error [Token]: ${response.data.output_ResponseDesc} (Code: ${response.data.output_ResponseCode})`);
      }
    } catch (error: any) {
      const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
      console.error('Erro ao obter token de acesso:', errorMessage);
      throw new Error(`Falha ao obter token de acesso: ${errorMessage}`);
    }
  }

  /**
   * Inicia uma transação C2B (Customer to Business - Pagamento de Cliente para Empresa).
   * @param amount O valor da transação.
   * @param customerMsisdn O número de telefone do cliente M-Pesa.
   * @param transactionReference Uma referência única para a transação.
   * @param thirdPartyReference Uma referência de terceiro, se aplicável.
   * @returns Resposta da API M-Pesa para a transação C2B.
   */
  public async initiateC2BPayment(
    amount: number,
    customerMsisdn: string,
    transactionReference: string,
    thirdPartyReference: string
  ): Promise<MpesaC2BResponse> {
    const token = await this.getAccessToken();

    const payload: C2BPaymentPayload = {
      input_Amount: amount.toFixed(2), // Formata para 2 casas decimais
      input_CustomerMsisdn: customerMsisdn,
      input_ThirdPartyReference: thirdPartyReference,
      input_TransactionReference: transactionReference,
      input_ServiceProviderCode: this.config.serviceProviderCode,
    };

    try {
      const response: AxiosResponse<MpesaC2BResponse> = await this.httpClient.post('sandbox/vodacom/c2b/v2/singleStage', payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Origin': this.config.origin,
          'X-Api-Key': this.config.apiKey
        }
      });

      if (response.data.output_ResponseCode === 'INS-0') {
        return response.data;
      } else {
        throw new Error(`M-Pesa API Error [C2B]: ${response.data.output_ResponseDesc} (Code: ${response.data.output_ResponseCode})`);
      }
    } catch (error: any) {
      const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
      console.error('Erro ao iniciar pagamento C2B:', errorMessage);
      throw new Error(`Falha na transação C2B: ${errorMessage}`);
    }
  }

  /**
   * Inicia uma transação B2C (Business to Customer - Pagamento de Empresa para Cliente).
   * @param amount O valor a ser pago.
   * @param customerMsisdn O número de telefone do cliente M-Pesa que receberá o pagamento.
   * @param transactionReference Uma referência única para a transação.
   * @param thirdPartyReference Uma referência de terceiro, se aplicável.
   * @param paymentServices Tipo de serviço de pagamento (ex: "BusinessPayBill").
   * @returns Resposta da API M-Pesa para a transação B2C.
   */
  public async initiateB2CPayment(
    amount: number,
    customerMsisdn: string,
    transactionReference: string,
    thirdPartyReference: string,
    paymentServices: string = "BusinessPayBill" // Valor padrão comum
  ): Promise<MpesaB2CResponse> {
    const token = await this.getAccessToken();

    const payload: B2CPaymentPayload = {
      input_Amount: amount.toFixed(2),
      input_CustomerMsisdn: customerMsisdn,
      input_ThirdPartyReference: thirdPartyReference,
      input_TransactionReference: transactionReference,
      input_ServiceProviderCode: this.config.serviceProviderCode,
      input_PaymentServices: paymentServices,
    };

    try {
      const response: AxiosResponse<MpesaB2CResponse> = await this.httpClient.post('sandbox/vodacom/b2c/v2/singleStage', payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Origin': this.config.origin,
          'X-Api-Key': this.config.apiKey
        }
      });

      if (response.data.output_ResponseCode === 'INS-0') {
        return response.data;
      } else {
        throw new Error(`M-Pesa API Error [B2C]: ${response.data.output_ResponseDesc} (Code: ${response.data.output_ResponseCode})`);
      }
    } catch (error: any) {
      const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
      console.error('Erro ao iniciar pagamento B2C:', errorMessage);
      throw new Error(`Falha na transação B2C: ${errorMessage}`);
    }
  }

  /**
   * Consulta o status de uma transação M-Pesa.
   * @param queryReference O ID da transação ou da conversa para consulta.
   * @param thirdPartyReference Uma referência de terceiro para a consulta.
   * @returns Resposta da API M-Pesa com o status da transação.
   */
  public async queryTransactionStatus(
    queryReference: string,
    thirdPartyReference: string
  ): Promise<MpesaQueryResponse> {
    const token = await this.getAccessToken();

    const payload: QueryPaymentPayload = {
      input_QueryReference: queryReference,
      input_ServiceProviderCode: this.config.serviceProviderCode,
      input_ThirdPartyReference: thirdPartyReference,
    };

    try {
      const response: AxiosResponse<MpesaQueryResponse> = await this.httpClient.post('sandbox/vodacom/query/v2/transactionStatus', payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Origin': this.config.origin,
          'X-Api-Key': this.config.apiKey
        }
      });

      if (response.data.output_ResponseCode === 'INS-0') {
        return response.data;
      } else {
        throw new Error(`M-Pesa API Error [Query]: ${response.data.output_ResponseDesc} (Code: ${response.data.output_ResponseCode})`);
      }
    } catch (error: any) {
      const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
      console.error('Erro ao consultar status da transação:', errorMessage);
      throw new Error(`Falha ao consultar status da transação: ${errorMessage}`);
    }
  }

  /**
   * Reverte uma transação M-Pesa.
   * @param originalTransactionId O ID da transação original a ser revertida.
   * @param reversalAmount O valor a ser revertido.
   * @param thirdPartyReference Uma referência de terceiro para a reversão.
   * @returns Resposta da API M-Pesa para a reversão.
   */
  public async reverseTransaction(
    originalTransactionId: string,
    reversalAmount: number,
    thirdPartyReference: string
  ): Promise<MpesaReversalResponse> {
    const token = await this.getAccessToken();

    const payload: ReversalPaymentPayload = {
      input_ReversalAmount: reversalAmount.toFixed(2),
      input_TransactionID: originalTransactionId,
      input_ThirdPartyReference: thirdPartyReference,
      input_ServiceProviderCode: this.config.serviceProviderCode,
    };

    try {
      const response: AxiosResponse<MpesaReversalResponse> = await this.httpClient.post('sandbox/vodacom/reversal/v2/singleStage', payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Origin': this.config.origin,
          'X-Api-Key': this.config.apiKey
        }
      });

      if (response.data.output_ResponseCode === 'INS-0') {
        return response.data;
      } else {
        throw new Error(`M-Pesa API Error [Reversal]: ${response.data.output_ResponseDesc} (Code: ${response.data.output_ResponseCode})`);
      }
    } catch (error: any) {
      const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
      console.error('Erro ao reverter transação:', errorMessage);
      throw new Error(`Falha ao reverter transação: ${errorMessage}`);
    }
  }
}