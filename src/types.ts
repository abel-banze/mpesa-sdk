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
  apiHost: string; // e.g., "api.sandbox.vm.co.mz:18352" or "api.vm.co.mz:18352"
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