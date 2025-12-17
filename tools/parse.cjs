const fs = require('fs');
const parser = require('@babel/parser');
const path = require('path');
const code = fs.readFileSync(path.join(__dirname, '../src/Pillars.jsx'), 'utf8');
try{
  const ast = parser.parse(code, {sourceType: 'module', plugins: ['jsx']});
  console.log('Parsed OK');
}catch(e){
  console.error('Parse error:', e.message);
  if(e.loc){
    console.error('At', e.loc);
    const lines = code.split('\n');
    const start = Math.max(0, e.loc.line - 5);
    const end = Math.min(lines.length, e.loc.line + 2);
    for(let i = start; i < end; i++){
      console.log((i+1)+': '+lines[i]);
    }
  }
  process.exit(1);
}
