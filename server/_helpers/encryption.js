import crypto from 'crypto';

export const encryptPayload = (plaintext, secret) => {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(secret, salt, 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { encrypted: true, salt: salt.toString('base64'), iv: iv.toString('base64'), tag: tag.toString('base64'), data: encrypted.toString('base64') };
};

export const decryptPayload = (obj, secret) => {
  if (!obj || !obj.encrypted) return obj;
  const salt = Buffer.from(obj.salt, 'base64');
  const iv = Buffer.from(obj.iv, 'base64');
  const tag = Buffer.from(obj.tag, 'base64');
  const encrypted = Buffer.from(obj.data, 'base64');
  const key = crypto.scryptSync(secret, salt, 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
};
