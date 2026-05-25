import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 54321;
const DIST_DIR = path.join(__dirname, '../dist');

const routes = [
  '/',
  '/compress',
  '/resize',
  '/convert',
  '/image-to-pdf',
  '/png-to-pdf',
  '/merge-pdf',
  '/compress-pdf',
  '/split-pdf',
  '/unlock-pdf',
  '/resize-pdf',
  '/crop-pdf',
  '/pdf-to-jpg',
  '/heic-to-jpg',
  '/jpg-to-pdf',
  '/rotate-pdf',
  '/watermark-pdf',
  '/number-pdf',
  '/passport-photo',
  '/protect-pdf',
  '/sign-pdf',
  '/pdf-to-word',
  '/word-to-pdf',
  '/scanner',
  '/mov-to-mp4',
  '/compress-video',
  '/mp4-to-mp3',
  '/trim-video',
  '/merge-video',
  '/mov-to-mp3',
  '/repeat-video',
  '/alternative/ilovepdf',
  '/alternative/smallpdf',
  '/alternative/camscanner',
  '/404'
];

async function prerender() {
  console.log('Starting pre-rendering server and browser...');

  // 1. Backup the original clean index.html template and start a local server
  const TEMPLATE_PATH = path.join(DIST_DIR, 'index-template.html');
  fs.copyFileSync(path.join(DIST_DIR, 'index.html'), TEMPLATE_PATH);

  const app = express();
  app.use(express.static(DIST_DIR));
  
  // Serve the clean index-template.html for all non-file routes so client-side routing works correctly
  app.use((req, res) => {
    res.sendFile(TEMPLATE_PATH);
  });

  const server = app.listen(PORT, async () => {
    console.log(`Local server started at http://localhost:${PORT}`);

    // 2. Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    for (const route of routes) {
      console.log(`Prerendering route: ${route}`);
      const url = `http://localhost:${PORT}${route}`;
      
      try {
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });
        
        // Wait for lazy loaded route component spinner fallback to disappear
        await page.waitForSelector('.loader-shell', { hidden: true, timeout: 10000 }).catch(() => {});
        
        // Wait an additional 800ms to allow React Helmet to flush tags to the DOM
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Get the full HTML
        const html = await page.content();

        // Determine output target path in dist
        let outputPath;
        if (route === '/') {
          outputPath = path.join(DIST_DIR, 'index.html');
        } else {
          // If the route has subfolders (e.g. /alternative/ilovepdf), ensure parent folder exists
          const parentDir = path.dirname(path.join(DIST_DIR, route));
          if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
          }
          outputPath = path.join(DIST_DIR, `${route}.html`);
        }

        // Write the prerendered HTML file
        fs.writeFileSync(outputPath, html);
        console.log(`✅ Successfully saved prerendered HTML to: ${outputPath}`);
      } catch (error) {
        console.error(`❌ Failed to prerender route ${route}:`, error);
      }
    }

    await browser.close();
    server.close();
    if (fs.existsSync(TEMPLATE_PATH)) {
      fs.unlinkSync(TEMPLATE_PATH);
    }
    console.log('🎉 Prerendering completed successfully!');
    process.exit(0);
  });
}

prerender().catch(err => {
  console.error('Fatal error during prerendering:', err);
  process.exit(1);
});
