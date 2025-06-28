# M-Pesa SDK para Moçambique

Um SDK robusto e completo para integração com a API M-Pesa da Vodacom em Moçambique, desenvolvido em TypeScript/JavaScript. Suporta todas as operações principais: C2B, B2C, B2B, Query e Reversal.

## 🚀 Características

- **Autenticação Segura**: Criptografia RSA do apiKey com a publicKey
- **Seleção de Ambiente**: Suporte automático para sandbox e produção
- **Tratamento de Erros Robusto**: Classe MpesaError personalizada
- **Logging Detalhado**: Para depuração e monitoramento
- **TypeScript**: Tipagem completa para melhor experiência de desenvolvimento
- **Testes Unitários**: Cobertura completa com Jest
- **API Simplificada**: Métodos curtos e intuitivos
- **Respostas Legíveis**: Formato de resposta limpo e organizado

## 📦 Instalação

```bash
npm install mpesa-sdk-mozambique
```

## ⚙️ Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do seu projeto:

```env
# Credenciais M-Pesa
MPESA_API_KEY=sua_api_key_aqui
MPESA_PUBLIC_KEY=sua_public_key_aqui
MPESA_SERVICE_PROVIDER_CODE=seu_service_provider_code
MPESA_ORIGIN=seu_origin_aqui

# Ambiente (sandbox ou live)
MPESA_ENV=sandbox
```

### Configuração do SDK

```typescript
import { MpesaService } from 'mpesa-sdk-mozambique';

const mpesa = new MpesaService({
  apiKey: process.env.MPESA_API_KEY!,
  publicKey: process.env.MPESA_PUBLIC_KEY!,
  serviceProviderCode: process.env.MPESA_SERVICE_PROVIDER_CODE!,
  origin: process.env.MPESA_ORIGIN!,
  env: process.env.MPESA_ENV as 'sandbox' | 'live', // Define automaticamente o host
  timeout: 60000 // Timeout opcional em ms
});
```

## 📚 Uso

### Formato de Resposta

Todos os métodos retornam um objeto padronizado com a seguinte estrutura:

```typescript
{
  status: 'success' | 'error',
  message: string,
  data?: T, // Dados específicos da operação
  code?: string, // Código de resposta da M-Pesa
  httpStatus?: number,
  transactionId?: string,
  conversationId?: string,
  thirdPartyReference?: string,
  timestamp?: string
}
```

### C2B (Customer to Business)

```typescript
try {
  const response = await mpesa.c2b({
    amount: 100.00,
    number: '25884xxxxxxx', // MSISDN (número) do cliente
    transactionReference: 'TXN123',
    thirdPartyReference: 'REF456'
  });
  
  if (response.status === 'success') {
    console.log('Transação realizada com sucesso!');
    console.log('Transaction ID:', response.data?.transactionId);
    console.log('Amount:', response.data?.amount);
    console.log('Customer:', response.data?.customerMsisdn);
  } else {
    console.error('Erro na transação:', response.message);
  }
} catch (error) {
  console.error('C2B Error:', error.message);
}
```

### B2C (Business to Customer)

```typescript
try {
  const response = await mpesa.b2c({
    amount: 50.00,
    number: '25884xxxxxxx', // MSISDN (número) do destinatário
    transactionReference: 'TXN789',
    thirdPartyReference: 'REF101',
    paymentServices: 'BusinessPayBill' // Opcional, padrão: BusinessPayBill
  });
  
  if (response.status === 'success') {
    console.log('Pagamento enviado com sucesso!');
    console.log('Transaction ID:', response.data?.transactionId);
    console.log('Recipient:', `${response.data?.recipientFirstName || ''} ${response.data?.recipientLastName || ''}`.trim());
    console.log('Settlement Amount:', response.data?.settlementAmount);
  }
} catch (error) {
  console.error('B2C Error:', error.message);
}
```

### B2B (Business to Business)

```typescript
try {
  const response = await mpesa.b2b({
    amount: 1000.00,
    primaryPartyCode: 'COMPANY001', // Código da empresa que envia
    recipientPartyCode: 'COMPANY002', // Código da empresa que recebe
    transactionReference: 'TXN202',
    thirdPartyReference: 'REF303',
    paymentServices: 'BusinessToBusinessTransfer' // Opcional, padrão: BusinessToBusinessTransfer
  });
  
  if (response.status === 'success') {
    console.log('Transferência B2B realizada!');
    console.log('From:', response.data?.primaryPartyCode);
    console.log('To:', response.data?.recipientPartyCode);
    console.log('Amount:', response.data?.amount);
    console.log('Settlement:', response.data?.settlementAmount);
  }
} catch (error) {
  console.error('B2B Error:', error.message);
}
```

### Query (Consulta de Status)

```typescript
try {
  const response = await mpesa.query({
    queryReference: 'TXN123', // Transaction ID ou Conversation ID
    thirdPartyReference: 'REF456'
  });
  
  if (response.status === 'success') {
    console.log('Status da transação consultado!');
    console.log('Transaction Status:', response.data?.transactionStatus);
    console.log('Payment Status:', response.data?.paymentStatusDesc);
    console.log('Payment Code:', response.data?.paymentStatusCode);
  }
} catch (error) {
  console.error('Query Error:', error.message);
}
```

### Reversal (Reversão)

```typescript
try {
  const response = await mpesa.reversal({
    originalTransactionId: 'MPA_TRANS_ID_FROM_PREVIOUS_SUCCESSFUL_C2B',
    reversalAmount: 50.00,
    thirdPartyReference: 'REF789'
  });
  
  if (response.status === 'success') {
    console.log('Reversão realizada com sucesso!');
    console.log('Original Transaction:', response.data?.originalTransactionId);
    console.log('Reversal Amount:', response.data?.reversalAmount);
    console.log('New Transaction ID:', response.data?.transactionId);
  }
} catch (error) {
  console.error('Reversal Error:', error.message);
}
```

