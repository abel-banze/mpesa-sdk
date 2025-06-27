// src/index.ts
import { MpesaService, MpesaError } from './mpesa-service';
import { MpesaAPIConfig, MpesaB2BResponse, B2BPaymentPayload } from './types';
import { generateUniqueReference } from './utils';

// Re-export for easier consumption
export { MpesaService, MpesaAPIConfig, generateUniqueReference, MpesaError, MpesaB2BResponse, B2BPaymentPayload };

// Load environment variables from .env file
import * as dotenv from 'dotenv';
dotenv.config();

async function runExample() {
  const config: MpesaAPIConfig = {
    apiKey: process.env.MPESA_API_KEY!,
    publicKey: process.env.MPESA_PUBLIC_KEY!,
    serviceProviderCode: process.env.MPESA_SERVICE_PROVIDER_CODE!,
    origin: process.env.MPESA_ORIGIN!,
    apiHost: process.env.MPESA_API_HOST!, // Pode ser sobrescrito pelo env
    timeout: 60000, // 60 seconds timeout for requests
    env: process.env.MPESA_ENV as 'sandbox' | 'live' // Novo campo para ambiente
  };

  // Basic validation of environment variables
  for (const key in config) {
    if (key !== 'timeout' && !config[key as keyof MpesaAPIConfig]) {
      console.error(`Error: Environment variable ${key.toUpperCase()} not defined. Please check your .env file.`);
      process.exit(1);
    }
  }

  const mpesa = new MpesaService(config);

  try {
    // --- Nenhuma chamada explícita para getAccessToken é necessária aqui ---
    console.log('--- Public Key sendo usada diretamente como token de acesso ---');

    console.log('\n--- Initiating C2B Payment (Customer to Business) ---');
    // IMPORTANT: Use test MSISDNs provided by M-Pesa for sandbox environment
    const customerMsisdnC2B = '258874088005'; // REPLACE with a valid sandbox test MSISDN
    const amountC2B = 10.00;
    const trxRefC2B = 'T12344C';
    const thirdPartyRefC2B = '0UEM53';

    console.log(`C2B Payload: Amount=${amountC2B}, MSISDN=${customerMsisdnC2B}, Ref=${trxRefC2B}`);
    const c2bResponse = await mpesa.initiateC2BPayment(amountC2B, customerMsisdnC2B, trxRefC2B, thirdPartyRefC2B);
    console.log('C2B Payment Response:', c2bResponse);

    // Wait a bit before querying, as C2B might be asynchronous
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\n--- Querying C2B Transaction Status ---');
    if (c2bResponse.output_TransactionID) {
      console.log(`Querying Transaction ID: ${c2bResponse.output_TransactionID}`);
      const queryResponseC2B = await mpesa.queryTransactionStatus(c2bResponse.output_TransactionID, thirdPartyRefC2B);
      console.log('C2B Transaction Query Response:', queryResponseC2B);
    } else {
      console.warn('C2B transaction ID not available in response for query.');
    }


    console.log('\n--- Initiating B2C Payment (Business to Customer) ---');
    // IMPORTANT: Use test MSISDNcls provided by M-Pesa for sandbox environment
    const receiverMsisdnB2C = '25884yyyyyyy'; // REPLACE with a valid sandbox test MSISDN
    const amountB2C = 5.00;
    const trxRefB2C = generateUniqueReference('B2C');
    const thirdPartyRefB2C = generateUniqueReference('TPB2C');

    console.log(`B2C Payload: Amount=${amountB2C}, MSISDN=${receiverMsisdnB2C}, Ref=${trxRefB2C}`);
    const b2cResponse = await mpesa.initiateB2CPayment(amountB2C, receiverMsisdnB2C, trxRefB2C, thirdPartyRefB2C);
    console.log('B2C Payment Response:', b2cResponse);

    // Wait a bit before querying
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\n--- Querying B2C Transaction Status ---');
    if (b2cResponse.output_TransactionID) {
      console.log(`Querying Transaction ID: ${b2cResponse.output_TransactionID}`);
      const queryResponseB2C = await mpesa.queryTransactionStatus(b2cResponse.output_TransactionID, thirdPartyRefB2C);
      console.log('B2C Transaction Query Response:', queryResponseB2C);
    } else {
      console.warn('B2C transaction ID not available in response for query.');
    }

    // --- Exemplo de B2B ---
    console.log('\n--- Initiating B2B Payment (Business to Business) ---');
    const primaryPartyCodeB2B = 'COMPANY001'; // Código da empresa que envia
    const recipientPartyCodeB2B = 'COMPANY002'; // Código da empresa que recebe
    const amountB2B = 200.00;
    const trxRefB2B = generateUniqueReference('B2B');
    const thirdPartyRefB2B = generateUniqueReference('TPB2B');
    const paymentServicesB2B = 'BusinessToBusinessTransfer';
    console.log(`B2B Payload: Amount=${amountB2B}, From=${primaryPartyCodeB2B}, To=${recipientPartyCodeB2B}, Ref=${trxRefB2B}`);
    const b2bResponse = await mpesa.initiateB2BPayment(amountB2B, primaryPartyCodeB2B, recipientPartyCodeB2B, trxRefB2B, thirdPartyRefB2B, paymentServicesB2B);
    console.log('B2B Payment Response:', b2bResponse);

    // --- Example of a Reversal (Uncomment to test) ---
    // console.log('\n--- Attempting to Reverse a Transaction ---');
    // const originalTransactionIdToReverse = 'MPA_TRANS_ID_FROM_PREVIOUS_SUCCESSFUL_C2B'; // Replace with an actual transaction ID that can be reversed in sandbox
    // const reversalAmount = 5.00;
    // const reversalThirdPartyRef = generateUniqueReference('REV');
    // console.log(`Reversal Payload: Original Trx ID=${originalTransactionIdToReverse}, Amount=${reversalAmount}, Ref=${reversalThirdPartyRef}`);
    // const reversalResponse = await mpesa.reverseTransaction(originalTransactionIdToReverse, reversalAmount, reversalThirdPartyRef);
    // console.log('Reversal Response:', reversalResponse);

  } catch (error) {
    if (error instanceof MpesaError) {
      console.error('\n--- M-Pesa API Error Details ---');
      console.error(`  Message: ${error.message}`);
      console.error(`  M-Pesa Code: ${error.details.code}`);
      console.error(`  M-Pesa Description: ${error.details.description}`);
      console.error(`  HTTP Status: ${error.details.httpStatus}`);
      if (error.details.transactionId) console.error(`  Transaction ID: ${error.details.transactionId}`);
      if (error.details.conversationId) console.error(`  Conversation ID: ${error.details.conversationId}`);
      if (error.details.thirdPartyReference) console.error(`  Third Party Reference: ${error.details.thirdPartyReference}`);
    } else {
      console.error('\n--- Unexpected Error ---');
      console.error('  Error:', error);
      if (error instanceof Error) {
        console.error('  Stack:', error.stack);
      }
    }
  }
}

// Run the example when the script is executed directly
if (require.main === module) {
  runExample();
}