import CryptoJS from 'crypto-js';
import { ENCRYPTION_KEY } from '../config.js';

/**
 * Encrypts a string using AES-256 encryption
 * @param {string} text - The plaintext to encrypt
 * @returns {string} - Base64 encoded encrypted string
 */
export function encrypt(text) {
  if (!text) return null;
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is not set in environment');
  }
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

/**
 * Decrypts an AES-256 encrypted string
 * @param {string} encryptedText - Base64 encoded encrypted string
 * @returns {string} - Decrypted plaintext
 */
export function decrypt(encryptedText) {
  if (!encryptedText) return null;
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is not set in environment');
  }
  const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}