## 🔐 Autenticação

O SDK utiliza criptografia RSA para gerar o token Bearer:

1. **Criptografia**: O `apiKey` é criptografado usando a `publicKey` com RSA PKCS1_PADDING
2. **Formatação**: A `publicKey` é automaticamente formatada no padrão PEM
3. **Token**: O resultado criptografado é usado como Bearer token

```typescript
// O SDK faz isso automaticamente:
// 1. Formata a publicKey para PEM
// 2. Criptografa o apiKey com a publicKey
// 3. Usa o resultado como Bearer token
```

## 🌍 Ambientes

### Sandbox
- **Host**: `api.sandbox.vm.co.mz:18352`
- **Uso**: Para testes e desenvolvimento
- **Configuração**: `env: 'sandbox'`

### Produção
- **Host**: `api.vm.co.mz:18352`
- **Uso**: Para operações reais
- **Configuração**: `env: 'live'`

## 🛡️ Tratamento de Erros

O SDK inclui tratamento robusto de erros com mensagens descritivas baseadas na documentação oficial da M-Pesa API. Todos os códigos de erro oficiais estão mapeados para mensagens claras e compreensíveis.

### Classe MpesaError

```typescript
class MpesaError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'MpesaError';
  }
}
```

### Códigos de Erro Suportados

O SDK inclui **todos os códigos de erro oficiais** da documentação da M-Pesa API:

- **INS-0**: Request processed successfully
- **INS-1**: Internal Error  
- **INS-2**: Invalid API Key
- **INS-4**: User is not active
- **INS-5**: Transaction cancelled by customer
- **INS-6**: Transaction Failed
- **INS-9**: Request timeout
- **INS-10**: Duplicate Transaction
- **INS-13**: Invalid Shortcode Used
- **INS-14**: Invalid Reference Used
- **INS-15**: Invalid Amount Used
- **INS-16**: Unable to handle the request due to a temporary overloading
- **INS-17**: Invalid Transaction Reference. Length Should Be Between 1 and 20.
- **INS-18**: Invalid TransactionID Used
- **INS-19**: Invalid ThirdPartyReference Used
- **INS-20**: Not All Parameters Provided. Please try again.
- **INS-21**: Parameter validations failed. Please try again.
- **INS-22**: Invalid Operation Type
- **INS-23**: Unknown Status. Contact M-Pesa Support
- **INS-24**: Invalid InitiatorIdentifier Used
- **INS-25**: Invalid SecurityCredential Used
- **INS-26**: Not authorized
- **INS-993**: Direct Debit Missing
- **INS-994**: Direct Debit Already Exists
- **INS-995**: Customer's Profile Has Problems
- **INS-996**: Customer Account Status Not Active
- **INS-997**: Linking Transaction Not Found
- **INS-998**: Invalid Market
- **INS-2001**: Initiator authentication error.
- **INS-2002**: Receiver invalid.
- **INS-2006**: Insufficient balance
- **INS-2051**: Invalid number
- **INS-2057**: Language code invalid.

### Exemplos de Tratamento de Erros

## 🧪 Testes

Execute os testes unitários:

```bash
npm test
```

### Cobertura de Testes

- ✅ C2B (Customer to Business)
- ✅ B2C (Business to Customer)
- ✅ B2B (Business to Business)
- ✅ Query (Consulta de Status)
- ✅ Reversal (Reversão)
- ✅ Tratamento de Erros
- ✅ Autenticação
- ✅ Formato de Resposta Simplificado

## 🔧 Configuração Avançada

### Timeout Personalizado

```typescript
const mpesa = new MpesaService({
  // ... outras configurações
  timeout: 120000 // 2 minutos
});
```

### Host Personalizado

```typescript
const mpesa = new MpesaService({
  // ... outras configurações
  apiHost: 'api.custom.vm.co.mz:18352' // Host personalizado
});
```

## 🚨 Troubleshooting

### Erro INS-1 (Falha de Autenticação)

1. **Verifique as credenciais**:
   ```bash
   echo $MPESA_API_KEY
   echo $MPESA_PUBLIC_KEY
   ```

2. **Confirme o ambiente**:
   ```bash
   echo $MPESA_ENV
   ```

3. **Teste a criptografia**:
   ```typescript
   import { generateBearerToken, formatPublicKey } from 'mpesa-sdk-mozambique';
   
   const token = generateBearerToken(apiKey, formatPublicKey(publicKey));
   console.log('Generated Token:', token);
   ```

### Erro de Timeout

1. **Aumente o timeout**:
   ```typescript
   const mpesa = new MpesaService({
     // ... outras configurações
     timeout: 120000 // 2 minutos
   });
   ```

2. **Verifique a conectividade**:
   ```bash
   ping api.sandbox.vm.co.mz
   ```

### Erro de Formato da Public Key

O SDK formata automaticamente a public key, mas se houver problemas:

```typescript
import { formatPublicKey } from 'mpesa-sdk-mozambique';

const formattedKey = formatPublicKey(publicKey);
console.log('Formatted Key:', formattedKey);
```

## 📄 Licença

MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📞 Suporte

Para suporte e dúvidas:

- 📧 Email: suporte@exemplo.com
- 📖 Documentação: [docs.exemplo.com](https://docs.exemplo.com)
- 🐛 Issues: [GitHub Issues](https://github.com/seu-usuario/mpesa-sdk-mozambique/issues)

---

**Desenvolvido com ❤️ para a comunidade M-Pesa em Moçambique**
