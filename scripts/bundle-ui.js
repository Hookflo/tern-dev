const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'src/ui/index.html');
const outPath = path.join(root, 'src/ui-bundle.ts');

const html = fs.readFileSync(htmlPath, 'utf8');

const escaped = html
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\$\{/g, '\\${');

const output = `export const UI_HTML = \`${escaped}\`;\n`;

fs.writeFileSync(outPath, output);
console.log(`Bundled UI -> ${path.relative(root, outPath)}`);