const fs = require('fs');
const parser = require('@babel/parser');
const src = fs.readFileSync('src/Pillars.jsx', 'utf8');
try {
  parser.parse(src, { sourceType: 'module', plugins: ['jsx'] });
  console.log('Parsed OK');
} catch (e) {
  console.error('Parse error:', e.message);
  console.error('At loc:', e.loc);
  console.error('Code frame:\n', e.codeFrame || 'N/A');
}
