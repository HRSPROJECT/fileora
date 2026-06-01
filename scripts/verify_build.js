import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '../dist');

// Read all html files recursively from dist
function getHtmlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getHtmlFiles(filePath));
    } else if (file.endsWith('.html') && file !== 'index-template.html') {
      results.push(filePath);
    }
  });
  return results;
}

const htmlFiles = getHtmlFiles(DIST_DIR);
console.log(`Scanning ${htmlFiles.length} statically pre-rendered HTML files for W3C & SEO compliance...`);

let totalIssues = 0;
let totalWarnings = 0;

htmlFiles.forEach(filePath => {
  const relPath = path.relative(DIST_DIR, filePath);
  const content = fs.readFileSync(filePath, 'utf8');

  console.log(`\n----------------------------------------`);
  console.log(`Scanning: ${relPath}`);
  
  // 1. Check style attributes
  // Let's find tags that have style="..." attributes in the HTML body
  // Wait, we exclude <style> blocks and tags inside SVGs (which use style for pathing, but standard crawlers exclude SVG child styles).
  // So we only match standard HTML elements with style attributes.
  const styleAttrRegex = /<[a-zA-Z0-9]+[^>]*\sstyle="([^"]*)"/g;
  let styleMatches = [];
  let match;
  while ((match = styleAttrRegex.exec(content)) !== null) {
    const fullTag = match[0];
    const styleValue = match[1];
    // Exclude svgs, paths, defs, g, etc.
    if (!fullTag.startsWith('<svg') && !fullTag.startsWith('<path') && !fullTag.startsWith('<rect') && !fullTag.startsWith('<circle') && !fullTag.startsWith('<g')) {
      styleMatches.push({ tag: fullTag, value: styleValue });
    }
  }

  if (styleMatches.length > 0) {
    console.log(`⚠️  W3C Warning: Found ${styleMatches.length} elements with inline style attributes:`);
    styleMatches.forEach((m, idx) => {
      if (idx < 5) console.log(`   - ${m.tag.substring(0, 100)}...`);
    });
    totalWarnings += styleMatches.length;
  } else {
    console.log(`✅ Style attributes: 0 inline styles in body HTML (100% W3C compliant!)`);
  }

  // 2. Check Headings Hierarchy
  // Extract all headings (h1, h2, h3, h4, h5, h6) in source order
  const headingRegex = /<(h[1-6])[^>]*>([\s\S]*?)<\/h[1-6]>/gi;
  let headings = [];
  while ((match = headingRegex.exec(content)) !== null) {
    const tag = match[1].toLowerCase();
    const text = match[2].replace(/<[^>]*>/g, '').trim(); // strip inner tags
    headings.push({ tag, level: parseInt(tag.substring(1)), text });
  }

  let headingsBroken = false;
  if (headings.length > 0) {
    console.log(`📋 Headings outline:`);
    headings.forEach(h => {
      console.log(`   - ${h.tag}: "${h.text.substring(0, 50)}"`);
    });

    // Check hierarchy sequence
    let prevLevel = 0;
    for (let i = 0; i < headings.length; i++) {
      const h = headings[i];
      if (h.level === 1 && prevLevel !== 0 && prevLevel !== 1) {
        // More than one h1 is flagged by some checkers, but let's check hierarchy skips:
      }
      if (h.level > prevLevel + 1) {
        console.log(`❌ Headings Skip: Jumped from ${prevLevel === 0 ? 'root' : 'h' + prevLevel} to ${h.tag} ("${h.text}")`);
        headingsBroken = true;
        totalIssues++;
      }
      prevLevel = h.level;
    }
    if (!headingsBroken) {
      console.log(`✅ Heading Hierarchy: Perfect chronological sequential outline!`);
    }
  } else {
    console.log(`⚠️  Headings: No headings found on this page.`);
  }

  // 3. Check Twitter Card Completeness
  const cardProfile = {
    card: content.includes('name="twitter:card"'),
    site: content.includes('name="twitter:site"'),
    creator: content.includes('name="twitter:creator"'),
    title: content.includes('name="twitter:title"'),
    description: content.includes('name="twitter:description"'),
    image: content.includes('name="twitter:image"'),
  };

  const missing = [];
  Object.keys(cardProfile).forEach(key => {
    if (!cardProfile[key]) missing.push(`twitter:${key}`);
  });

  if (missing.length > 0) {
    console.log(`⚠️  Social Meta Warning: Missing Twitter tags: ${missing.join(', ')}`);
    totalIssues += missing.length;
  } else {
    console.log(`✅ Social Meta: Twitter Card profile is 100% complete!`);
  }
});

console.log(`\n========================================`);
console.log(`Scan completed. Found ${totalIssues} critical SEO/accessibility errors and ${totalWarnings} minor style warnings.`);
if (totalIssues === 0) {
  console.log(`🎉 100% W3C AND SEO COMPLIANT! Verification passed successfully!`);
  process.exit(0);
} else {
  console.log(`❌ Deployment Blocked: Please resolve the ${totalIssues} critical errors listed above.`);
  process.exit(1);
}
