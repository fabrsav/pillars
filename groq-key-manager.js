/**
 * Groq API Key Manager - No Hardcoded Keys
 * 
 * This module provides encryption utilities but does NOT store API keys in code.
 * API keys should be provided at runtime via environment variables or user input.
 * 
 * SECURITY: Never hardcode API keys in source code.
 */

import crypto from 'crypto';

// NO HARDCODED KEYS - Use environment variable GROQ_KEY or provide via UI
export const PLAINTEXT_GROQ_KEY = '';

const ENCRYPTED_KEY = {};

// Derive encryption key from password using PBKDF2
function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

// Encrypt the API key with password
export function encryptApiKey(apiKey, password) {
  const salt = crypto.randomBytes(16);
  const key = deriveKey(password, salt);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return {
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    encrypted: encrypted,
    authTag: authTag
  };
}

// Decrypt the API key with password
export function decryptApiKey(encryptedData, password) {
  try {
    // Support both legacy hex format and new base64 format
    let saltBuf, ivBuf, dataBuf, authTagBuf;

    if (encryptedData.salt && encryptedData.encrypted && encryptedData.authTag) {
      // legacy hex
      saltBuf = Buffer.from(encryptedData.salt, 'hex');
      ivBuf = Buffer.from(encryptedData.iv, 'hex');
      dataBuf = Buffer.from(encryptedData.encrypted, 'hex');
      authTagBuf = Buffer.from(encryptedData.authTag, 'hex');
    } else if (encryptedData.salt && encryptedData.data && encryptedData.tag) {
      // new base64 format
      saltBuf = Buffer.from(encryptedData.salt, 'base64');
      ivBuf = Buffer.from(encryptedData.iv, 'base64');
      dataBuf = Buffer.from(encryptedData.data, 'base64');
      authTagBuf = Buffer.from(encryptedData.tag, 'base64');
    } else {
      throw new Error('NO_ENCRYPTED_KEY');
    }

    const key = deriveKey(password, saltBuf);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuf);
    decipher.setAuthTag(authTagBuf);

    const decrypted = Buffer.concat([decipher.update(dataBuf), decipher.final()]).toString('utf8');
    return decrypted;
  } catch (error) {
    throw new Error('INVALID_PASSWORD');
  }
}

// Get the decrypted API key (requires password from environment or user)
export function getGroqApiKey(password) {
  // If a plaintext hardcoded key is present, return it immediately.
  // This gives an easy, guaranteed-working fallback requested by the user.
  if (typeof PLAINTEXT_GROQ_KEY === 'string' && PLAINTEXT_GROQ_KEY.length > 0) {
    return PLAINTEXT_GROQ_KEY;
  }

  // If no encrypted data yet, throw error
  if (!ENCRYPTED_KEY || (!ENCRYPTED_KEY.encrypted && !ENCRYPTED_KEY.data)) {
    throw new Error('NO_ENCRYPTED_KEY');
  }

  return decryptApiKey(ENCRYPTED_KEY, password);
}

// Store encrypted key in this file (call this once to encrypt and update the file)
export function updateEncryptedKey(apiKey, password) {
  const encrypted = encryptApiKey(apiKey, password);
  console.log('ENCRYPTED KEY DATA (paste this into groq-key-manager.js):');
  console.log(JSON.stringify(encrypted, null, 2));
  return encrypted;
}
