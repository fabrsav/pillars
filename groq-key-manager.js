/**
 * Groq API Key Manager - Encrypted Hardcoded Key System
 * 
 * This module handles secure storage and decryption of the Groq API key.
 * The key is encrypted with AES-256-GCM using a password.
 * 
 * SETUP:
 * 1. Run: node encrypt-once.js (after setting your password)
 * 2. Copy the output and paste it into ENCRYPTED_KEY below
 * 3. Set GROQ_KEY_PASSWORD environment variable or enter password in UI
 */

import crypto from 'crypto';

// Encrypted hardcoded Groq API key (encrypted with AES-256-GCM)
// To generate this, run: node scripts/encrypt_groq_key.js and copy the JSON here
// The module supports two formats for backward compatibility:
// - legacy hex format: { salt, iv, encrypted, authTag }
// - new base64 format: { salt, iv, data, tag }
const ENCRYPTED_KEY = {
  // Example placeholder — replace with actual encrypted JSON
  // salt: '', iv: '', data: '', tag: ''
};

// Plaintext (hardcoded) Groq API key as requested.
// WARNING: Hardcoding API keys in source is insecure. Keep repository private.
// Clear plaintext key to avoid accidental use. Use UI/server setup to store encrypted key.
export const PLAINTEXT_GROQ_KEY = '';

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
