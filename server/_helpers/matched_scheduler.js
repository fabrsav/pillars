export async function runCheckUsingStoredToken(secret, days=7, source='scheduler') {
  const { getDecryptedToken, getStoredAccountEmail, saveLastOffers } = await import('./oauth_store.js');
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
  const { saveLastOffers } = await import('./oauth_store.js');
  const { fetchRecentEmails } = await import('../../scripts/matched_betting_mail.js');
  const offers = await fetchRecentEmails({ email, password: token, days });
  const payload = { offers, timestamp: new Date().toISOString(), source };
  saveLastOffers(payload);
  return payload;
}
