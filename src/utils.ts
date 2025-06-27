// src/utils.ts

import crypto from 'crypto';

/**
 * Codifica a Public Key em Base64.
 * @param publicKey A Public Key fornecida pela M-Pesa.
 * @returns A Public Key codificada em Base64.
 */
export function encodePublicKeyToBase64(publicKey: string): string {
  return Buffer.from(publicKey).toString('base64');
}

/**
 * Gera uma referência única para transações.
 * @param prefix Um prefixo para a referência (ex: 'C2B', 'B2C').
 * @returns Uma string de referência única.
 */
export function generateUniqueReference(prefix: string = 'REF'): string {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Gera o Bearer token criptografando o apiKey com a publicKey (PKCS1_PADDING) e codificando em Base64.
 * @param apiKey Sua apiKey do portal M-Pesa
 * @param publicKey Sua publicKey do portal M-Pesa (formato PEM)
 * @returns Bearer token para o header Authorization
 */
export function generateBearerToken(apiKey: string, publicKey: string): string {
  const buffer = Buffer.from(apiKey, 'utf8');
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    buffer
  );
  return encrypted.toString('base64');
}