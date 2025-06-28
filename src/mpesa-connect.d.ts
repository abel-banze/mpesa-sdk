declare module 'mpesa-sdk-mozambique' {
  export interface MpesaAPIConfig {
    apiKey: string;
    publicKey: string;
    serviceProviderCode: string;
    origin: string;
    apiHost?: string;
    timeout?: number;
    env?: 'sandbox' | 'live';
  }

  export interface C2BArgs {
    amount: number;
    number: string;
    transactionReference: string;
    thirdPartyReference: string;
  }

  export interface B2CArgs {
    amount: number;
    number: string;
    transactionReference: string;
    thirdPartyReference: string;
    paymentServices?: string;
  }

  export interface B2BArgs {
    amount: number;
    primaryPartyCode: string;
    recipientPartyCode: string;
    transactionReference: string;
    thirdPartyReference: string;
    paymentServices?: string;
  }

  export interface QueryArgs {
    queryReference: string;
    thirdPartyReference: string;
  }

  export interface ReversalArgs {
    originalTransactionId: string;
    reversalAmount: number;
    thirdPartyReference: string;
  }

  // --- Respostas Simplificadas e Legíveis ---
  export interface MpesaResponse<T = any> {
    status: 'success' | 'error';
    message: string;
    data?: T;
    code?: string;
    httpStatus?: number;
    transactionId?: string;
    conversationId?: string;
    thirdPartyReference?: string;
    timestamp?: string;
  }

  export interface C2BResponseData {
    transactionId: string;
    conversationId: string;
    thirdPartyReference: string;
    amount: string;
    customerMsisdn: string;
    transactionReference: string;
  }

  export interface B2CResponseData {
    transactionId: string;
    conversationId: string;
    thirdPartyReference: string;
    amount: string;
    customerMsisdn: string;
    transactionReference: string;
    recipientFirstName?: string;
    recipientLastName?: string;
    settlementAmount?: string;
  }

  export interface B2BResponseData {
    transactionId: string;
    conversationId: string;
    thirdPartyReference: string;
    amount: string;
    primaryPartyCode: string;
    recipientPartyCode: string;
    transactionReference: string;
    settlementAmount?: string;
  }

  export interface QueryResponseData {
    transactionId: string;
    conversationId: string;
    thirdPartyReference: string;
    queryReference: string;
    transactionStatus?: string;
    paymentStatusCode?: string;
    paymentStatusDesc?: string;
  }

  export interface ReversalResponseData {
    transactionId: string;
    conversationId: string;
    thirdPartyReference: string;
    originalTransactionId: string;
    reversalAmount: string;
  }

  // --- Mapeamento de Mensagens de Erro ---
  export const MPESA_ERROR_MESSAGES: Record<string, string>;

  export class MpesaService {
    constructor(config: MpesaAPIConfig);
    
    c2b(args: C2BArgs): Promise<MpesaResponse<C2BResponseData>>;
    b2c(args: B2CArgs): Promise<MpesaResponse<B2CResponseData>>;
    b2b(args: B2BArgs): Promise<MpesaResponse<B2BResponseData>>;
    query(args: QueryArgs): Promise<MpesaResponse<QueryResponseData>>;
    reversal(args: ReversalArgs): Promise<MpesaResponse<ReversalResponseData>>;
  }

  export class MpesaError extends Error {
    constructor(message: string, code?: string, details?: any, httpStatus?: number);
    code: string;
    details: any;
    httpStatus: number;
  }

  export function generateUniqueReference(prefix?: string): string;
  export function generateBearerToken(apiKey: string, publicKey: string): string;
  export function formatPublicKey(publicKey: string): string;

  // Response types (legacy - kept for backward compatibility)
  export interface MpesaC2BResponse {
    output_ResponseCode: string;
    output_ResponseDesc: string;
    output_TransactionID: string;
    output_ConversationID: string;
    output_ThirdPartyReference: string;
  }

  export interface MpesaB2CResponse {
    output_ResponseCode: string;
    output_ResponseDesc: string;
    output_TransactionID: string;
    output_ConversationID: string;
    output_ThirdPartyReference: string;
  }

  export interface MpesaB2BResponse {
    output_ResponseCode: string;
    output_ResponseDesc: string;
    output_TransactionID: string;
    output_ConversationID: string;
    output_ThirdPartyReference: string;
  }

  export interface MpesaQueryResponse {
    output_ResponseCode: string;
    output_ResponseDesc: string;
    output_TransactionID: string;
    output_ConversationID: string;
    output_ThirdPartyReference: string;
  }

  export interface MpesaReversalResponse {
    output_ResponseCode: string;
    output_ResponseDesc: string;
    output_TransactionID: string;
    output_ConversationID: string;
    output_ThirdPartyReference: string;
  }
}