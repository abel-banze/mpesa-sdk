// src/MpesaService.ts
import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { encodePublicKeyToBase64, generateBearerToken, formatPublicKey } from './utils';
import {
  MpesaAPIConfig,
  MpesaC2BResponse,
  C2BPaymentPayload,
  MpesaB2CResponse,
  B2CPaymentPayload,
  MpesaB2BResponse,
  B2BPaymentPayload,
  MpesaQueryResponse,
  QueryPaymentPayload,
  MpesaReversalResponse,
  ReversalPaymentPayload,
  MpesaBaseResponse,
  MpesaErrorDetail,
  C2BArgs,
  B2CArgs,
  B2BArgs,
  QueryArgs,
  ReversalArgs,
  MpesaResponse,
  C2BResponseData,
  B2CResponseData,
  B2BResponseData,
  QueryResponseData,
  ReversalResponseData,
  MPESA_ERROR_MESSAGES
} from './types';

/**
 * Custom Error class for M-Pesa API errors.
 */
export class MpesaError extends Error {
  public details: MpesaErrorDetail;

  constructor(message: string, details: MpesaErrorDetail) {
    super(message);
    this.name = 'MpesaError';
    this.details = details;
    Object.setPrototypeOf(this, MpesaError.prototype);
  }
}

export class MpesaService {
  private config: MpesaAPIConfig;
  private httpClient: AxiosInstance;
  private encodedPublicKey: string; // Store the pre-encoded public key

  constructor(config: MpesaAPIConfig) {
    if (!config.apiKey || !config.publicKey || !config.serviceProviderCode || !config.origin) {
      throw new Error('As configurações da API M-Pesa (apiKey, publicKey, serviceProviderCode, origin) são obrigatórias.');
    }

    // Definir host padrão conforme ambiente
    let apiHost = config.apiHost;
    if (config.env === 'sandbox') {
      apiHost = 'api.sandbox.vm.co.mz:18352';
    } else if (config.env === 'live') {
      apiHost = 'api.vm.co.mz:18352';
    } else if (!apiHost) {
      throw new Error('É necessário definir o ambiente (env: "sandbox" ou "live") ou fornecer apiHost.');
    }

    this.config = {
      ...config,
      apiHost,
      timeout: config.timeout || 30000 // Default to 30 seconds
    };

    // Gera o Bearer token criptografando o apiKey com a publicKey (sempre no formato PEM)
    this.encodedPublicKey = generateBearerToken(this.config.apiKey, formatPublicKey(this.config.publicKey));

    // Construct the baseURL including the host and port
    this.httpClient = axios.create({
      baseURL: `https://${this.config.apiHost}/`,
      headers: {
        'Content-Type': 'application/json',
        // The Authorization and X-Api-Key headers will be added per request
      },
      timeout: this.config.timeout,
    });
  }

  /**
   * Helper method to handle M-Pesa specific API errors.
   * This method ensures consistent error reporting across all API calls.
   * @param error The AxiosError object or a generic error.
   * @param context A string describing the context of the error (e.g., "Token", "C2B").
   * @throws MpesaError
   */
  private handleMpesaError(error: AxiosError<MpesaBaseResponse> | Error, context: string): never {
    
    console.log('local error: ', error)
    let httpStatus: number = 500;
    let mpesaCode: string = 'INS-1';
    let mpesaDesc: string = MPESA_ERROR_MESSAGES['INS-1'] || 'Internal Error';
    let transactionId: string | undefined;
    let conversationId: string | undefined;
    let thirdPartyReference: string | undefined;
    let errorMessage: string;

    if (axios.isAxiosError(error) && error.response) {
      httpStatus = error.response.status;
      if (error.response.data) {
        mpesaCode = error.response.data.output_ResponseCode || mpesaCode;
        // Usar mensagem descritiva específica da M-Pesa se disponível
        mpesaDesc = MPESA_ERROR_MESSAGES[mpesaCode] || error.response.data.output_ResponseDesc || mpesaDesc;
        transactionId = error.response.data.output_TransactionID;
        conversationId = error.response.data.output_ConversationID;
        thirdPartyReference = error.response.data.output_ThirdPartyReference;
      }
      errorMessage = `M-Pesa ${context} Error: ${mpesaDesc} (Code: ${mpesaCode}, HTTP: ${httpStatus})`;
    } else {
      // Para erros de rede ou outros erros não relacionados à API
      const networkErrorDesc = MPESA_ERROR_MESSAGES['INS-27'] || 'Network error';
      errorMessage = `M-Pesa ${context} Error: ${networkErrorDesc} - ${error.message}`;
    }

    const errorDetails: MpesaErrorDetail = {
      code: mpesaCode,
      description: mpesaDesc,
      httpStatus: httpStatus,
      transactionId: transactionId,
      conversationId: conversationId,
      thirdPartyReference: thirdPartyReference,
    };

    console.error(`Error in ${context} operation:`, errorMessage, errorDetails);
    throw new MpesaError(errorMessage, errorDetails);
  }

