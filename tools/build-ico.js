import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const svgToIco = require('svg-to-ico');
import path from 'path';

// Use the simplified favicon SVG for sharper results at small sizes
const svgPath = path.resolve('./public/favicon.svg');
const outPath = path.resolve('./public/pillars.ico');

async function build() {
  try {
    await svgToIco({
      input_name: svgPath,
      output_name: outPath,
      sizes: [16, 24, 32, 48, 64, 128, 256]
    });
    console.log('Generated', outPath);
  } catch (err) {
    console.error('Error generating .ico:', err);
    process.exitCode = 1;
  }
}

build();
