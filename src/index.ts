// src/index.ts
import { MpesaService } from './mpesa-service';
import { MpesaAPIConfig } from './types';
import { generateUniqueReference } from './utils';

// Re-exporta a classe principal e os tipos/utilitários que podem ser úteis para o usuário do SDK
export { MpesaService, MpesaAPIConfig, generateUniqueReference };

// Opcional: Para uso em desenvolvimento ou exemplos de teste rápido
// Carrega as variáveis de ambiente aqui para que o exemplo funcione,
// mas em uma aplicação real, o usuário do SDK passaria a config explicitamente.
import * as dotenv from 'dotenv';
dotenv.config();

// Exemplo de uso (apenas para testar o SDK localmente)
async function runExample() {
  const config: MpesaAPIConfig = {
    apiKey: process.env.MPESA_API_KEY!,
    publicKey: process.env.MPESA_PUBLIC_KEY!,
    serviceProviderCode: process.env.MPESA_SERVICE_PROVIDER_CODE!,
    origin: process.env.MPESA_ORIGIN!,
    apiHost: process.env.MPESA_API_HOST!,
    timeout: 60000 // 60 segundos
  };

  // Verificação básica de variáveis de ambiente
  for (const key in config) {
    if (key !== 'timeout' && !config[key as keyof MpesaAPIConfig]) {
      console.error(`Erro: Variável de ambiente ${key.toUpperCase()} não definida. Por favor, verifique seu arquivo .env.`);
      process.exit(1);
    }
  }

  const mpesa = new MpesaService(config);

  try {
    console.log('--- Teste de Obtenção de Token ---');
    const token = await mpesa.getAccessToken();
    console.log('Token obtido:', token.substring(0, 10) + '...'); // Mostra apenas o início do token

    console.log('\n--- Teste de Pagamento C2B ---');
    const customerMsisdn = '25884xxxxxxx'; // Use um número válido para o ambiente de teste/sandbox
    const amountC2B = 100.00;
    const trxRefC2B = generateUniqueReference('C2B');
    const thirdPartyRefC2B = generateUniqueReference('TPC2B');

    const c2bResponse = await mpesa.initiateC2BPayment(amountC2B, customerMsisdn, trxRefC2B, thirdPartyRefC2B);
    console.log('Resposta C2B:', c2bResponse);

    // Dê um pequeno tempo antes de consultar para a transação ser processada
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\n--- Teste de Consulta de Transação (C2B) ---');
    const queryResponseC2B = await mpesa.queryTransactionStatus(c2bResponse.output_TransactionID, thirdPartyRefC2B);
    console.log('Resposta da Consulta C2B:', queryResponseC2B);

    console.log('\n--- Teste de Pagamento B2C (Exemplo) ---');
    const receiverMsisdn = '25884yyyyyyy'; // Outro número válido para o ambiente de teste/sandbox
    const amountB2C = 50.00;
    const trxRefB2C = generateUniqueReference('B2C');
    const thirdPartyRefB2C = generateUniqueReference('TPB2C');

    const b2cResponse = await mpesa.initiateB2CPayment(amountB2C, receiverMsisdn, trxRefB2C, thirdPartyRefB2C);
    console.log('Resposta B2C:', b2cResponse);

    // Dê um pequeno tempo antes de consultar para a transação ser processada
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\n--- Teste de Consulta de Transação (B2C) ---');
    const queryResponseB2C = await mpesa.queryTransactionStatus(b2cResponse.output_TransactionID, thirdPartyRefB2C);
    console.log('Resposta da Consulta B2C:', queryResponseB2C);

    // Se quiser testar reversão, use um TransactionID válido de uma transação anterior
    // console.log('\n--- Teste de Reversão de Transação (Exemplo) ---');
    // const originalTransactionToReverse = 'MPA_ID_DA_TRANSACAO_A_REVERTER';
    // const reversalAmount = 25.00;
    // const reversalThirdPartyRef = generateUniqueReference('REVERSAL');
    // const reversalResponse = await mpesa.reverseTransaction(originalTransactionToReverse, reversalAmount, reversalThirdPartyRef);
    // console.log('Resposta da Reversão:', reversalResponse);

  } catch (error) {
    console.error('\nErro na execução do SDK de exemplo:', error);
  }
}

// Executa o exemplo se o arquivo for o ponto de entrada principal
if (require.main === module) {
  runExample();
}