  /**
   * Helper method to transform M-Pesa API responses into a clean, readable format.
   * @param response The raw M-Pesa API response
   * @param context The operation context (C2B, B2C, B2B, Query, Reversal)
   * @returns A clean, readable response object
   */
  private transformResponse<T>(
    response: MpesaBaseResponse, 
    context: string,
    transformData: (response: MpesaBaseResponse) => T
  ): MpesaResponse<T> {
    const isSuccess = response.output_ResponseCode === 'INS-0';
    
    return {
      status: isSuccess ? 'success' : 'error',
      message: response.output_ResponseDesc || 'No description provided',
      data: isSuccess ? transformData(response) : undefined,
      code: response.output_ResponseCode,
      httpStatus: isSuccess ? 200 : 400,
      transactionId: response.output_TransactionID,
      conversationId: response.output_ConversationID,
      thirdPartyReference: response.output_ThirdPartyReference,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Initiates a C2B (Customer to Business) transaction.
   * @param args Object containing amount, number, transactionReference, thirdPartyReference
   * @returns Clean, readable M-Pesa response for the C2B transaction.
   * @throws MpesaError if the C2B transaction fails.
   */
  public async c2b(args: C2BArgs): Promise<MpesaResponse<C2BResponseData>> {
    const payload: C2BPaymentPayload = {
      input_Amount: args.amount.toFixed(2),
      input_CustomerMSISDN: args.number,
      input_ThirdPartyReference: args.thirdPartyReference,
      input_TransactionReference: args.transactionReference,
      input_ServiceProviderCode: this.config.serviceProviderCode,
    };

    const headers = {
      'Authorization': `Bearer ${this.encodedPublicKey}`,
      'Origin': this.config.origin,
      'Content-Type': 'application/json',
    };

    // Log detalhado para depuração
    console.log('C2B Request - Payload:', JSON.stringify(payload, null, 2));
    console.log('C2B Request - Headers:', JSON.stringify(headers, null, 2));

    try {
      const response: AxiosResponse<MpesaC2BResponse> = await this.httpClient.post('/ipg/v1x/c2bPayment/singleStage/', payload, {
        headers
      });

      // Verificar se a resposta é de sucesso
      if (response.data.output_ResponseCode === 'INS-0') {
        return this.transformResponse(response.data, 'C2B', (data) => ({
          transactionId: data.output_TransactionID || '',
          conversationId: data.output_ConversationID || '',
          thirdPartyReference: data.output_ThirdPartyReference || '',
          amount: args.amount.toFixed(2),
          customerMsisdn: args.number,
          transactionReference: args.transactionReference
        }));
      } else {
        // Lançar erro para respostas não bem-sucedidas
        this.handleMpesaError({ response: { status: response.status, data: response.data } } as AxiosError<MpesaBaseResponse>, 'C2B');
      }
    } catch (error: any) {
      this.handleMpesaError(error, 'C2B');
    }
  }

  /**
   * Initiates a B2C (Business to Customer) transaction.
   * @param args Object containing amount, number, transactionReference, thirdPartyReference, paymentServices
   * @returns Clean, readable M-Pesa response for the B2C transaction.
   * @throws MpesaError if the B2C transaction fails.
   */
  public async b2c(args: B2CArgs): Promise<MpesaResponse<B2CResponseData>> {
    const payload: B2CPaymentPayload = {
      input_Amount: args.amount.toFixed(2),
      input_CustomerMsisdn: args.number,
      input_ThirdPartyReference: args.thirdPartyReference,
      input_TransactionReference: args.transactionReference,
      input_ServiceProviderCode: this.config.serviceProviderCode,
      input_PaymentServices: args.paymentServices || "BusinessPayBill",
    };

    try {
      const response: AxiosResponse<MpesaB2CResponse> = await this.httpClient.post('/ipg/v1x/b2cPayment/singleStage/', payload, {
        headers: {
          'Authorization': `Bearer ${this.encodedPublicKey}`,
          'Origin': this.config.origin,
          'X-Api-Key': this.config.apiKey
        }
      });

      // Verificar se a resposta é de sucesso
      if (response.data.output_ResponseCode === 'INS-0') {
        return this.transformResponse(response.data, 'B2C', (data) => ({
          transactionId: data.output_TransactionID || '',
          conversationId: data.output_ConversationID || '',
          thirdPartyReference: data.output_ThirdPartyReference || '',
          amount: args.amount.toFixed(2),
          customerMsisdn: args.number,
          transactionReference: args.transactionReference,
          recipientFirstName: (data as MpesaB2CResponse).output_RecipientFirstName,
          recipientLastName: (data as MpesaB2CResponse).output_RecipientLastName,
          settlementAmount: (data as MpesaB2CResponse).output_SettlementAmount
        }));
      } else {
        // Lançar erro para respostas não bem-sucedidas
        this.handleMpesaError({ response: { status: response.status, data: response.data } } as AxiosError<MpesaBaseResponse>, 'B2C');
      }
    } catch (error: any) {
      this.handleMpesaError(error, 'B2C');
    }
  }

  /**
   * Initiates a B2B (Business to Business) transaction.
   * @param args Object containing amount, primaryPartyCode, recipientPartyCode, transactionReference, thirdPartyReference, paymentServices
   * @returns Clean, readable M-Pesa response for the B2B transaction.
   * @throws MpesaError if the B2B transaction fails.
   */
  public async b2b(args: B2BArgs): Promise<MpesaResponse<B2BResponseData>> {
    const payload: B2BPaymentPayload = {
      input_Amount: args.amount.toFixed(2),
      input_PrimaryPartyCode: args.primaryPartyCode,
      input_RecipientPartyCode: args.recipientPartyCode,
      input_ThirdPartyReference: args.thirdPartyReference,
      input_TransactionReference: args.transactionReference,
      input_ServiceProviderCode: this.config.serviceProviderCode,
      input_PaymentServices: args.paymentServices || "BusinessToBusinessTransfer",
    };

    try {
      const response: AxiosResponse<MpesaB2BResponse> = await this.httpClient.post('/ipg/v1x/b2bPayment/singleStage/', payload, {
        headers: {
          'Authorization': `Bearer ${this.encodedPublicKey}`,
          'Origin': this.config.origin,
          'X-Api-Key': this.config.apiKey
        }
      });

      // Verificar se a resposta é de sucesso
      if (response.data.output_ResponseCode === 'INS-0') {
        return this.transformResponse(response.data, 'B2B', (data) => ({
          transactionId: data.output_TransactionID || '',
          conversationId: data.output_ConversationID || '',
          thirdPartyReference: data.output_ThirdPartyReference || '',
          amount: args.amount.toFixed(2),
          primaryPartyCode: args.primaryPartyCode,
          recipientPartyCode: args.recipientPartyCode,
          transactionReference: args.transactionReference,
          settlementAmount: (data as MpesaB2BResponse).output_SettlementAmount
        }));
      } else {
        // Lançar erro para respostas não bem-sucedidas
        this.handleMpesaError({ response: { status: response.status, data: response.data } } as AxiosError<MpesaBaseResponse>, 'B2B');
      }
    } catch (error: any) {
      this.handleMpesaError(error, 'B2B');
    }
  }

  /**
   * Queries the status of an M-Pesa transaction.
   * @param args Object containing queryReference, thirdPartyReference
   * @returns Clean, readable M-Pesa response with the transaction status.
   * @throws MpesaError if the query fails.
   */
  public async query(args: QueryArgs): Promise<MpesaResponse<QueryResponseData>> {
    const payload: QueryPaymentPayload = {
      input_QueryReference: args.queryReference,
      input_ServiceProviderCode: this.config.serviceProviderCode,
      input_ThirdPartyReference: args.thirdPartyReference,
    };

    try {
      const response: AxiosResponse<MpesaQueryResponse> = await this.httpClient.post('/ipg/v1x/queryPaymentStatus/', payload, {
        headers: {
          'Authorization': `Bearer ${this.encodedPublicKey}`,
          'Origin': this.config.origin,
          'X-Api-Key': this.config.apiKey
        }
      });

      // Verificar se a resposta é de sucesso
      if (response.data.output_ResponseCode === 'INS-0') {
        return this.transformResponse(response.data, 'Query', (data) => ({
          transactionId: data.output_TransactionID || '',
          conversationId: data.output_ConversationID || '',
          thirdPartyReference: data.output_ThirdPartyReference || '',
          queryReference: args.queryReference,
          transactionStatus: (data as MpesaQueryResponse).output_ResponseTransactionStatus,
          paymentStatusCode: (data as MpesaQueryResponse).output_ResponsePaymentStatusCode,
          paymentStatusDesc: (data as MpesaQueryResponse).output_ResponsePaymentStatusDesc
        }));
      } else {
        // Lançar erro para respostas não bem-sucedidas
        this.handleMpesaError({ response: { status: response.status, data: response.data } } as AxiosError<MpesaBaseResponse>, 'Query');
      }
    } catch (error: any) {
      this.handleMpesaError(error, 'Query');
    }
  }

  /**
   * Reverses an M-Pesa transaction.
   * @param args Object containing originalTransactionId, reversalAmount, thirdPartyReference
   * @returns Clean, readable M-Pesa response for the reversal.
   * @throws MpesaError if the reversal fails.
   */
  public async reversal(args: ReversalArgs): Promise<MpesaResponse<ReversalResponseData>> {
    const payload: ReversalPaymentPayload = {
      input_ReversalAmount: args.reversalAmount.toFixed(2),
      input_TransactionID: args.originalTransactionId,
      input_ThirdPartyReference: args.thirdPartyReference,
      input_ServiceProviderCode: this.config.serviceProviderCode,
    };

    try {
      const response: AxiosResponse<MpesaReversalResponse> = await this.httpClient.post('/ipg/v1x/reversal/', payload, {
        headers: {
          'Authorization': `Bearer ${this.encodedPublicKey}`,
          'Origin': this.config.origin,
          'X-Api-Key': this.config.apiKey
        }
      });

      // Verificar se a resposta é de sucesso
      if (response.data.output_ResponseCode === 'INS-0') {
        return this.transformResponse(response.data, 'Reversal', (data) => ({
          transactionId: data.output_TransactionID || '',
          conversationId: data.output_ConversationID || '',
          thirdPartyReference: data.output_ThirdPartyReference || '',
          originalTransactionId: args.originalTransactionId,
          reversalAmount: args.reversalAmount.toFixed(2)
        }));
      } else {
        // Lançar erro para respostas não bem-sucedidas
        this.handleMpesaError({ response: { status: response.status, data: response.data } } as AxiosError<MpesaBaseResponse>, 'Reversal');
      }
    } catch (error: any) {
      this.handleMpesaError(error, 'Reversal');
    }
  }
}