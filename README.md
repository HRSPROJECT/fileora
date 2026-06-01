<div align="center">
  
  # 🚀 Fileora
  
  **Privacy-First, 100% Offline Client-Side Browser Utilities Suite**
  
  [![Published Site](https://img.shields.io/badge/Live-https%3A%2F%2Ffileora.tech-059669?style=for-the-badge&logoColor=white)](https://fileora.tech)
  [![License: MIT](https://img.shields.io/badge/License-MIT-3B82F6?style=for-the-badge)](LICENSE)
  [![Open Source](https://img.shields.io/badge/Open_Source-%E2%9D%A4-EF4444?style=for-the-badge)](https://github.com/HRSPROJECT/image-compressor)

  <p align="center">
    <strong>Perform high-speed document scanning, PDF conversions, image optimization, and video compression locally in your browser. Files never cross the internet. </strong>
  </p>

</div>

---

## 🌐 Website & About
Fileora is live and fully accessible at: **[https://fileora.tech](https://fileora.tech)**

Feel free to visit, explore all the client-side document/media tools, and run secure, offline, high-performance file modifications directly in your browser.

---

## 🌟 Why Fileora?

Traditional file tools (like iLovePDF, Smallpdf, or CamScanner) require you to upload your private files, legal agreements, financial statements, and personal photos to their cloud servers. This exposes your data to interception, breaches, server-side data logs, and compliance issues.

**Fileora runs 100% locally inside your browser's security sandbox.** By using modern browser APIs, compiled WebAssembly (Wasm) engines, and client-side JavaScript, Fileora processes multi-gigabyte media streams and documents on your physical device. 

### 🛡️ Core Pillars
* **Absolute Sovereign Privacy**: Strictly GDPR, HIPAA, and CCPA aligned by design. We have a zero-data-collection policy; your files never leave your device.
* **Zero Latency**: Skip waiting rooms and slow upload/download queues. Processing reads directly from your SSD/HDD into local memory at near-native CPU speeds.
* **Complete Offline Workflows**: Once loaded in your browser, Fileora’s processing engine runs fully offline, making it the perfect companion for secure air-gapped environments or travel.

---

## 🛠️ The Feature Suite

Fileora packs professional-grade tools categorized into four specialized engines:

| Category | Available Utilities | Underlying Client Tech |
| :--- | :--- | :--- |
| **📷 AI Scanner** | Document Scanner, quadrilateral edge-detection, perspective alignment, adaptive binarization, local OCR | Tesseract.js, Gaussian Elimination, Bradley-Roth Filters |
| **📄 PDF Tools** | PDF Compressor (100KB/200KB limits), Merge PDF, Split PDF, Protect/Encrypt PDF, Unlock PDF, Crop & Resize PDF, Page Numbers, Watermarks, Signatures | PDF-Lib, PDF.js, jsPDF, `@pdfsmaller/pdf-decrypt` |
| **🔄 Conversions** | PDF to Word, Word to PDF, Image to PDF, PNG to PDF, JPG to PDF, HEIC to JPG, Image Converter (JPEG, PNG, WebP, AVIF) | docx.js, docx-preview, Mammoth, html2canvas, browser-image-compression |
| **🎬 Video Tools** | MP4 to MP3, MOV to MP4, MOV to MP3, Video Compressor (bitrate & scale adjustment), Trim Video, Merge Video, Video Repeater | FFmpeg.wasm, Origin Private File System (OPFS) |

---

## 🔬 Behind the Scenes: Core Architecture & Algorithms

Fileora implements low-level scientific algebra and signal processing in client-side environments:

### A. Perspective Projection Warping (Gaussian Elimination)
To align and flatten skewed document scanner camera photos, Fileora solves an 8x8 linear system of equations in real-time to compute the homography matrix $H$:

$$\begin{bmatrix} x' \\ y' \\ 1 \end{bmatrix} = H \begin{bmatrix} x \\ y \\ 1 \end{bmatrix} = \begin{bmatrix} a_0 & a_1 & a_2 \\ a_3 & a_4 & a_5 \\ a_6 & a_7 & 1 \end{bmatrix} \begin{bmatrix} x \\ y \\ 1 \end{bmatrix}$$

It performs **Gaussian Elimination with partial pivoting** in client-side JS to solve for the 8 mapping coefficients, map target coordinates back to the source image, and warp the document snapshot cleanly.

### B. Adaptive Document Binarization (Bradley-Roth Algorithm)
To eliminate page shadows and uneven camera lighting, the Scanner uses the **Bradley-Roth adaptive thresholding algorithm** executed in $O(1)$ constant time per pixel using an **integral image** (Summed-Area Table). If a pixel is $12\%$ darker than its surrounding dynamic neighborhood window, it is mapped to text (black); otherwise, it is flattened to background (white).

### C. Origin Private File System (OPFS) & WASM Multithreading
To prevent tab crashes and out-of-memory errors when processing massive video containers, Fileora pipes stream buffers into the browser's native **Origin Private File System (OPFS)**. It dynamically loads compiled **FFmpeg WebAssembly** cores from unpkg CDN, mounts the OPFS files into virtual tracks, and utilizes isolated threads (`SharedArrayBuffer`) to transcode media at native performance.

---

## 🚀 Getting Started & Local Development

Run Fileora locally on your machine in seconds:

### Prerequisites
Make sure you have **Node.js (v18+)** and **npm** installed.

### 1. Clone the repository
```bash
git clone https://github.com/HRSPROJECT/image-compressor.git
cd fileora
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start the dev server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📦 Build, Static Prerendering, & Validation

Fileora features a sophisticated build pipeline to guarantee high-performance, crawlability, and top technical SEO placement.

To build and pre-render the pages statically:
```bash
npm run build
```

### What this build script does:
1. **SPA Bundler**: Compiles the React Router assets into the `dist/` directory.
2. **Puppeteer Crawl (`prerender.js`)**: Starts a local Express server on port `54321` and spawns a headless Puppeteer browser to crawl all 35+ routes, saving them as pre-rendered static HTML files (e.g. `compress.html`, `scanner.html`). This ensures search bots (like Googlebot) read fully populated markup instantly.
3. **Automated SEO/W3C Audit (`verify_build.js`)**: Scans all compiled static HTML files for skipped heading level outlines (accessibility check), missing Twitter/OpenGraph metadata tags, and exits with non-zero codes on critical failures to protect code quality.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  Made with ❤️ by the HRSPROJECT Team. Feel free to open issues or pull requests to improve the client-side engines!
</div>
