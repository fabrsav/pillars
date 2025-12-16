import { getDecryptedToken, getStoredAccountEmail, saveLastOffers } from './oauth_store.js';

export async function runCheckUsingStoredToken(secret, days=7, source='scheduler') {
  const token = getDecryptedToken(secret);
  const email = getStoredAccountEmail();
  if (!token || !email) return { skipped: true };
  const { fetchRecentEmails } = await import('../../scripts/matched_betting_mail.js');
  const offers = await fetchRecentEmails({ email, password: token, days });
  const payload = { offers, timestamp: new Date().toISOString(), source };
  saveLastOffers(payload);
  return payload;
}

export async function runCheckWithToken(email, token, days=7, source='manual') {
  const { fetchRecentEmails } = await import('../../scripts/matched_betting_mail.js');
  const offers = await fetchRecentEmails({ email, password: token, days });
  const payload = { offers, timestamp: new Date().toISOString(), source };
  saveLastOffers(payload);
  return payload;
}
