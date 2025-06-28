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
    const customerMsisdnC2B = '25884xxxxxxx'; // REPLACE with a valid sandbox test MSISDN
    const amountC2B = 10.00;
    const trxRefC2B = 'T12344C';
    const thirdPartyRefC2B = '0UEM53';

    console.log(`C2B Payload: Amount=${amountC2B}, MSISDN=${customerMsisdnC2B}, Ref=${trxRefC2B}`);
    const c2bResponse = await mpesa.c2b({
      amount: amountC2B,
      number: customerMsisdnC2B,
      transactionReference: trxRefC2B,
      thirdPartyReference: thirdPartyRefC2B
    });
    
    console.log('C2B Response:', {
      status: c2bResponse.status,
      message: c2bResponse.message,
      transactionId: c2bResponse.data?.transactionId,
      amount: c2bResponse.data?.amount
    });

    // Wait a bit before querying, as C2B might be asynchronous
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\n--- Querying C2B Transaction Status ---');
    if (c2bResponse.data?.transactionId) {
      console.log(`Querying Transaction ID: ${c2bResponse.data.transactionId}`);
      const queryResponseC2B = await mpesa.query({
        queryReference: c2bResponse.data.transactionId,
        thirdPartyReference: thirdPartyRefC2B
      });
      
      console.log('C2B Transaction Query Response:', {
        status: queryResponseC2B.status,
        message: queryResponseC2B.message,
        transactionStatus: queryResponseC2B.data?.transactionStatus,
        paymentStatus: queryResponseC2B.data?.paymentStatusDesc
      });
    } else {
      console.warn('C2B transaction ID not available in response for query.');
    }


    console.log('\n--- Initiating B2C Payment (Business to Customer) ---');
    // IMPORTANT: Use test MSISDNs provided by M-Pesa for sandbox environment
    const receiverMsisdnB2C = '25884yyyyyyy'; // REPLACE with a valid sandbox test MSISDN
    const amountB2C = 5.00;
    const trxRefB2C = generateUniqueReference('B2C');
    const thirdPartyRefB2C = generateUniqueReference('TPB2C');

    console.log(`B2C Payload: Amount=${amountB2C}, MSISDN=${receiverMsisdnB2C}, Ref=${trxRefB2C}`);
    const b2cResponse = await mpesa.b2c({
      amount: amountB2C,
      number: receiverMsisdnB2C,
      transactionReference: trxRefB2C,
      thirdPartyReference: thirdPartyRefB2C
    });
    
    console.log('B2C Response:', {
      status: b2cResponse.status,
      message: b2cResponse.message,
      transactionId: b2cResponse.data?.transactionId,
      amount: b2cResponse.data?.amount,
      recipient: `${b2cResponse.data?.recipientFirstName || ''} ${b2cResponse.data?.recipientLastName || ''}`.trim()
    });

    // Wait a bit before querying
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\n--- Querying B2C Transaction Status ---');
    if (b2cResponse.data?.transactionId) {
      console.log(`Querying Transaction ID: ${b2cResponse.data.transactionId}`);
      const queryResponseB2C = await mpesa.query({
        queryReference: b2cResponse.data.transactionId,
        thirdPartyReference: thirdPartyRefB2C
      });
      
      console.log('B2C Transaction Query Response:', {
        status: queryResponseB2C.status,
        message: queryResponseB2C.message,
        transactionStatus: queryResponseB2C.data?.transactionStatus,
        paymentStatus: queryResponseB2C.data?.paymentStatusDesc
      });
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
    console.log(`B2B Payload: Amount=${amountB2B}, From=${primaryPartyCodeB2B}, To=${recipientPartyCodeB2B}, Ref=${trxRefB2B}`);
    const b2bResponse = await mpesa.b2b({
      amount: amountB2B,
      primaryPartyCode: primaryPartyCodeB2B,
      recipientPartyCode: recipientPartyCodeB2B,
      transactionReference: trxRefB2B,
      thirdPartyReference: thirdPartyRefB2B
    });
    
    console.log('B2B Response:', {
      status: b2bResponse.status,
      message: b2bResponse.message,
      transactionId: b2bResponse.data?.transactionId,
      amount: b2bResponse.data?.amount,
      from: b2bResponse.data?.primaryPartyCode,
      to: b2bResponse.data?.recipientPartyCode
    });

    // --- Example of a Reversal (Uncomment to test) ---
    // console.log('\n--- Attempting to Reverse a Transaction ---');
    // const originalTransactionIdToReverse = 'MPA_TRANS_ID_FROM_PREVIOUS_SUCCESSFUL_C2B'; // Replace with an actual transaction ID that can be reversed in sandbox
    // const reversalAmount = 5.00;
    // const reversalThirdPartyRef = generateUniqueReference('REV');
    // console.log(`Reversal Payload: Original Trx ID=${originalTransactionIdToReverse}, Amount=${reversalAmount}, Ref=${reversalThirdPartyRef}`);
    // const reversalResponse = await mpesa.reversal({
    //   originalTransactionId: originalTransactionIdToReverse,
    //   reversalAmount: reversalAmount,
    //   thirdPartyReference: reversalThirdPartyRef
    // });
    // 
    // console.log('Reversal Response:', {
    //   status: reversalResponse.status,
    //   message: reversalResponse.message,
    //   transactionId: reversalResponse.data?.transactionId,
    //   originalTransactionId: reversalResponse.data?.originalTransactionId,
    //   reversalAmount: reversalResponse.data?.reversalAmount
    // });

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