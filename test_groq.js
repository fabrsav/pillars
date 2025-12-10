// Read Groq API key from environment variable for safety
const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) {
  console.error('Missing GROQ_API_KEY environment variable. Set it and re-run the script.');
  process.exit(1);
}
const today = new Date().toLocaleDateString('it-IT');
const smartText = "Garmin Lily 2 active assolutamente entro il 3 dicembre";

const prompt = `Oggi è ${today}. Analizza questo testo ed estrai info sui rimborsi/resi.
Testo: "${smartText}"

RISPONDI SOLO con un JSON array valido, NESSUN altro testo. Formato:
[{"platform":"NomeNegozio","item":"Prodotto","amount":0,"email":"","password":"","arrivalDate":"YYYY-MM-DD","requestDate":"","status":"Da Fare","notes":""}]

Se non ci sono info sufficienti, usa valori vuoti. Rispondi SOLO col JSON.`;

fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + apiKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    // Use the higher-reasoning Groq model
    model: 'groq/compound',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.0,
    max_tokens: 1024
  })
})
.then(r => r.json())
.then(data => {
  console.log('Raw response object:', Object.keys(data));
  // Extract JSON from response text
  let jsonStr = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
  jsonStr = jsonStr.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
  
  const match = jsonStr.match(/\[[\s\S]*\]/);
  if (match) {
    jsonStr = match[0];
  }
  
  try {
    const parsed = JSON.parse(jsonStr.trim());
    // console.log('\\n✅ Parsed JSON:', JSON.stringify(parsed, null, 2));
  } catch(e) {
    // console.log('\\n❌ JSON Parse Error:', e.message);
  }
})
.catch(e => console.error('Error:', e));
