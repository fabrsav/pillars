// Defer importing heavy node-only modules to runtime so unit tests can import parsers without
// attempting to resolve native/node-only modules during ESM transform.

function formatImapDate(d) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dd = String(d.getDate()).padStart(2,'0');
  const m = months[d.getMonth()];
  const yyyy = d.getFullYear();
  return `${dd}-${m}-${yyyy}`;
}

function subDaysDate(d, n) { return new Date(d.getTime() - n * 86400000); }

function parseCurrencyAmount(text) {
  if (!text) return null;
  // match € or £ or $ with numbers, e.g., €10, £5, $20
  const m = text.match(/(?:€|EUR|£|GBP|\$|USD)\s?([0-9]+(?:[\.,][0-9]{1,2})?)/i);
  if (!m) return null;
  const raw = m[1].replace(',', '.');
  return parseFloat(raw);
}

function parseOdds(text) {
  if (!text) return null;
  // decimal odds like 2.00 or 1.5
  const dec = text.match(/\b([1-9]\d*(?:[\.,]\d+))\b/);
  if (dec) {
    const val = parseFloat(dec[1].replace(',', '.'));
    if (val > 1.01 && val < 1000) return val;
  }
  // fractional odds like 3/1
  const frac = text.match(/\b(\d+)\/(\d+)\b/);
  if (frac) {
    const a = parseFloat(frac[1]);
    const b = parseFloat(frac[2]);
    if (b !== 0) return a / b + 1;
  }
  return null;
}

function estimateGainFromFreeBet(freeBetAmount, odds) {
  if (!freeBetAmount) return null;
  if (odds && odds > 1.01) {
    // assume free bet stake not returned (typical): profit = freeBet * (odds - 1)
    return +(freeBetAmount * (odds - 1)).toFixed(2);
  }
  // fallback estimate: assume average odds 2.0 and 50% conversion
  return +(freeBetAmount * 0.5).toFixed(2);
}

async function fetchRecentEmails({ email, password, days = 7, imapHost = 'imap.gmail.com', imapPort = 993 }) {
  if (!email || !password) throw new Error('email and password are required');

  // Import node-only modules at runtime to avoid ESM transform errors during tests
  const ImapSimple = (await import('imap-simple')).default;
  const Imap = (await import('imap')).default;
  const sinceDate = subDaysDate(new Date(), days);
  const sinceStr = formatImapDate(sinceDate); // e.g., 02-Dec-2025

  let config = {
    imap: {
      user: email,
      host: imapHost,
      port: imapPort,
      tls: true,
      authTimeout: 30000
    }
  };

  // If a token object is provided as `password` (object with refresh_token), prefer XOAUTH2
  if (password && typeof password === 'object' && password.refresh_token) {
    // Exchange refresh token for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
        grant_type: 'refresh_token',
        refresh_token: password.refresh_token
      })
    });
    const tokenJson = await tokenRes.json();
    if (!tokenJson.access_token) throw new Error('Failed to obtain access token from refresh_token');
    const xoauth = Buffer.from(`user=${email}\x01auth=Bearer ${tokenJson.access_token}\x01\x01`).toString('base64');
    config.imap.xoauth2 = xoauth;
    // set a custom authMechanism
    config.imap.authTimeout = 30000;
  } else {
    config.imap.password = password;
  }

  const connection = await ImapSimple.connect(config);
  try {
    await connection.openBox('INBOX');
    const searchCriteria = ['ALL', ['SINCE', sinceStr]];
    const fetchOptions = { bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'], struct: true };

    const messages = await connection.search(searchCriteria, fetchOptions);
    const offers = [];

    for (const item of messages) {
      const all = item.parts.find(p => p.which === 'TEXT');
      const headerPart = item.parts.find(p => p.which && p.which.startsWith('HEADER'));
      const rawBody = all ? all.body : '';
      const header = Imap.parseHeader(headerPart.body);
      const subject = (header.subject && header.subject[0]) || '';
      const from = (header.from && header.from[0]) || '';
      const date = (header.date && header.date[0]) || '';

      // Basic cleanup: prefer plain text or fallback to raw body
      const plain = (rawBody || '').replace(/<[^>]+>/g, '\n').replace(/\r/g, '\n');
      const text = (subject + '\n' + plain);


      // Heuristics: detect 'free bet', 'welcome offer', 'bonus', 'odds', currency amounts
      if (/free bet|welcome offer|freebie|bonus|bet credit|bet[\s-]?credit/i.test(text)) {
        const freeBet = parseCurrencyAmount(text);
        const odds = parseOdds(text);
        const estimatedGain = estimateGainFromFreeBet(freeBet, odds);
        offers.push({ subject, from, date, freeBet, odds, estimatedGain });
      } else if (/odds|min odds|bet at/i.test(text)) {
        // may be an odds-limited offer
        const freeBet = parseCurrencyAmount(text);
        const odds = parseOdds(text);
        if (freeBet || odds) {
          const estimatedGain = estimateGainFromFreeBet(freeBet, odds);
          offers.push({ subject, from, date, freeBet, odds, estimatedGain });
        }
      }
    }

    return offers;
  } finally {
    try { await connection.end(); } catch(_) {}
  }
}

export { fetchRecentEmails, parseCurrencyAmount, parseOdds, estimateGainFromFreeBet };
