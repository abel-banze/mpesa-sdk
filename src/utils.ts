
/**
 * Codifica a string da chave pública em Base64, conforme exigido pela API M-Pesa para autenticação.
 * @param publicKey A chave pública fornecida pela M-Pesa.
 * @returns A chave pública codificada em Base64.
 */
export function encodePublicKeyToBase64(publicKey: string): string {
  if (!publicKey || typeof publicKey !== 'string') {
    throw new Error('Public Key inválida fornecida para codificação.');
  }
  return Buffer.from(publicKey).toString('base64');
}

/**
 * Gera uma referência única para transações.
 * @returns Uma string de referência única.
 */
export function generateUniqueReference(prefix: string = 'REF'): string {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}