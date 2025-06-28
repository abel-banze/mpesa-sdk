// src/types.ts

// --- Custom Error Interface ---
export interface MpesaErrorDetail {
  code: string;
  description: string;
  httpStatus: number;
  transactionId?: string;
  conversationId?: string;
  thirdPartyReference?: string;
}

// --- SDK Configuration ---
export interface MpesaAPIConfig {
  apiKey: string;
  publicKey: string;
  serviceProviderCode: string;
  origin: string;
  apiHost?: string; // Opcional, definido automaticamente pelo ambiente
  timeout?: number; // Request timeout in ms
  env?: 'sandbox' | 'live'; // Novo campo para ambiente
}

// --- M-Pesa API Responses (Base and Specific) ---
export interface MpesaBaseResponse {
  output_ResponseCode: string;
  output_ResponseDesc: string;
  output_TransactionID?: string;
  output_ConversationID?: string;
  output_ThirdPartyReference?: string;
}

export interface MpesaAccessTokenResponse extends MpesaBaseResponse {
  output_Token: string;
  output_TokenExpiry: string; // In seconds
}

export interface MpesaC2BResponse extends MpesaBaseResponse {
  // C2B Single Stage specific fields (as per M-Pesa docs, if any beyond base)
}

export interface MpesaB2CResponse extends MpesaBaseResponse {
  output_Amount?: string;
  output_PrimaryPartyCode?: string;
  output_RecipientFirstName?: string;
  output_RecipientLastName?: string;
  output_SettlementAmount?: string;
}

export interface MpesaQueryResponse extends MpesaBaseResponse {
  output_ResponseTransactionStatus?: string;
  output_ResponsePaymentStatusCode?: string;
  output_ResponsePaymentStatusDesc?: string;
}

export interface MpesaReversalResponse extends MpesaBaseResponse {
  // Reversal specific fields
}

export interface MpesaB2BResponse extends MpesaBaseResponse {
  output_Amount?: string;
  output_PrimaryPartyCode?: string;
  output_RecipientPartyCode?: string;
  output_SettlementAmount?: string;
}

// --- M-Pesa API Request Payloads ---

export interface C2BPaymentPayload {
  input_Amount: string;
  input_CustomerMSISDN: string;
  input_ThirdPartyReference: string;
  input_TransactionReference: string;
  input_ServiceProviderCode: string;
}

export interface B2CPaymentPayload {
  input_Amount: string;
  input_CustomerMsisdn: string;
  input_ThirdPartyReference: string;
  input_TransactionReference: string;
  input_ServiceProviderCode: string;
  input_PaymentServices: string;
}

export interface QueryPaymentPayload {
  input_QueryReference: string;
  input_ServiceProviderCode: string;
  input_ThirdPartyReference: string;
}

export interface ReversalPaymentPayload {
  input_ReversalAmount: string;
  input_TransactionID: string;
  input_ThirdPartyReference: string;
  input_ServiceProviderCode: string;
}

export interface B2BPaymentPayload {
  input_Amount: string;
  input_PrimaryPartyCode: string; // Empresa que envia
  input_RecipientPartyCode: string; // Empresa que recebe
  input_ThirdPartyReference: string;
  input_TransactionReference: string;
  input_ServiceProviderCode: string;
  input_PaymentServices: string; // Ex: "BusinessToBusinessTransfer"
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

// --- Mapeamento de Códigos de Erro M-Pesa ---
export const MPESA_ERROR_MESSAGES: Record<string, string> = {
  // Códigos de Sucesso
  'INS-0': 'Request processed successfully',
  
  // Códigos de Erro da API M-Pesa (Documentação Oficial)
  'INS-1': 'Internal Error',
  'INS-2': 'Invalid API Key',
  'INS-4': 'User is not active',
  'INS-5': 'Transaction cancelled by customer',
  'INS-6': 'Transaction Failed',
  'INS-9': 'Request timeout',
  'INS-10': 'Duplicate Transaction',
  'INS-13': 'Invalid Shortcode Used',
  'INS-14': 'Invalid Reference Used',
  'INS-15': 'Invalid Amount Used',
  'INS-16': 'Unable to handle the request due to a temporary overloading',
  'INS-17': 'Invalid Transaction Reference. Length Should Be Between 1 and 20.',
  'INS-18': 'Invalid TransactionID Used',
  'INS-19': 'Invalid ThirdPartyReference Used',
  'INS-20': 'Not All Parameters Provided. Please try again.',
  'INS-21': 'Parameter validations failed. Please try again.',
  'INS-22': 'Invalid Operation Type',
  'INS-23': 'Unknown Status. Contact M-Pesa Support',
  'INS-24': 'Invalid InitiatorIdentifier Used',
  'INS-25': 'Invalid SecurityCredential Used',
  'INS-26': 'Not authorized',
  'INS-993': 'Direct Debit Missing',
  'INS-994': 'Direct Debit Already Exists',
  'INS-995': 'Customer\'s Profile Has Problems',
  'INS-996': 'Customer Account Status Not Active',
  'INS-997': 'Linking Transaction Not Found',
  'INS-998': 'Invalid Market',
  'INS-2001': 'Initiator authentication error.',
  'INS-2002': 'Receiver invalid.',
  'INS-2006': 'Insufficient balance',
  'INS-2051': 'Invalid number', // MSISDN invalid - usando "Invalid number" para ser mais claro
  'INS-2057': 'Language code invalid.'
};

// --- Argumentos dos métodos ---
export interface C2BArgs {
  amount: number;
  number: string; // MSISDN
  transactionReference: string;
  thirdPartyReference: string;
}

export interface B2CArgs {
  amount: number;
  number: string; // MSISDN
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