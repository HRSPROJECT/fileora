/**
 * Regenerate PWA icons from public/pwa-icon.svg
 * Run: node scripts/generate-pwa-icons.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Resvg } from '@resvg/resvg-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '../public')
const svgPath = path.join(publicDir, 'pwa-icon.svg')
const svg = fs.readFileSync(svgPath, 'utf8')

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

for (const { name, size } of sizes) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: '#0b0f19',
  })
  const png = resvg.render().asPng()
  fs.writeFileSync(path.join(publicDir, name), png)
  console.log(`Wrote ${name} (${size}x${size})`)
}