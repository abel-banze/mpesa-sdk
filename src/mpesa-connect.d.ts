declare module "mpesa-connect" {
  export interface MpesaOptions {
    publicKey?: string;
    apiKey?: string;
    serviceProviderCode?: string;
    env: "live" | "sandbox";
  }

  export interface MakeRequestResponse {
    response: any;
    status: number;
  }

  export interface Mpesa {
    c2b(
      transactionReference: string,
      customerMSISDN: string,
      amount: number,
      thirdPartyReference: string,
      serviceProviderCodeParam?: string
    ): Promise<MakeRequestResponse>;

    b2c(
      transactionReference: string,
      customerMSISDN: string,
      amount: number,
      thirdPartyReference: string,
      serviceProviderCodeParam?: string
    ): Promise<MakeRequestResponse>;

    transactionReversal(
      transactionID: string,
      securityCredential: string,
      initiatorIdentifier: string,
      thirdPartyReference: string,
      reversalAmount: number,
      serviceProviderCodeParam?: string
    ): Promise<MakeRequestResponse>;

    status(
      thirdPartyReference: string,
      queryReference: string,
      serviceProviderCodeParam?: string
    ): Promise<MakeRequestResponse>;

    getToken(): string;
  }

  export function initializeMpesa(options: MpesaOptions): Mpesa;
}