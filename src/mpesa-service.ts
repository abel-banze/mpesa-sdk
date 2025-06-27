// src/MpesaService.ts
import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { encodePublicKeyToBase64, generateBearerToken } from './utils';
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
  MpesaErrorDetail
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
    }

    this.config = {
      ...config,
      apiHost,
      timeout: config.timeout || 30000 // Default to 30 seconds
    };

    // Gera o Bearer token criptografando o apiKey com a publicKey
    this.encodedPublicKey = generateBearerToken(this.config.apiKey, this.config.publicKey);

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
    let httpStatus: number = 500;
    let mpesaCode: string = 'INS-1';
    let mpesaDesc: string = 'Internal Error or Unknown API Response';
    let transactionId: string | undefined;
    let conversationId: string | undefined;
    let thirdPartyReference: string | undefined;
    let errorMessage: string;

    if (axios.isAxiosError(error) && error.response) {
      httpStatus = error.response.status;
      if (error.response.data) {
        mpesaCode = error.response.data.output_ResponseCode || mpesaCode;
        mpesaDesc = error.response.data.output_ResponseDesc || mpesaDesc;
        transactionId = error.response.data.output_TransactionID;
        conversationId = error.response.data.output_ConversationID;
        thirdPartyReference = error.response.data.output_ThirdPartyReference;
      }
      errorMessage = `M-Pesa API Error [${context}]: ${mpesaDesc} (Code: ${mpesaCode}, HTTP: ${httpStatus})`;
    } else {
      errorMessage = `Network or Unknown Error [${context}]: ${error.message}`;
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

  // --- getAccessToken method is REMOVED as Public Key acts as the token ---
  // The 'token' (encoded Public Key) will be directly used in transaction headers.

  /**
   * Initiates a C2B (Customer to Business) transaction.
   * @param amount The transaction amount.
   * @param customerMsisdn The M-Pesa customer's phone number (e.g., "25884xxxxxxx").
   * @param transactionReference A unique reference for the transaction.
   * @param thirdPartyReference A third-party reference, if applicable.
   * @returns M-Pesa API response for the C2B transaction.
   * @throws MpesaError if the C2B transaction fails.
   */
  public async initiateC2BPayment(
    amount: number,
    customerMsisdn: string,
    transactionReference: string,
    thirdPartyReference: string
  ): Promise<MpesaC2BResponse> {
    const payload: C2BPaymentPayload = {
      input_Amount: amount.toFixed(2),
      input_CustomerMSISDN: customerMsisdn,
      input_ThirdPartyReference: thirdPartyReference,
      input_TransactionReference: transactionReference,
      input_ServiceProviderCode: this.config.serviceProviderCode,
    };

    const headers = {
      'Authorization': `Bearer ${this.config.publicKey}`,
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

      if (response.data.output_ResponseCode === 'INS-0') {
        return response.data;
      } else {
        this.handleMpesaError({ response: { status: response.status, data: response.data } } as AxiosError<MpesaBaseResponse>, 'C2B');
      }
    } catch (error: any) {
      this.handleMpesaError(error, 'C2B');
    }
  }

  /**
   * Initiates a B2C (Business to Customer) transaction.
   * @param amount The amount to be paid.
   * @param customerMsisdn The M-Pesa customer's phone number who will receive the payment.
   * @param transactionReference A unique reference for the transaction.
   * @param thirdPartyReference A third-party reference, if applicable.
   * @param paymentServices Payment service type (e.g., "BusinessPayBill").
   * @returns M-Pesa API response for the B2C transaction.
   * @throws MpesaError if the B2C transaction fails.
   */
  public async initiateB2CPayment(
    amount: number,
    customerMsisdn: string,
    transactionReference: string,
    thirdPartyReference: string,
    paymentServices: string = "BusinessPayBill"
  ): Promise<MpesaB2CResponse> {
    const payload: B2CPaymentPayload = {
      input_Amount: amount.toFixed(2),
      input_CustomerMsisdn: customerMsisdn,
      input_ThirdPartyReference: thirdPartyReference,
      input_TransactionReference: transactionReference,
      input_ServiceProviderCode: this.config.serviceProviderCode,
      input_PaymentServices: paymentServices,
    };

    try {
      const response: AxiosResponse<MpesaB2CResponse> = await this.httpClient.post('/ipg/v1x/b2cPayment/singleStage/', payload, {
        headers: {
          'Authorization': `Bearer ${this.encodedPublicKey}`,
          'Origin': this.config.origin,
          'X-Api-Key': this.config.apiKey
        }
      });

      if (response.data.output_ResponseCode === 'INS-0') {
        return response.data;
      } else {
        this.handleMpesaError({ response: { status: response.status, data: response.data } } as AxiosError<MpesaBaseResponse>, 'B2C');
      }
    } catch (error: any) {
      this.handleMpesaError(error, 'B2C');
    }
  }

  /**
   * Initiates a B2B (Business to Business) transaction.
   * @param amount O valor da transação.
   * @param primaryPartyCode Código da empresa que envia.
   * @param recipientPartyCode Código da empresa que recebe.
   * @param transactionReference Referência única da transação.
   * @param thirdPartyReference Referência de terceiro.
   * @param paymentServices Tipo de serviço de pagamento (ex: "BusinessToBusinessTransfer").
   * @returns Resposta da API M-Pesa para a transação B2B.
   * @throws MpesaError se a transação falhar.
   */
  public async initiateB2BPayment(
    amount: number,
    primaryPartyCode: string,
    recipientPartyCode: string,
    transactionReference: string,
    thirdPartyReference: string,
    paymentServices: string = "BusinessToBusinessTransfer"
  ): Promise<MpesaB2BResponse> {
    const payload: B2BPaymentPayload = {
      input_Amount: amount.toFixed(2),
      input_PrimaryPartyCode: primaryPartyCode,
      input_RecipientPartyCode: recipientPartyCode,
      input_ThirdPartyReference: thirdPartyReference,
      input_TransactionReference: transactionReference,
      input_ServiceProviderCode: this.config.serviceProviderCode,
      input_PaymentServices: paymentServices,
    };

    try {
      const response: AxiosResponse<MpesaB2BResponse> = await this.httpClient.post('/ipg/v1x/b2bPayment/singleStage/', payload, {
        headers: {
          'Authorization': `Bearer ${this.encodedPublicKey}`,
          'Origin': this.config.origin,
          'X-Api-Key': this.config.apiKey
        }
      });

      if (response.data.output_ResponseCode === 'INS-0') {
        return response.data;
      } else {
        this.handleMpesaError({ response: { status: response.status, data: response.data } } as AxiosError<MpesaBaseResponse>, 'B2B');
      }
    } catch (error: any) {
      this.handleMpesaError(error, 'B2B');
    }
  }

  /**
   * Queries the status of an M-Pesa transaction.
   * @param queryReference The transaction ID or conversation ID to query.
   * @param thirdPartyReference A third-party reference for the query.
   * @returns M-Pesa API response with the transaction status.
   * @throws MpesaError if the query fails.
   */
  public async queryTransactionStatus(
    queryReference: string,
    thirdPartyReference: string
  ): Promise<MpesaQueryResponse> {
    const payload: QueryPaymentPayload = {
      input_QueryReference: queryReference,
      input_ServiceProviderCode: this.config.serviceProviderCode,
      input_ThirdPartyReference: thirdPartyReference,
    };

    try {
      const response: AxiosResponse<MpesaQueryResponse> = await this.httpClient.post('/ipg/v1x/queryPaymentStatus/', payload, {
        headers: {
          'Authorization': `Bearer ${this.encodedPublicKey}`,
          'Origin': this.config.origin,
          'X-Api-Key': this.config.apiKey
        }
      });

      if (response.data.output_ResponseCode === 'INS-0') {
        return response.data;
      } else {
        this.handleMpesaError({ response: { status: response.status, data: response.data } } as AxiosError<MpesaBaseResponse>, 'Query');
      }
    } catch (error: any) {
      this.handleMpesaError(error, 'Query');
    }
  }

  /**
   * Reverses an M-Pesa transaction.
   * @param originalTransactionId The ID of the original transaction to be reversed.
   * @param reversalAmount The amount to be reversed.
   * @param thirdPartyReference A third-party reference for the reversal.
   * @returns M-Pesa API response for the reversal.
   * @throws MpesaError if the reversal fails.
   */
  public async reverseTransaction(
    originalTransactionId: string,
    reversalAmount: number,
    thirdPartyReference: string
  ): Promise<MpesaReversalResponse> {
    const payload: ReversalPaymentPayload = {
      input_ReversalAmount: reversalAmount.toFixed(2),
      input_TransactionID: originalTransactionId,
      input_ThirdPartyReference: thirdPartyReference,
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

      if (response.data.output_ResponseCode === 'INS-0') {
        return response.data;
      } else {
        this.handleMpesaError({ response: { status: response.status, data: response.data } } as AxiosError<MpesaBaseResponse>, 'Reversal');
      }
    } catch (error: any) {
      this.handleMpesaError(error, 'Reversal');
    }
  }
}