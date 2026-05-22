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
  '/scanner'
];

async function prerender() {
  console.log('Starting pre-rendering server and browser...');

  // 1. Start a local server to serve the dist folder
  const app = express();
  app.use(express.static(DIST_DIR));
  
  // Serve index.html for all non-file routes so client-side routing works
  app.use((req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
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
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 10000 });
        
        // Wait an additional 500ms to allow any immediate micro-render to complete
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Get the full HTML
        const html = await page.content();

        // Determine output target directory in dist
        const routeDir = path.join(DIST_DIR, route === '/' ? '' : route);
        if (!fs.existsSync(routeDir)) {
          fs.mkdirSync(routeDir, { recursive: true });
        }

        // Write to index.html inside the route directory
        fs.writeFileSync(path.join(routeDir, 'index.html'), html);
        console.log(`✅ Successfully saved prerendered HTML to: ${path.join(routeDir, 'index.html')}`);
      } catch (error) {
        console.error(`❌ Failed to prerender route ${route}:`, error);
      }
    }

    await browser.close();
    server.close();
    console.log('🎉 Prerendering completed successfully!');
    process.exit(0);
  });
}

prerender().catch(err => {
  console.error('Fatal error during prerendering:', err);
  process.exit(1);
});
