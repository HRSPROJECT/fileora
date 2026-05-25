import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PAGES_DIR = path.join(__dirname, '../src/pages');

const files = fs.readdirSync(PAGES_DIR).filter(file => file.endsWith('.jsx'));

console.log(`Starting final cleanup sweep...`);

files.forEach(file => {
  const filePath = path.join(PAGES_DIR, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 1. Resolve TrimVideo margin variation
  if (file === 'TrimVideo.jsx') {
    const trimStyleRegex = /<section className="container" style=\{\{\s*maxWidth:\s*'800px',\s*margin:\s*'0 auto 4rem auto'\s*\}\}>/g;
    if (trimStyleRegex.test(content)) {
      content = content.replace(trimStyleRegex, '<section className="container tool-description-section">');
      console.log(`[Style Fix] Cleaned margin style in TrimVideo.jsx`);
      modified = true;
    }
  }

  // 2. Resolve all h4 to h3 promotions inside Scanner.jsx to prevent skips
  if (file === 'Scanner.jsx') {
    // Replace any <h4 style=...> to <h3 style=...>
    const h4OpenRegex = /<h4 style=/g;
    if (h4OpenRegex.test(content)) {
      content = content.replace(h4OpenRegex, '<h3 style=');
      console.log(`[Scanner Heading] Replaced opening h4 tags with h3`);
      modified = true;
    }

    const h4CloseRegex = /<\/h4>/g;
    if (h4CloseRegex.test(content)) {
      content = content.replace(h4CloseRegex, '</h3>');
      console.log(`[Scanner Heading] Replaced closing h4 tags with h3`);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Successfully cleaned up ${file}\n`);
  }
});

console.log('🎉 Final sweep completed successfully!');
