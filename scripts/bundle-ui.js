const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'src/ui/index.html');
const cssPath = path.join(root, 'src/ui/styles.css');
const jsPath = path.join(root, 'src/ui/app.js');
const outPath = path.join(root, 'src/ui-bundle.ts');

const html = fs.readFileSync(htmlPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');

const merged = html
  .replace('__INLINE_STYLES__', css.replace(/<\/style>/g, '<\\/style>'))
  .replace('__INLINE_SCRIPT__', js.replace(/<\/script>/g, '<\\/script>'));

const output = `export const UI_BUNDLE_HTML = ${JSON.stringify(merged)};\n`;
fs.writeFileSync(outPath, output);
console.log(`Bundled UI -> ${path.relative(root, outPath)}`);
