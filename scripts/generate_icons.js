import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.join(__dirname, '../public');
const SVG_PATH = path.join(PUBLIC_DIR, 'favicon.svg');

async function generateIcons() {
  console.log('Generating PWA launcher icons from SVG favicon...');

  if (!fs.existsSync(SVG_PATH)) {
    console.error('favicon.svg not found in public/ directory!');
    process.exit(1);
  }

  const svgContent = fs.readFileSync(SVG_PATH, 'utf-8');

  // Launch Puppeteer
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  const sizes = [192, 512];

  for (const size of sizes) {
    console.log(`Rendering PNG icon of size: ${size}x${size}...`);
    
    // Set viewport to the target size
    await page.setViewport({ width: size, height: size });

    // Load the SVG in the page, centering it nicely
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            background: transparent;
            overflow: hidden;
          }
          svg {
            width: 90%;
            height: 90%;
          }
        </style>
      </head>
      <body>
        ${svgContent}
      </body>
      </html>
    `;

    await page.setContent(htmlContent);

    // Save as screenshot with transparent background
    const outputPath = path.join(PUBLIC_DIR, `icon-${size}.png`);
    await page.screenshot({
      path: outputPath,
      omitBackground: true,
      type: 'png'
    });

    console.log(`✅ Generated: ${outputPath}`);
  }

  // Generate Apple Touch Icon (180x180) with blue/dark slate background as iOS requires solid background
  console.log('Rendering solid background Apple Touch Icon (180x180)...');
  await page.setViewport({ width: 180, height: 180 });
  const appleHtmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body, html {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #0f172a;
          overflow: hidden;
        }
        svg {
          width: 80%;
          height: 80%;
        }
      </style>
    </head>
    <body>
      ${svgContent}
    </body>
    </html>
  `;
  await page.setContent(appleHtmlContent);
  const appleOutputPath = path.join(PUBLIC_DIR, 'apple-touch-icon.png');
  await page.screenshot({
    path: appleOutputPath,
    type: 'png'
  });
  console.log(`✅ Generated: ${appleOutputPath}`);

  await browser.close();
  console.log('🎉 PWA icon generation complete!');
}

generateIcons().catch(err => {
  console.error('Error generating PWA icons:', err);
  process.exit(1);
});
