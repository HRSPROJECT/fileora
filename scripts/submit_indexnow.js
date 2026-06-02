import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOST = 'fileora.tech';
const KEY = '4bc7f66f2d2d48e7b2fdb759fb2eb4f5';
const KEY_FILE = `${KEY}.txt`;
const KEY_LOCATION = `https://${HOST}/${KEY_FILE}`;

const DIST_DIR = path.join(__dirname, '../dist');

// Participating Search Engine IndexNow Endpoints
const ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
  'https://yandex.com/indexnow'
];

async function submitIndexNow() {
  console.log('🚀 Starting IndexNow search engine indexing submissions...');

  // 1. Double check the Key file exists in public/ or dist/
  const publicPath = path.join(__dirname, `../public/${KEY_FILE}`);
  const distPath = path.join(DIST_DIR, KEY_FILE);

  if (!fs.existsSync(publicPath) && !fs.existsSync(distPath)) {
    console.error(`❌ Key file ${KEY_FILE} not found in public/ or dist/! Please verify your setup.`);
    process.exit(1);
  }

  // 2. Scan dist/ recursively for all HTML pages
  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ dist/ directory does not exist! Please run "npm run build" first to pre-render the pages.');
    process.exit(1);
  }

  const getHtmlFiles = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getHtmlFiles(filePath));
      } else if (file.endsWith('.html')) {
        results.push(filePath);
      }
    });
    return results;
  };

  const htmlFiles = getHtmlFiles(DIST_DIR);
  
  // 3. Map html files to canonical URLs
  const urlList = htmlFiles
    .map(file => {
      // Get path relative to dist/
      let relPath = path.relative(DIST_DIR, file).replace(/\\/g, '/');
      
      // Map file to clean canonical URL
      if (relPath === 'index.html') {
        return `https://${HOST}`;
      } else if (relPath.endsWith('.html')) {
        return `https://${HOST}/${relPath.slice(0, -5)}`;
      }
      return `https://${HOST}/${relPath}`;
    })
    .filter(url => {
      // Exclude 404 or other utility error pages
      const excludePatterns = [
        /\/404$/,
        /\/404\.html$/
      ];
      return !excludePatterns.some(pattern => pattern.test(url));
    });

  // Deduplicate URLs just in case
  const uniqueUrls = [...new Set(urlList)].sort();

  console.log(`🔍 Found ${uniqueUrls.length} SEO pages ready to index:`);
  uniqueUrls.forEach(url => console.log(`  - ${url}`));

  if (uniqueUrls.length === 0) {
    console.log('⚠️ No URLs found to submit. Exiting...');
    return;
  }

  // 4. Construct the POST payload
  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: uniqueUrls
  };

  console.log('\n📦 Submission Payload:', JSON.stringify(payload, null, 2));

  // 5. Submit to all IndexNow endpoints
  console.log('\n📡 Sending requests to IndexNow endpoints...');
  
  for (const endpoint of ENDPOINTS) {
    try {
      console.log(`   Submitting to ${endpoint}...`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 200 || response.status === 202) {
        console.log(`   ✅ Successful submission to ${endpoint}! (HTTP ${response.status})`);
      } else {
        const text = await response.text().catch(() => '');
        console.error(`   ❌ Failed submission to ${endpoint}! (HTTP ${response.status}):`, text);
      }
    } catch (err) {
      console.error(`   ❌ Network error calling ${endpoint}:`, err.message);
    }
  }

  console.log('\n🎉 Search engine indexing submission complete!');
}

submitIndexNow().catch(err => {
  console.error('Fatal error submitting to IndexNow:', err);
  process.exit(1);
});
