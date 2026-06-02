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
  '/share',
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
    
    // 3. Dynamically compile production asset pre-cache list and write to dist/sw.js
    try {
      generateServiceWorker();
    } catch (swErr) {
      console.error('❌ Failed to generate production Service Worker pre-cache list:', swErr);
    }

    console.log('🎉 Prerendering completed successfully!');
    process.exit(0);
  });
}

function generateServiceWorker() {
  console.log('Generating production Service Worker with dynamic pre-cache manifest...');
  
  const SW_TEMPLATE_PATH = path.join(__dirname, '../public/sw.js');
  const SW_DIST_PATH = path.join(DIST_DIR, 'sw.js');
  
  if (!fs.existsSync(SW_TEMPLATE_PATH)) {
    console.error('Service Worker template not found in public/sw.js!');
    return;
  }
  
  // Recursively find all files in dist/
  const getFilesRecursively = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getFilesRecursively(filePath));
      } else {
        results.push(filePath);
      }
    });
    return results;
  };
  
  const allFiles = getFilesRecursively(DIST_DIR);
  
  // Map files to root-relative URLs and filter them
  const assetsToCache = allFiles
    .map(file => {
      const relativePath = path.relative(DIST_DIR, file);
      return '/' + relativePath.replace(/\\/g, '/');
    })
    .filter(url => {
      // Exclude service worker itself, cloudflare config files, and standard system garbage files
      const excludePatterns = [
        /^\/sw\.js$/,
        /^\/_headers$/,
        /^\/_redirects$/,
        /\.DS_Store$/,
        /^\/fileora\.code-workspace$/,
        /^\/4bc7f66f2d2d48e7b2fdb759fb2eb4f5\.txt$/
      ];
      return !excludePatterns.some(pattern => pattern.test(url));
    });
    
  // Let's add the root path '/' to ensure the main route is pre-cached explicitly
  if (!assetsToCache.includes('/')) {
    assetsToCache.unshift('/');
  }
  
  console.log(`Found ${assetsToCache.length} local production assets to pre-cache.`);
  
  // Read sw.js template
  let swContent = fs.readFileSync(SW_TEMPLATE_PATH, 'utf-8');
  
  // CDN assets that must be pre-cached
  const cdnAssets = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
    'https://unpkg.com/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs',
    'https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js',
    'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
    'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.wasm',
    'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js',
    'https://unpkg.com/qrcode-generator@1.4.4/qrcode.js',
    'https://unpkg.com/jsqr@1.4.0/dist/jsQR.js'
  ];
  
  const fullAssetsList = [...assetsToCache, ...cdnAssets];
  
  // Replace the ASSETS_TO_CACHE array in the template
  const assetsArrayString = JSON.stringify(fullAssetsList, null, 2);
  const regex = /const ASSETS_TO_CACHE = \[\s*[\s\S]*?\];/;
  
  if (regex.test(swContent)) {
    swContent = swContent.replace(regex, `const ASSETS_TO_CACHE = ${assetsArrayString};`);
    fs.writeFileSync(SW_DIST_PATH, swContent);
    console.log('✅ Service Worker pre-cache manifest injected successfully in dist/sw.js!');
  } else {
    console.error('Could not find ASSETS_TO_CACHE placeholder in sw.js template!');
  }
}

prerender().catch(err => {
  console.error('Fatal error during prerendering:', err);
  process.exit(1);
});
