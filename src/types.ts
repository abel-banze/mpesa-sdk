// --- Configuração do SDK ---
export interface MpesaAPIConfig {
  apiKey: string;
  publicKey: string;
  serviceProviderCode: string;
  origin: string;
  apiHost: string; // e.g., api.sandbox.vm.co.mz ou api.vm.co.mz
  timeout?: number; // Tempo limite para requisições em ms
}

// --- Respostas da API M-Pesa ---
export interface MpesaBaseResponse {
  output_ResponseCode: string;
  output_ResponseDesc: string;
  output_TransactionID: string;
  output_ConversationID: string;
  output_ThirdPartyReference: string;
}

export interface MpesaAccessTokenResponse extends MpesaBaseResponse {
  output_Token: string;
  output_TokenExpiry: string; // Em segundos
}

export interface MpesaC2BResponse extends MpesaBaseResponse {
  // C2B Single Stage specific fields (if any, as per M-Pesa docs)
}

export interface MpesaB2CResponse extends MpesaBaseResponse {
  // B2C specific fields (as per M-Pesa docs)
  output_Amount: string;
  output_PrimaryPartyCode: string;
  output_RecipientFirstName: string;
  output_RecipientLastName: string;
  output_SettlementAmount: string;
}

export interface MpesaQueryResponse extends MpesaBaseResponse {
  output_ResponseTransactionStatus: string;
  output_ResponsePaymentStatusCode: string;
  output_ResponsePaymentStatusDesc: string;
  // Outros campos de query
}

export interface MpesaReversalResponse extends MpesaBaseResponse {
  // Reversal specific fields
}

// --- Requisições para a API M-Pesa ---

export interface C2BPaymentPayload {
  input_Amount: string;
  input_CustomerMsisdn: string;
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
  input_PaymentServices: string; // Ex: "BusinessPayBill"
}

export interface QueryPaymentPayload {
  input_QueryReference: string; // Pode ser TransactionID ou ConversationID
  input_ServiceProviderCode: string;
  input_ThirdPartyReference: string;
}

export interface ReversalPaymentPayload {
  input_ReversalAmount: string;
  input_TransactionID: string; // ID da transação original a ser revertida
  input_ThirdPartyReference: string;
  input_ServiceProviderCode: string;
}