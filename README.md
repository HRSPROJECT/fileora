<div align="center">
  
  # Fileora
  
  **Privacy-first browser tools for PDF, image, video & document workflows**
  
  [![Live site](https://img.shields.io/badge/Live-fileora.tech-059669?style=for-the-badge)](https://fileora.tech)
  [![License: MIT](https://img.shields.io/badge/License-MIT-3B82F6?style=for-the-badge)](LICENSE)
  [![GitHub](https://img.shields.io/badge/Source-HRSPROJECT%2Ffileora-181717?style=for-the-badge&logo=github)](https://github.com/HRSPROJECT/fileora)

  <p align="center">
    <strong>Compress, convert, scan, sign, and share files locally in your browser. Files never upload to Fileora servers.</strong>
  </p>

</div>

---

## Live site

**[https://fileora.tech](https://fileora.tech)** — 30+ free tools, no signup.

---

## Why Fileora?

Cloud tools (iLovePDF, Smallpdf, CamScanner) require uploading private documents to their servers. Fileora runs **entirely in your browser** using WebAssembly and client-side JavaScript — your files stay on your device.

| | Cloud tools | Fileora |
|---|---|---|
| File upload | Required | **Never** |
| Works offline | Rarely | **Yes** (after first load) |
| Account required | Often | **No** |
| Multi-step workflows | Manual re-upload | **Continue with** handoff |

---

## What's new in v1.0.0

### Continue with workflows
After any tool finishes, click **Continue with another tool** to see smart next steps for your output:

- **Image Compress** → Image to PDF, Resizer, Converter, AI Scanner, P2P Share  
- **Merge PDF** → Compress PDF, Split, Protect, Sign, Watermark, Share  
- **Video tools** → Trim, Compress, Convert, Share  

Your output stays in browser memory — no re-upload between steps.

### Offline-first, honest about Share
- All processing tools work **offline** once the app is loaded.
- **P2P Share** is the only feature that needs internet (Wi‑Fi or mobile data) to pair two browsers. File content still transfers device-to-device.

---

## Tool suite

| Category | Tools |
|----------|-------|
| **Images** | Compress, Resize, Convert, HEIC to JPG, Passport Photo |
| **PDF** | Merge, Split, Compress (100/200/500KB), Unlock, Protect, Sign, Watermark, Page Numbers, Rotate, Crop, Resize |
| **Conversions** | Image/PNG/JPG to PDF, PDF to JPG, PDF to Word, Word to PDF |
| **Scanner** | AI Document Scanner — edge detect, perspective warp, OCR, PDF export |
| **Video** | MOV to MP4, Compress, Trim, Merge, Repeat, MP4/MOV to MP3 |
| **Share** | P2P File Share (WebRTC, device-to-device) |

---

## Tech stack

- **React 19** + **Vite 8** + React Router 7  
- **PDF**: pdf-lib, PDF.js, jsPDF, `@pdfsmaller/pdf-decrypt` / `pdf-encrypt`  
- **Images**: browser-image-compression, Canvas APIs, heic2any  
- **Scanner**: Tesseract.js OCR, homography warp (Gaussian elimination), Bradley-Roth binarization  
- **Video**: FFmpeg.wasm + Origin Private File System (OPFS)  
- **Share**: PeerJS WebRTC  
- **SEO**: Puppeteer static prerender for all routes  

---

## Getting started

### Prerequisites
Node.js 18+ and npm.

### Install & run
```bash
git clone https://github.com/HRSPROJECT/fileora.git
cd fileora
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Build for production
```bash
npm run build
```

This runs Vite build + Puppeteer prerender (35+ routes) + service worker pre-cache injection.

### Lint
```bash
npm run lint
```

---

## Project structure

```
src/
  components/     # UI per tool + shared (Navbar, DropZone, ContinueWithPanel)
  context/        # Theme, Share, Workflow providers
  hooks/          # useWorkflowHandoff
  pages/          # Route pages (one per tool)
  utils/          # workflowEngine, p2pEngine, pdfUtils, videoEngine
scripts/
  prerender.js    # Static HTML generation for SEO
```

---

## Contributing

Issues and pull requests welcome on [GitHub](https://github.com/HRSPROJECT/fileora/issues).

1. Fork the repo  
2. Create a feature branch  
3. Run `npm run lint` and `npm run build`  
4. Open a PR  

---

## License

MIT — see [LICENSE](LICENSE).

---

<div align="center">
  Made with care by <a href="https://github.com/HRSPROJECT">HRSPROJECT</a>
</div>