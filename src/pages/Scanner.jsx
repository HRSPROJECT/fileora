import { useState, useRef, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { useShare } from '../context/ShareContext'
import { Camera, Upload, Trash2, Plus, Download, Sparkles, Settings, Eye, CheckCircle, RotateCw, Check, ChevronLeft, ChevronRight, Image as ImageIcon, FileText, Layers, Video, Shield, Smartphone, AlertTriangle, RefreshCw, GripVertical, X, Share2 } from 'lucide-react'
import Navbar from '../components/shared/Navbar'
import Footer from '../components/shared/Footer'
import DropZone from '../components/shared/DropZone'
import { jsPDF } from 'jspdf'
import { formatBytes } from '../utils/imageUtils'
import Tesseract from 'tesseract.js'

// Solve 8x8 linear system using Gaussian Elimination
function solveGaussian(A, b) {
  const n = b.length;
  for (let i = 0; i < n; i++) {
    // Find pivot row
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
        maxRow = k;
      }
    }
    // Swap rows in A and b
    const tempA = A[i];
    A[i] = A[maxRow];
    A[maxRow] = tempA;
    const tempB = b[i];
    b[i] = b[maxRow];
    b[maxRow] = tempB;

    // Check for singular matrix
    if (Math.abs(A[i][i]) < 1e-12) {
      continue;
    }

    // Eliminate columns below
    for (let k = i + 1; k < n; k++) {
      const c = -A[k][i] / A[i][i];
      for (let j = i; j < n; j++) {
        if (i === j) {
          A[k][j] = 0;
        } else {
          A[k][j] += c * A[i][j];
        }
      }
      b[k] += c * b[i];
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    if (Math.abs(A[i][i]) < 1e-12) {
      x[i] = 0;
      continue;
    }
    x[i] = b[i] / A[i][i];
    for (let k = i - 1; k >= 0; k--) {
      b[k] -= A[k][i] * x[i];
    }
  }
  return x;
}

// Map target corners (0,0), (W,0), (W,H), (0,H) to source coordinates (TL, TR, BR, BL)
function getPerspectiveCoefficients(srcCorners, W, H) {
  const A = [];
  const b = [];
  const targetCorners = [
    { u: 0, v: 0 },
    { u: W, v: 0 },
    { u: W, v: H },
    { u: 0, v: H }
  ];

  for (let i = 0; i < 4; i++) {
    const { u, v } = targetCorners[i];
    const { x, y } = srcCorners[i];

    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]);
    b.push(x);

    A.push([0, 0, 0, u, v, 1, -u * y, -v * y]);
    b.push(y);
  }

  return solveGaussian(A, b);
}

// Perform perspective transform (warping) on original high-res canvas
function applyPerspectiveWarp(srcCtx, srcWidth, srcHeight, srcCorners, W, H) {
  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = W;
  dstCanvas.height = H;
  const dstCtx = dstCanvas.getContext('2d');
  
  const dstImgData = dstCtx.createImageData(W, H);
  const dstData = dstImgData.data;

  const srcImgData = srcCtx.getImageData(0, 0, srcWidth, srcHeight);
  const srcData = srcImgData.data;

  const coeffs = getPerspectiveCoefficients(srcCorners, W, H);
  const [a0, a1, a2, a3, a4, a5, a6, a7] = coeffs;

  for (let v = 0; v < H; v++) {
    for (let u = 0; u < W; u++) {
      const denom = a6 * u + a7 * v + 1;
      if (Math.abs(denom) < 1e-10) continue;

      const x = (a0 * u + a1 * v + a2) / denom;
      const y = (a3 * u + a4 * v + a5) / denom;

      const px = Math.round(x);
      const py = Math.round(y);

      const dstIdx = (v * W + u) * 4;

      if (px >= 0 && px < srcWidth && py >= 0 && py < srcHeight) {
        const srcIdx = (py * srcWidth + px) * 4;
        dstData[dstIdx] = srcData[srcIdx];
        dstData[dstIdx + 1] = srcData[srcIdx + 1];
        dstData[dstIdx + 2] = srcData[srcIdx + 2];
        dstData[dstIdx + 3] = srcData[srcIdx + 3];
      } else {
        // Fallback white pixel if boundary breached
        dstData[dstIdx] = 255;
        dstData[dstIdx + 1] = 255;
        dstData[dstIdx + 2] = 255;
        dstData[dstIdx + 3] = 255;
      }
    }
  }

  dstCtx.putImageData(dstImgData, 0, 0);
  return dstCanvas;
}

// Enhance image with premium filters
function applyImageFilter(ctx, W, H, filterType) {
  if (filterType === 'original') return;

  const imgData = ctx.getImageData(0, 0, W, H);
  const d = imgData.data;

  if (filterType === 'magic' || filterType === 'bw') {
    // 1. Calculate integral image (Summed-Area Table) of luminance
    const integral = new Float32Array(W * H);
    for (let y = 0; y < H; y++) {
      let rowSum = 0;
      for (let x = 0; x < W; x++) {
        const idx = (y * W + x) * 4;
        const r = d[idx];
        const g = d[idx + 1];
        const b = d[idx + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        rowSum += gray;
        if (y === 0) {
          integral[y * W + x] = rowSum;
        } else {
          integral[y * W + x] = integral[(y - 1) * W + x] + rowSum;
        }
      }
    }

    // 2. Define local neighborhood sliding window (e.g. 15% of min dimension)
    const s = Math.round(Math.min(W, H) * 0.15) | 1;
    const radius = Math.floor(s / 2);

    if (filterType === 'magic') {
      // Magic Color Scan: dynamically adjust contrast & stretch white levels
      for (let y = 0; y < H; y++) {
        const y1 = Math.max(0, y - radius);
        const y2 = Math.min(H - 1, y + radius);
        for (let x = 0; x < W; x++) {
          const x1 = Math.max(0, x - radius);
          const x2 = Math.min(W - 1, x + radius);
          const count = (x2 - x1 + 1) * (y2 - y1 + 1);

          // Get local sum in O(1) time
          const sum = integral[y2 * W + x2]
                    - (x1 > 0 ? integral[y2 * W + (x1 - 1)] : 0)
                    - (y1 > 0 ? integral[(y1 - 1) * W + x2] : 0)
                    + (x1 > 0 && y1 > 0 ? integral[(y1 - 1) * W + (x1 - 1)] : 0);

          const avg = sum / count;
          const idx = (y * W + x) * 4;
          let r = d[idx];
          let g = d[idx + 1];
          let b = d[idx + 2];
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;

          const diff = gray - avg;

          // Local adaptive scaling
          if (diff > -8) {
            // Background pixel: push strongly to white to flatten shadows
            const factor = 1 + (diff / 255) * 1.6;
            r = Math.min(255, r * factor);
            g = Math.min(255, g * factor);
            b = Math.min(255, b * factor);
          } else {
            // Text pixel: darken to enhance legibility
            const factor = Math.max(0.25, 1 + (diff / avg) * 2.2);
            r = r * factor;
            g = g * factor;
            b = b * factor;
          }

          // Apply a gentle contrast boost to pop colors
          const contrast = 25;
          const f = (259 * (contrast + 255)) / (255 * (259 - contrast));
          d[idx]     = Math.max(0, Math.min(255, f * (r - 128) + 128 + 12));
          d[idx + 1] = Math.max(0, Math.min(255, f * (g - 128) + 128 + 12));
          d[idx + 2] = Math.max(0, Math.min(255, f * (b - 128) + 128 + 12));
        }
      }
    } else {
      // B&W Document: Bradley-Roth adaptive local binarization
      const t = 0.88; // threshold percentage (12% below local average)
      for (let y = 0; y < H; y++) {
        const y1 = Math.max(0, y - radius);
        const y2 = Math.min(H - 1, y + radius);
        for (let x = 0; x < W; x++) {
          const x1 = Math.max(0, x - radius);
          const x2 = Math.min(W - 1, x + radius);
          const count = (x2 - x1 + 1) * (y2 - y1 + 1);

          const sum = integral[y2 * W + x2]
                    - (x1 > 0 ? integral[y2 * W + (x1 - 1)] : 0)
                    - (y1 > 0 ? integral[(y1 - 1) * W + x2] : 0)
                    + (x1 > 0 && y1 > 0 ? integral[(y1 - 1) * W + (x1 - 1)] : 0);

          const avg = sum / count;
          const idx = (y * W + x) * 4;
          const r = d[idx];
          const g = d[idx + 1];
          const b = d[idx + 2];
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;

          const val = gray < avg * t ? 0 : 255;
          d[idx]     = val;
          d[idx + 1] = val;
          d[idx + 2] = val;
        }
      }
    }
  } else if (filterType === 'gray') {
    // Smooth document grayscale
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2];
      d[i] = gray;
      d[i+1] = gray;
      d[i+2] = gray;
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

// Compute 8x8 client-side perceptual signature
function getPerceptualSignature(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 8;
      canvas.height = 8;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 8, 8);
      const imgData = ctx.getImageData(0, 0, 8, 8);
      const data = imgData.data;
      const sig = new Uint8Array(64);
      for (let i = 0; i < 64; i++) {
        sig[i] = Math.round((data[i*4] + data[i*4+1] + data[i*4+2]) / 3);
      }
      resolve(sig);
    };
    img.src = dataUrl;
  });
}

export default function Scanner() {
  const navigate = useNavigate();
  const { setFileToShare } = useShare();
  const [pages, setPages] = useState([]); // array of page objects: { id, originalSrc, originalWidth, originalHeight, corners, filter, rotation, signature }
  const [currentPageIdx, setCurrentPageIdx] = useState(-1);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [error, setError] = useState('');
  
  // Camera auto-capture & stability analysis states
  const [isAutoCapture, setIsAutoCapture] = useState(true); // Default to Auto-capture
  const [stabilityProgress, setStabilityProgress] = useState(0); // 0 to 100
  const [isCapturingProgress, setIsCapturingProgress] = useState(false);
  const [liveScanStatus, setLiveScanStatus] = useState('searching'); // searching, motion, low-light, aligning, perfect, manual
  
  // Perceptual duplicate scanner states
  const [pendingDuplicatePage, setPendingDuplicatePage] = useState(null);
  
  // Compilation settings
  const [pageSize, setPageSize] = useState('fit'); 
  const [pdfQuality, setPdfQuality] = useState('high'); 
  const [isCompiling, setIsCompiling] = useState(false);

  // Live editor crop/preview/ocr modes, dynamic preview URL, drag positions, and auto-capture cooldown
  const [editorMode, setEditorMode] = useState('crop'); // 'crop', 'preview', or 'ocr'
  const [warpedPreviewSrc, setWarpedPreviewSrc] = useState(null);
  const [captureCooldown, setCaptureCooldown] = useState(0); // Cooldown timer (seconds) after automatic snaps

  // Custom organizer and loupe state variables
  const [draggedPageIdx, setDraggedPageIdx] = useState(null);
  const [activeDragPin, setActiveDragPin] = useState(null); // index of corner (0-3) currently being dragged
  const [dragPosition, setDragPosition] = useState(null); // { x, y } coordinates of the dragged pin relative to crop container

  // Client-side OCR Text Extraction states
  const [ocrText, setOcrText] = useState({}); // { [pageId]: string }
  const [ocrLoading, setOcrLoading] = useState({}); // { [pageId]: boolean }
  const [ocrProgress, setOcrProgress] = useState(0); // active OCR progress (0-100)

  // 1. Tick down the capture cooldown timer every second
  useEffect(() => {
    if (captureCooldown <= 0) return;
    const timer = setInterval(() => {
      setCaptureCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [captureCooldown]);

  // 2. Generate the warped & filtered scan preview image dynamically when pages or settings change
  useEffect(() => {
    if (currentPageIdx < 0 || pages.length === 0 || isCameraActive) {
      setWarpedPreviewSrc(null);
      return;
    }
    
    const page = pages[currentPageIdx];
    if (!page) return;

    const generatePreview = async () => {
      try {
        const img = new Image();
        img.onload = () => {
          const srcCanvas = document.createElement('canvas');
          srcCanvas.width = page.originalWidth;
          srcCanvas.height = page.originalHeight;
          const srcCtx = srcCanvas.getContext('2d');
          
          srcCtx.drawImage(img, 0, 0);

          const scaleCorners = page.corners.map(c => ({
            x: c.x * page.originalWidth,
            y: c.y * page.originalHeight
          }));

          const targetWidth = 600; // Fast preview downsampled width
          
          const side1 = Math.hypot(scaleCorners[1].x - scaleCorners[0].x, scaleCorners[1].y - scaleCorners[0].y);
          const side2 = Math.hypot(scaleCorners[2].x - scaleCorners[3].x, scaleCorners[2].y - scaleCorners[3].y);
          const topBottomRatio = Math.max(side1, side2);
          
          const side3 = Math.hypot(scaleCorners[3].x - scaleCorners[0].x, scaleCorners[3].y - scaleCorners[0].y);
          const side4 = Math.hypot(scaleCorners[2].x - scaleCorners[1].x, scaleCorners[2].y - scaleCorners[1].y);
          const leftRightRatio = Math.max(side3, side4);

          const aspect = leftRightRatio / topBottomRatio;
          const targetHeight = Math.round(targetWidth * (isNaN(aspect) || aspect <= 0 ? 1.414 : aspect));

          const warpedCanvas = applyPerspectiveWarp(srcCtx, page.originalWidth, page.originalHeight, scaleCorners, targetWidth, targetHeight);
          const warpedCtx = warpedCanvas.getContext('2d');

          applyImageFilter(warpedCtx, targetWidth, targetHeight, page.filter);

          setWarpedPreviewSrc(warpedCanvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = page.originalSrc;
      } catch (e) {
        console.error("Error generating warped preview:", e);
      }
    };

    // Debounce preview calculations by 150ms to prevent dragging drag pins from freezing UI threads
    const timer = setTimeout(generatePreview, 150);
    return () => clearTimeout(timer);
  }, [currentPageIdx, pages, isCameraActive]);

  const videoRef = useRef(null);
  const activeStreamRef = useRef(null);
  const cropContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Drag State Tracker
  const [displayWidth, setDisplayWidth] = useState(360);
  const [displayHeight, setDisplayHeight] = useState(480);

  // Stability loops refs
  const stabilityCanvasRef = useRef(null);
  const stabilityTimerRef = useRef(null);
  const lastFramePixelsRef = useRef(null);
  const stableFramesRef = useRef(0);

  // Initialize and list cameras
  useEffect(() => {
    const listCameras = async () => {
      try {
        const mediaDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = mediaDevices.filter(device => device.kind === 'videoinput');
        setDevices(videoDevices);
        if (videoDevices.length > 0) {
          // Select back camera by default if it contains "back" or "environment" or "rear"
          const backCam = videoDevices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('environment') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('main')
          );
          setSelectedDeviceId(backCam ? backCam.deviceId : videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error('Error fetching video devices:', err);
      }
    };
    listCameras();

    return () => stopCamera();
  }, []);

  const startCamera = async (deviceId = null) => {
    stopCamera();
    setError('');
    setIsCameraActive(true);
    setStabilityProgress(0);
    stableFramesRef.current = 0;
    lastFramePixelsRef.current = null;

    // Use selectedDeviceId if no specific deviceId was passed
    const targetDeviceId = deviceId || selectedDeviceId;

    try {
      const constraints = {
        video: targetDeviceId 
          ? { deviceId: { exact: targetDeviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      activeStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Re-list devices now that permission is granted so we get correct labels!
      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = mediaDevices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
      
      const activeTrack = stream.getVideoTracks()[0];
      const activeSettings = activeTrack ? activeTrack.getSettings() : {};
      const activeTrackDeviceId = activeSettings.deviceId;

      // Update selectedDeviceId to the actual running camera
      if (activeTrackDeviceId) {
        setSelectedDeviceId(activeTrackDeviceId);
      }

      // Auto-switch to rear/back camera if a better back camera exists and is not currently running
      if (videoDevices.length > 1) {
        const backCam = videoDevices.find(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('environment') || 
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('main')
        );
        if (backCam && activeTrackDeviceId && backCam.deviceId !== activeTrackDeviceId) {
          // Double check to avoid infinite loop: only switch if the user didn't explicitly request a specific camera
          if (!deviceId) {
            setSelectedDeviceId(backCam.deviceId);
            setTimeout(() => {
              startCamera(backCam.deviceId);
            }, 150);
          }
        }
      }
    } catch (err) {
      console.error('Webcam permission denied:', err);
      setError('Could not access the camera. Please check permissions or upload document images instead.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach(track => track.stop());
      activeStreamRef.current = null;
    }
    setIsCameraActive(false);
    
    // Clear stability timer loop
    if (stabilityTimerRef.current) {
      clearInterval(stabilityTimerRef.current);
      stabilityTimerRef.current = null;
    }
    setStabilityProgress(0);
  };

  // Switch active webcam device
  const handleDeviceChange = (deviceId) => {
    setSelectedDeviceId(deviceId);
    if (isCameraActive) {
      startCamera(deviceId);
    }
  };

  // Real-time Frame Stability auto-capture scanner loop
  useEffect(() => {
    if (!isCameraActive) {
      if (stabilityTimerRef.current) {
        clearInterval(stabilityTimerRef.current);
        stabilityTimerRef.current = null;
      }
      return;
    }

    stabilityTimerRef.current = setInterval(() => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;
      
      // Auto-capture must be enabled, no active duplicate, no capture in progress, and no active cooldown
      if (!isAutoCapture || pendingDuplicatePage || isCapturingProgress || captureCooldown > 0) {
        return;
      }

      try {
        if (!stabilityCanvasRef.current) {
          stabilityCanvasRef.current = document.createElement('canvas');
          stabilityCanvasRef.current.width = 48;
          stabilityCanvasRef.current.height = 36;
        }

        const canvas = stabilityCanvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, 48, 36);
        
        const imgData = ctx.getImageData(0, 0, 48, 36);
        const pixels = imgData.data;

        let motion = 0;
        if (lastFramePixelsRef.current) {
          const prev = lastFramePixelsRef.current;
          let diffSum = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            const gray = (pixels[i] + pixels[i+1] + pixels[i+2]) / 3;
            const prevGray = (prev[i] + prev[i+1] + prev[i+2]) / 3;
            const diff = Math.abs(gray - prevGray);
            // Apply a noise gate of 10 to ignore microscopic frame sensor noise and jitter
            if (diff > 10) {
              diffSum += diff;
            }
          }
          motion = diffSum / (pixels.length / 4);
        }
        lastFramePixelsRef.current = pixels;

        // Perform page contrast & presence heuristics
        let maxBright = 0;
        let minBright = 255;
        let brightSum = 0;
        let paperPixels = 0;
        const totalPixels = pixels.length / 4;

        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i+1];
          const b = pixels[i+2];
          const bright = (r + g + b) / 3;

          if (bright > maxBright) maxBright = bright;
          if (bright < minBright) minBright = bright;
          brightSum += bright;

          // Saturation = diff between max and min of RGB channels
          const maxC = Math.max(r, g, b);
          const minC = Math.min(r, g, b);
          const sat = maxC - minC;

          // High brightness (light paper color) and low saturation (neutral/white sheet)
          if (bright > 155 && sat < 35) {
            paperPixels++;
          }
        }

        const avgBright = brightSum / totalPixels;
        const contrastRange = maxBright - minBright;
        const paperRatio = paperPixels / totalPixels;

        // Calculate edge density to ensure text or structured boundaries are present
        let edgeSum = 0;
        const w = 48;
        const h = 36;
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = (y * w + x) * 4;
            const val = (pixels[idx] + pixels[idx+1] + pixels[idx+2]) / 3;
            const rightVal = (pixels[idx + 4] + pixels[idx + 5] + pixels[idx + 6]) / 3;
            const bottomVal = (pixels[((y + 1) * w + x) * 4] + pixels[((y + 1) * w + x) * 4 + 1] + pixels[((y + 1) * w + x) * 4 + 2]) / 3;
            edgeSum += Math.abs(val - rightVal) + Math.abs(val - bottomVal);
          }
        }
        const avgEdgeGrad = edgeSum / ((w - 2) * (h - 2));

        // Determine if we are on a front-facing / laptop camera to apply adaptive motion thresholds
        const activeDev = devices.find(d => d.deviceId === selectedDeviceId);
        const isFrontCamera = (devices.length <= 1) || (activeDev ? (
          activeDev.label.toLowerCase().includes('front') ||
          activeDev.label.toLowerCase().includes('user') ||
          activeDev.label.toLowerCase().includes('webcam') ||
          activeDev.label.toLowerCase().includes('facetime')
        ) : true);

        // Laptop/front cameras have high-tolerance motion thresholds (up to 5.5) because papers are held in the air
        // Rear phone cameras are more stable and expect tighter thresholds
        const motionLimit = isFrontCamera ? 5.5 : 3.2;
        const alignLimit = isFrontCamera ? 3.2 : 1.8;
        const minPaperRatio = isFrontCamera ? 0.08 : 0.04; // Require a larger paper ratio on front camera to avoid false face triggers
        const minEdgeGrad = isFrontCamera ? 5.0 : 4.0;
        const minContrast = isFrontCamera ? 55 : 45;

        let currentStatus = 'searching';
        if (avgBright < 35) {
          currentStatus = 'low-light';
        } else if (motion > motionLimit) {
          currentStatus = 'motion';
        } else if (contrastRange < minContrast || paperRatio < minPaperRatio || avgEdgeGrad < minEdgeGrad) {
          currentStatus = 'searching';
        } else if (motion > alignLimit) {
          currentStatus = 'aligning';
        } else {
          currentStatus = 'perfect';
        }

        setLiveScanStatus(currentStatus);

        // If perfect document alignment & stability is reached, capture instantly!
        if (currentStatus === 'perfect') {
          capturePage();
        }
      } catch (err) {
        // Silent catch for canvas startup mismatch frames
      }
    }, 250);

    return () => {
      if (stabilityTimerRef.current) {
        clearInterval(stabilityTimerRef.current);
        stabilityTimerRef.current = null;
      }
    };
  }, [isCameraActive, isAutoCapture, pendingDuplicatePage, isCapturingProgress, devices, selectedDeviceId, captureCooldown]);

  // Capture current camera video frame
  const capturePage = async () => {
    if (!videoRef.current || !isCameraActive || isCapturingProgress) return;

    setIsCapturingProgress(true);
    const video = videoRef.current;
    
    // Create an offline high-resolution canvas
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    
    const ctx = canvas.getContext('2d');
    
    // Mirror image if camera is front-facing
    const activeDev = devices.find(d => d.deviceId === selectedDeviceId);
    const isFront = (devices.length <= 1) || (activeDev ? (
      activeDev.label.toLowerCase().includes('front') ||
      activeDev.label.toLowerCase().includes('user') ||
      activeDev.label.toLowerCase().includes('webcam') ||
      activeDev.label.toLowerCase().includes('facetime')
    ) : true);
    if (isFront) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const originalSrc = canvas.toDataURL('image/jpeg', 0.95);
    
    // Provide gorgeous capture visual flash feedback
    const overlay = document.createElement('div');
    overlay.className = 'capture-flash-overlay';
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 400);

    // Compute 8x8 perceptual signature
    const signature = await getPerceptualSignature(originalSrc);

    const newPage = {
      id: `page_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      originalSrc,
      originalWidth: canvas.width,
      originalHeight: canvas.height,
      corners: [
        { x: 0.1, y: 0.1 }, 
        { x: 0.9, y: 0.1 }, 
        { x: 0.9, y: 0.9 }, 
        { x: 0.1, y: 0.9 }  
      ],
      filter: 'magic', 
      rotation: 0,
      signature
    };

    setIsCapturingProgress(false);

    // Check signature against existing captured pages to detect repeat/duplicate scans
    let isDuplicate = false;
    for (const p of pages) {
      if (p.signature) {
        let diff = 0;
        for (let i = 0; i < 64; i++) {
          diff += Math.abs(p.signature[i] - signature[i]);
        }
        const avgDiff = diff / 64;
        
        // A threshold of < 7.5 average absolute difference indicates a virtually identical photo scan
        if (avgDiff < 7.5) {
          isDuplicate = true;
          break;
        }
      }
    }

    if (isDuplicate) {
      if (videoRef.current) {
        try {
          videoRef.current.pause();
        } catch (e) {}
      }
      // Prompt user with modal duplicate alert instead of adding directly
      setPendingDuplicatePage(newPage);
    } else {
      addPageToTray(newPage);
    }
  };

  const addPageToTray = (page) => {
    setPages(prev => {
      const nextPages = [...prev, page];
      setCurrentPageIdx(nextPages.length - 1);
      return nextPages;
    });
    // Trigger 4-second capture cooldown so user can comfortably flip pages or swap documents!
    setCaptureCooldown(4);
  };

  const handlePageDrop = (targetIdx) => {
    if (draggedPageIdx === null || draggedPageIdx === targetIdx) return;
    setPages(prev => {
      const next = [...prev];
      const [removed] = next.splice(draggedPageIdx, 1);
      next.splice(targetIdx, 0, removed);
      
      // Keep active page selected in its new position
      if (currentPageIdx === draggedPageIdx) {
        setCurrentPageIdx(targetIdx);
      } else if (currentPageIdx > draggedPageIdx && currentPageIdx <= targetIdx) {
        setCurrentPageIdx(currentPageIdx - 1);
      } else if (currentPageIdx < draggedPageIdx && currentPageIdx >= targetIdx) {
        setCurrentPageIdx(currentPageIdx + 1);
      }
      
      return next;
    });
    setDraggedPageIdx(null);
  };

  const autoDetectBorders = () => {
    if (currentPageIdx < 0 || pages.length === 0) return;
    const page = pages[currentPageIdx];

    const img = new Image();
    img.onload = () => {
      const W = 320;
      const H = 240;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, W, H);

      const imgData = ctx.getImageData(0, 0, W, H);
      const d = imgData.data;

      const getLuminance = (x, y) => {
        const idx = (y * W + x) * 4;
        return 0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2];
      };

      const detectCorner = (startX, startY, endX, endY) => {
        const steps = 100;
        let bestX = startX;
        let bestY = startY;
        let found = false;

        let prevLum = getLuminance(startX, startY);

        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const x = Math.round(startX + (endX - startX) * t);
          const y = Math.round(startY + (endY - startY) * t);
          if (x < 0 || x >= W || y < 0 || y >= H) continue;

          const lum = getLuminance(x, y);
          const diff = lum - prevLum;

          // If luminance is high (paper background is typically bright)
          // and there is a high-contrast transition (edge of page)
          if (lum > 90 && diff > 7 && !found) {
            bestX = x;
            bestY = y;
            found = true;
            break;
          }
          prevLum = lum;
        }

        return { x: bestX / W, y: bestY / H };
      };

      // Scan from absolute corners towards center (W/2, H/2)
      const tl = detectCorner(0, 0, Math.round(W * 0.4), Math.round(H * 0.4));
      const tr = detectCorner(W - 1, 0, Math.round(W * 0.6), Math.round(H * 0.4));
      const br = detectCorner(W - 1, H - 1, Math.round(W * 0.6), Math.round(H * 0.6));
      const bl = detectCorner(0, H - 1, Math.round(W * 0.4), Math.round(H * 0.6));

      // Safeguard threshold (corners cannot collapse to center)
      const nextCorners = [
        { x: tl.x > 0.45 ? 0.1 : tl.x, y: tl.y > 0.45 ? 0.1 : tl.y },
        { x: tr.x < 0.55 ? 0.9 : tr.x, y: tr.y > 0.45 ? 0.1 : tr.y },
        { x: br.x < 0.55 ? 0.9 : br.x, y: br.y < 0.55 ? 0.9 : br.y },
        { x: bl.x > 0.45 ? 0.1 : bl.x, y: bl.y < 0.55 ? 0.9 : bl.y }
      ];

      setPages(prev => {
        const next = [...prev];
        next[currentPageIdx] = { ...next[currentPageIdx], corners: nextCorners };
        return next;
      });

      // Brief, gorgeous visual feedback animation on corners
      const pinHandles = document.querySelectorAll('.crop-pin-handle');
      pinHandles.forEach(pin => {
        pin.style.scale = '1.4';
        pin.style.borderColor = '#22c55e';
        setTimeout(() => {
          pin.style.scale = '';
          pin.style.borderColor = '';
        }, 600);
      });
    };
    img.src = page.originalSrc;
  };

  const runOcrOnPage = async () => {
    if (currentPageIdx < 0 || pages.length === 0 || !warpedPreviewSrc) return;
    const page = pages[currentPageIdx];
    
    setOcrLoading(prev => ({ ...prev, [page.id]: true }));
    setOcrProgress(0);

    try {
      const result = await Tesseract.recognize(
        warpedPreviewSrc,
        'eng',
        {
          logger: m => {
            if (m.status === 'recognizing') {
              setOcrProgress(Math.round(m.progress * 100));
            }
          }
        }
      );
      
      const text = result.data.text;
      setOcrText(prev => ({ ...prev, [page.id]: text }));
    } catch (err) {
      console.error("OCR recognition error:", err);
    } finally {
      setOcrLoading(prev => ({ ...prev, [page.id]: false }));
    }
  };

  const downloadAllExtractedText = () => {
    let fullText = "";
    pages.forEach((p, idx) => {
      fullText += `--- PAGE ${idx + 1} ---\n`;
      fullText += ocrText[p.id] || "[No text extracted for this page]\n";
      fullText += "\n\n";
    });
    
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fileora_extracted_text_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Upload pictures directly
  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    const nextPages = [];
    let loadedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          const originalSrc = canvas.toDataURL('image/jpeg', 0.95);
          const signature = await getPerceptualSignature(originalSrc);

          const newPage = {
            id: `page_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`,
            originalSrc,
            originalWidth: img.width,
            originalHeight: img.height,
            corners: [
              { x: 0.1, y: 0.1 },
              { x: 0.9, y: 0.1 },
              { x: 0.9, y: 0.9 },
              { x: 0.1, y: 0.9 }
            ],
            filter: 'magic',
            rotation: 0,
            signature
          };

          nextPages.push(newPage);
          loadedCount++;

          if (loadedCount === files.length) {
            setPages(prev => {
              const combined = [...prev, ...nextPages];
              setCurrentPageIdx(combined.length - nextPages.length);
              return combined;
            });
            stopCamera();
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  // Page removal
  const deletePage = (idx) => {
    setPages(prev => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0) {
        setCurrentPageIdx(-1);
      } else {
        setCurrentPageIdx(Math.max(0, idx - 1));
      }
      return next;
    });
  };

  const rotatePage = () => {
    if (currentPageIdx < 0 || currentPageIdx >= pages.length) return;
    const page = pages[currentPageIdx];

    const img = new Image();
    img.onload = () => {
      // Create a canvas rotated by 90 degrees clockwise
      const canvas = document.createElement('canvas');
      canvas.width = img.height; 
      canvas.height = img.width;
      
      const ctx = canvas.getContext('2d');
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      const rotatedSrc = canvas.toDataURL('image/jpeg', 0.95);

      setPages(prev => {
        const next = [...prev];
        next[currentPageIdx] = {
          ...page,
          originalSrc: rotatedSrc,
          originalWidth: canvas.width,
          originalHeight: canvas.height,
          corners: [
            { x: 0.1, y: 0.1 },
            { x: 0.9, y: 0.1 },
            { x: 0.9, y: 0.9 },
            { x: 0.1, y: 0.9 }
          ]
        };
        return next;
      });
    };
    img.src = page.originalSrc;
  };

  // Update corner points during drag
  const updateCorners = (newCorners) => {
    if (currentPageIdx < 0) return;
    setPages(prev => {
      const next = [...prev];
      next[currentPageIdx] = { ...next[currentPageIdx], corners: newCorners };
      return next;
    });
  };

  const handleStartDrag = (idx, e) => {
    e.preventDefault();
    if (currentPageIdx < 0 || !cropContainerRef.current) return;

    setActiveDragPin(idx);

    const isTouch = e.type.startsWith('touch');
    const startX = isTouch ? e.touches[0].clientX : e.clientX;
    const startY = isTouch ? e.touches[0].clientY : e.clientY;

    const rect = cropContainerRef.current.getBoundingClientRect();
    const currentCorners = pages[currentPageIdx].corners;
    const initialPoint = { ...currentCorners[idx] };

    // Initial position relative to container
    const initialX = initialPoint.x * rect.width;
    const initialY = initialPoint.y * rect.height;
    setDragPosition({ x: initialX, y: initialY });

    const handleMove = (moveEvent) => {
      const currentX = isTouch ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const currentY = isTouch ? moveEvent.touches[0].clientY : moveEvent.clientY;

      const deltaX = (currentX - startX) / rect.width;
      const deltaY = (currentY - startY) / rect.height;

      const newFractionalX = Math.max(0, Math.min(1, initialPoint.x + deltaX));
      const newFractionalY = Math.max(0, Math.min(1, initialPoint.y + deltaY));

      const updated = [...currentCorners];
      updated[idx] = {
        x: newFractionalX,
        y: newFractionalY
      };
      updateCorners(updated);
      setDragPosition({
        x: newFractionalX * rect.width,
        y: newFractionalY * rect.height
      });
    };

    const handleEnd = () => {
      setActiveDragPin(null);
      setDragPosition(null);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
  };

  // Adjust display wrapper size depending on aspect ratio and handle window resizing
  useEffect(() => {
    if (currentPageIdx < 0) return;

    const handleResize = () => {
      const page = pages[currentPageIdx];
      if (!page) return;
      const originalRatio = page.originalWidth / page.originalHeight;

      const maxWidth = Math.min(window.innerWidth - 40, 480);
      const maxHeight = Math.min(window.innerHeight - 300, 500);
      
      let w = maxWidth;
      let h = w / originalRatio;

      if (h > maxHeight) {
        h = maxHeight;
        w = h * originalRatio;
      }

      setDisplayWidth(w);
      setDisplayHeight(h);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentPageIdx, pages]);

  // Set filter type on active page
  const updateFilter = (filterType) => {
    if (currentPageIdx < 0) return;
    setPages(prev => {
      const next = [...prev];
      next[currentPageIdx] = { ...next[currentPageIdx], filter: filterType };
      return next;
    });
  };

  // Perspective crops all images, enhances them, and builds standard multi-page PDF
  const compileAndDownloadPDF = async () => {
    if (pages.length === 0) return;
    setIsCompiling(true);

    try {
      let firstPageWidth = 595.28;
      let firstPageHeight = 841.89;

      if (pageSize === 'fit' && pages[0]) {
        const page = pages[0];
        const scaleCorners = page.corners.map(c => ({
          x: c.x * page.originalWidth,
          y: c.y * page.originalHeight
        }));
        const side1 = Math.hypot(scaleCorners[1].x - scaleCorners[0].x, scaleCorners[1].y - scaleCorners[0].y);
        const side2 = Math.hypot(scaleCorners[2].x - scaleCorners[3].x, scaleCorners[2].y - scaleCorners[3].y);
        const topBottomRatio = Math.max(side1, side2);
        const side3 = Math.hypot(scaleCorners[3].x - scaleCorners[0].x, scaleCorners[3].y - scaleCorners[0].y);
        const side4 = Math.hypot(scaleCorners[2].x - scaleCorners[1].x, scaleCorners[2].y - scaleCorners[1].y);
        const leftRightRatio = Math.max(side3, side4);
        const aspect = leftRightRatio / topBottomRatio;
        const warpedAspect = isNaN(aspect) || aspect <= 0 ? 1.414 : aspect;

        firstPageWidth = 595.28;
        firstPageHeight = 595.28 * warpedAspect;
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: pageSize === 'fit' ? [firstPageWidth, firstPageHeight] : pageSize
      });

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        
        const img = await new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = (err) => reject(err);
          image.src = page.originalSrc;
        });

        // 1. Create original size high-res canvas
        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = page.originalWidth;
        srcCanvas.height = page.originalHeight;
        const srcCtx = srcCanvas.getContext('2d');
        srcCtx.drawImage(img, 0, 0);

        const scaleCorners = page.corners.map(c => ({
          x: c.x * page.originalWidth,
          y: c.y * page.originalHeight
        }));

        const targetWidth = pdfQuality === 'high' ? 1200 : 800;
        
        const side1 = Math.hypot(scaleCorners[1].x - scaleCorners[0].x, scaleCorners[1].y - scaleCorners[0].y);
        const side2 = Math.hypot(scaleCorners[2].x - scaleCorners[3].x, scaleCorners[2].y - scaleCorners[3].y);
        const topBottomRatio = Math.max(side1, side2);
        
        const side3 = Math.hypot(scaleCorners[3].x - scaleCorners[0].x, scaleCorners[3].y - scaleCorners[0].y);
        const side4 = Math.hypot(scaleCorners[2].x - scaleCorners[1].x, scaleCorners[2].y - scaleCorners[1].y);
        const leftRightRatio = Math.max(side3, side4);

        const aspect = leftRightRatio / topBottomRatio;
        const warpedAspect = isNaN(aspect) || aspect <= 0 ? 1.414 : aspect;
        const targetHeight = Math.round(targetWidth * warpedAspect);

        // 2. Perform perspective transformation
        const warpedCanvas = applyPerspectiveWarp(srcCtx, page.originalWidth, page.originalHeight, scaleCorners, targetWidth, targetHeight);
        const warpedCtx = warpedCanvas.getContext('2d');

        // 3. Apply scanner enhancement filter
        applyImageFilter(warpedCtx, targetWidth, targetHeight, page.filter);

        let pageWidth = pdf.internal.pageSize.getWidth();
        let pageHeight = pdf.internal.pageSize.getHeight();

        if (pageSize === 'fit') {
          pageWidth = 595.28;
          pageHeight = 595.28 * warpedAspect;
        }

        if (i > 0) {
          if (pageSize === 'fit') {
            pdf.addPage([pageWidth, pageHeight], 'portrait');
          } else {
            pdf.addPage();
          }
        }

        // 4. Draw image to PDF while strictly preserving aspect ratio (preventing image squeezing)
        let printWidth, printHeight, xOffset, yOffset;
        
        if (pageSize === 'fit') {
          printWidth = pageWidth;
          printHeight = pageHeight;
          xOffset = 0;
          yOffset = 0;
        } else {
          const imgRatio = targetWidth / targetHeight;
          const pageRatio = pageWidth / pageHeight;
          
          if (imgRatio > pageRatio) {
            // Image is wider than page ratio
            printWidth = pageWidth;
            printHeight = pageWidth / imgRatio;
            xOffset = 0;
            yOffset = (pageHeight - printHeight) / 2;
          } else {
            // Image is taller than page ratio
            printHeight = pageHeight;
            printWidth = pageHeight * imgRatio;
            xOffset = (pageWidth - printWidth) / 2;
            yOffset = 0;
          }
        }

        const docJpgData = warpedCanvas.toDataURL('image/jpeg', pdfQuality === 'high' ? 0.90 : 0.75);
        pdf.addImage(docJpgData, 'JPEG', xOffset, yOffset, printWidth, printHeight, `page_${i}`, 'FAST');
      }

      pdf.save(`fileora_scan_${Date.now()}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleShare = async () => {
    if (pages.length === 0) return;
    setIsCompiling(true);

    try {
      let firstPageWidth = 595.28;
      let firstPageHeight = 841.89;

      if (pageSize === 'fit' && pages[0]) {
        const page = pages[0];
        const scaleCorners = page.corners.map(c => ({
          x: c.x * page.originalWidth,
          y: c.y * page.originalHeight
        }));
        const side1 = Math.hypot(scaleCorners[1].x - scaleCorners[0].x, scaleCorners[1].y - scaleCorners[0].y);
        const side2 = Math.hypot(scaleCorners[2].x - scaleCorners[3].x, scaleCorners[2].y - scaleCorners[3].y);
        const topBottomRatio = Math.max(side1, side2);
        const side3 = Math.hypot(scaleCorners[3].x - scaleCorners[0].x, scaleCorners[3].y - scaleCorners[0].y);
        const side4 = Math.hypot(scaleCorners[2].x - scaleCorners[1].x, scaleCorners[2].y - scaleCorners[1].y);
        const leftRightRatio = Math.max(side3, side4);
        const aspect = leftRightRatio / topBottomRatio;
        const warpedAspect = isNaN(aspect) || aspect <= 0 ? 1.414 : aspect;

        firstPageWidth = 595.28;
        firstPageHeight = 595.28 * warpedAspect;
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: pageSize === 'fit' ? [firstPageWidth, firstPageHeight] : pageSize
      });

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        
        const img = await new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = (err) => reject(err);
          image.src = page.originalSrc;
        });

        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = page.originalWidth;
        srcCanvas.height = page.originalHeight;
        const srcCtx = srcCanvas.getContext('2d');
        srcCtx.drawImage(img, 0, 0);

        const scaleCorners = page.corners.map(c => ({
          x: c.x * page.originalWidth,
          y: c.y * page.originalHeight
        }));

        const targetWidth = pdfQuality === 'high' ? 1200 : 800;
        
        const side1 = Math.hypot(scaleCorners[1].x - scaleCorners[0].x, scaleCorners[1].y - scaleCorners[0].y);
        const side2 = Math.hypot(scaleCorners[2].x - scaleCorners[3].x, scaleCorners[2].y - scaleCorners[3].y);
        const topBottomRatio = Math.max(side1, side2);
        
        const side3 = Math.hypot(scaleCorners[3].x - scaleCorners[0].x, scaleCorners[3].y - scaleCorners[0].y);
        const side4 = Math.hypot(scaleCorners[2].x - scaleCorners[1].x, scaleCorners[2].y - scaleCorners[1].y);
        const leftRightRatio = Math.max(side3, side4);

        const aspect = leftRightRatio / topBottomRatio;
        const warpedAspect = isNaN(aspect) || aspect <= 0 ? 1.414 : aspect;
        const targetHeight = Math.round(targetWidth * warpedAspect);

        const warpedCanvas = applyPerspectiveWarp(srcCtx, page.originalWidth, page.originalHeight, scaleCorners, targetWidth, targetHeight);
        const warpedCtx = warpedCanvas.getContext('2d');

        applyImageFilter(warpedCtx, targetWidth, targetHeight, page.filter);

        let pageWidth = pdf.internal.pageSize.getWidth();
        let pageHeight = pdf.internal.pageSize.getHeight();

        if (pageSize === 'fit') {
          pageWidth = 595.28;
          pageHeight = 595.28 * warpedAspect;
        }

        if (i > 0) {
          if (pageSize === 'fit') {
            pdf.addPage([pageWidth, pageHeight], 'portrait');
          } else {
            pdf.addPage();
          }
        }

        let printWidth, printHeight, xOffset, yOffset;
        
        if (pageSize === 'fit') {
          printWidth = pageWidth;
          printHeight = pageHeight;
          xOffset = 0;
          yOffset = 0;
        } else {
          const imgRatio = targetWidth / targetHeight;
          const pageRatio = pageWidth / pageHeight;
          
          if (imgRatio > pageRatio) {
            printWidth = pageWidth;
            printHeight = pageWidth / imgRatio;
            xOffset = 0;
            yOffset = (pageHeight - printHeight) / 2;
          } else {
            printHeight = pageHeight;
            printWidth = pageHeight * imgRatio;
            xOffset = (pageWidth - printWidth) / 2;
            yOffset = 0;
          }
        }

        const docJpgData = warpedCanvas.toDataURL('image/jpeg', pdfQuality === 'high' ? 0.90 : 0.75);
        pdf.addImage(docJpgData, 'JPEG', xOffset, yOffset, printWidth, printHeight, `page_${i}`, 'FAST');
      }

      const pdfBlob = pdf.output('blob');
      const finalName = `fileora_scan_${Date.now()}.pdf`;
      const fileObj = new File([pdfBlob], finalName, { type: 'application/pdf' });
      setFileToShare(fileObj);
      navigate('/share');
    } catch (err) {
      console.error('PDF sharing generation error:', err);
    } finally {
      setIsCompiling(false);
    }
  };

  const activePage = pages[currentPageIdx];

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Fileora Free Client-Side Document Scanner',
    url: 'https://fileora.tech/scanner',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
  };

  return (
    <div className={`app-shell ${isCameraActive ? 'camera-active-mode' : ''}`}>
      <Navbar />
      <Helmet>
        <title>Free PDF Scanner Online — Scan Documents | Fileora</title>
        <meta name="description" content="Scan multi-page documents securely with your camera. Features auto-border cropping, perspective correction, and professional document filters locally." />
        <link rel="canonical" href="https://fileora.tech/scanner" data-rh="true" />
        <meta property="og:title" content="Free PDF Scanner Online — Scan Documents | Fileora" />
        <meta property="og:description" content="Scan documents securely. Multi-page capture with real-time guides, auto-crop boundaries, perspective alignment, and premium contrast filter adjustments." />
        <meta property="og:url" content="https://fileora.tech/scanner" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://fileora.tech/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fileora_tech" />
        <meta name="twitter:creator" content="@fileora_tech" />
        <meta name="twitter:title" content="Free PDF Scanner Online — Scan Documents | Fileora" />
        <meta name="twitter:description" content="Scan documents securely. Multi-page capture with real-time guides, auto-crop boundaries, perspective alignment, and premium contrast filter adjustments." />
        <meta name="twitter:image" content="https://fileora.tech/og-image.png" />
        <script type="application/ld+json">{JSON.stringify(appSchema)}</script>
      </Helmet>

      <main className="tool-main">
        <section className={`tool-hero container ${isCameraActive ? 'hide-on-camera-mobile' : ''}`}>
          <div className="badge animate-pulse" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', border: '1px solid rgba(34, 197, 94, 0.2)', marginBottom: '16px' }}>
            <Shield size={12} /> 100% Client-Side Privacy
          </div>
          <h1>AI Document Scanner</h1>
          <p>Scan documents using your webcam or photos. Features automatic quadrilateral crop detection, perspective warp alignment, and professional monochrome black & white filters.</p>
        </section>

        <section className="container" style={{ marginBottom: '64px' }}>
          <div className={`responsive-workspace scanner-workspace ${pages.length === 0 ? 'no-pages' : ''}`}>
            
            {/* 1. Left Queue Panel: Page thumbnails drawer */}
            {pages.length > 0 && (
              <div className={`workspace-controls-sidebar ${isCameraActive ? 'hide-on-camera-mobile' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Pages ({pages.length})</span>
                  <button onClick={() => { startCamera(); }} className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '12px' }}>
                    <Plus size={14} /> Add Page
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pages.map((p, idx) => (
                    <div 
                      key={p.id} 
                      onClick={() => { setCurrentPageIdx(idx); stopCamera(); }}
                      draggable={true}
                      onDragStart={(e) => {
                        setDraggedPageIdx(idx);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        handlePageDrop(idx);
                      }}
                      onDragEnd={() => {
                        setDraggedPageIdx(null);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px',
                        borderRadius: '8px',
                        border: `2px solid ${
                          draggedPageIdx === idx 
                            ? 'var(--accent-primary)' 
                            : idx === currentPageIdx && !isCameraActive 
                            ? 'var(--accent-primary)' 
                            : 'var(--border-color)'
                        }`,
                        borderStyle: draggedPageIdx === idx ? 'dashed' : 'solid',
                        backgroundColor: idx === currentPageIdx && !isCameraActive ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                        cursor: draggedPageIdx === idx ? 'grabbing' : 'grab',
                        transition: 'all 0.2s',
                        position: 'relative',
                        opacity: draggedPageIdx === idx ? 0.4 : 1
                      }}
                    >
                      {/* Drag Grip Handle */}
                      <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', opacity: 0.5 }}>
                        <GripVertical size={14} />
                      </div>

                      <div style={{ width: '40px', height: '52px', background: '#fff', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={p.originalSrc} alt={`Thumbnail ${idx+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Page {idx + 1}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>Filter: {p.filter}</div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deletePage(idx); }}
                        style={{ background: 'transparent', padding: '6px', color: 'var(--danger)', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Paper Size</label>
                    <select value={pageSize} onChange={(e) => setPageSize(e.target.value)} style={{ width: '100%', minHeight: '38px', borderRadius: '6px' }}>
                      <option value="fit">Fit Page to Image (No Margins - Auto)</option>
                      <option value="a4">Standard A4 Portrait</option>
                      <option value="letter">US Letter Portrait</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Export Quality</label>
                    <select value={pdfQuality} onChange={(e) => setPdfQuality(e.target.value)} style={{ width: '100%', minHeight: '38px', borderRadius: '6px' }}>
                      <option value="high">High Definition ( Crisp )</option>
                      <option value="medium">Medium ( Small File Size )</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '12px' }}>
                    <button 
                      disabled={isCompiling}
                      className="btn btn-primary btn-gradient" 
                      onClick={compileAndDownloadPDF} 
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '6px', fontSize: '14px' }}
                    >
                      {isCompiling ? (
                        <>
                          <div className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                          Compiling...
                        </>
                      ) : (
                        <>
                          <Download size={16} /> Compile & Download PDF
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleShare}
                      disabled={isCompiling}
                      className="btn btn-secondary"
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '8px', 
                        padding: '12px', 
                        borderRadius: '6px', 
                        cursor: 'pointer', 
                        fontWeight: 600
                      }}
                    >
                      <Share2 size={16} style={{ color: 'var(--accent-primary)' }} />
                      <span>Share Directly (P2P)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Right Main Working Workspace: Webcam Stream or Perspective Quad Cropper */}
            <div className="scanner-preview-container">
              
              {/* Duplicate Scanner Modal Alert Overlay */}
              {pendingDuplicatePage && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(11, 15, 25, 0.92)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 100,
                  padding: '24px',
                  borderRadius: '12px'
                }}>
                  <div style={{
                    maxWidth: '440px',
                    width: '100%',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '28px',
                    textAlign: 'center',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '20px'
                  }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(251, 113, 133, 0.1)',
                      color: 'var(--danger)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <AlertTriangle size={32} />
                    </div>
                    <div>
                      <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Duplicate Scan Detected</p>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        It looks like you've already scanned this document page. Would you like to keep this scan as a duplicate page anyway, or skip it?
                      </p>
                    </div>

                    {/* Miniature duplicate preview side by side */}
                    <div style={{ display: 'flex', gap: '16px', width: '100%', justifyContent: 'center' }}>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>Previous Scan</span>
                        <div style={{ width: '80px', height: '104px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#fff' }}>
                          <img src={pages[pages.length - 1]?.originalSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-tertiary)' }}>
                        ➔
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>New Scanned Item</span>
                        <div style={{ width: '80px', height: '104px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#fff' }}>
                          <img src={pendingDuplicatePage.originalSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%', marginTop: '8px' }}>
                      <button 
                        onClick={() => {
                          addPageToTray(pendingDuplicatePage);
                          setPendingDuplicatePage(null);
                          if (videoRef.current) {
                            try { videoRef.current.play(); } catch (e) {}
                          }
                          lastFramePixelsRef.current = null;
                        }}
                        className="btn btn-primary btn-gradient"
                        style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 600 }}
                      >
                        Keep Duplicate
                      </button>
                      <button 
                        onClick={() => {
                          setPendingDuplicatePage(null);
                          if (videoRef.current) {
                            try { videoRef.current.play(); } catch (e) {}
                          }
                          lastFramePixelsRef.current = null;
                        }}
                        className="btn btn-ghost"
                        style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 600, border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}
                      >
                        Discard / Skip
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Default view when no files are uploaded/scanned */}
              {pages.length === 0 && !isCameraActive && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '450px', textAlign: 'center', gap: '24px', maxWidth: '520px', margin: '0 auto' }}>
                  <div style={{ width: '70px', height: '70px', background: 'var(--accent-subtle)', color: 'var(--accent-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 30px rgba(56, 189, 248, 0.15)' }}>
                    <Layers size={36} />
                  </div>
                  <div>
                    <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Launch AI Document Scanner</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Securely convert paper documents, invoices, receipts, and whiteboard sketches into high-fidelity PDF scans offline directly on your device.</p>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%' }}>
                    <button 
                      onClick={() => startCamera()} 
                      className="btn btn-primary btn-gradient"
                      style={{ padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
                    >
                      <Camera size={24} />
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>Webcam Scan</span>
                    </button>
                    
                    <button 
                      onClick={() => fileInputRef.current.click()}
                      className="btn btn-ghost"
                      style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'var(--bg-tertiary)' }}
                    >
                      <Upload size={24} />
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>Upload Images</span>
                    </button>
                  </div>

                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    multiple 
                    accept="image/*" 
                    onChange={(e) => handleFileUpload(e.target.files)} 
                    style={{ display: 'none' }} 
                  />

                  {error && (
                    <div style={{ color: 'var(--danger)', fontSize: '0.85rem', background: 'rgba(251, 113, 133, 0.1)', padding: '10px 16px', borderRadius: '6px', border: '1px solid rgba(251, 113, 133, 0.2)', width: '100%' }}>
                      {error}
                    </div>
                  )}
                </div>
              )}

              {/* View 2: Webcam Scanning Feed (Google Drive style capture) */}
              {isCameraActive && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', height: '100%' }}>
                  
                  {/* Camera Header controls */}
                  <div className="scanner-camera-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Video size={16} style={{ color: 'var(--accent-primary)' }} />
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Live Webcam Viewfinder</span>
                    </div>

                    <div className="scanner-camera-controls">
                      {devices.length > 1 && (
                        <select 
                          value={selectedDeviceId} 
                          onChange={(e) => handleDeviceChange(e.target.value)} 
                          style={{ minHeight: '32px', height: '32px', fontSize: '12px', borderRadius: '6px', padding: '0 8px', maxWidth: '100%' }}
                        >
                          {devices.map(d => (
                            <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0,4)}`}</option>
                          ))}
                        </select>
                      )}

                      <button onClick={stopCamera} className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '12px', borderRadius: '20px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <X size={14} /> Close
                      </button>
                    </div>
                  </div>

                  {/* Viewfinder Window with auto-alignment guidelines */}
                  <div className="scanner-viewfinder-window">
                    <video 
                      ref={videoRef} 
                      playsInline 
                      muted 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />

                    {/* Google Drive Document Framing Box Overlay */}
                    <div style={{ position: 'absolute', top: '10%', left: '15%', right: '15%', bottom: '10%', border: '2px dashed var(--accent-primary)', borderRadius: '8px', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(56, 189, 248, 0.05)' }}>
                      <span style={{ color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', letterSpacing: '0.05em', fontWeight: 600 }}>ALIGN DOCUMENT WITHIN BORDERS</span>
                    </div>

                    {/* Live status HUD indicating perfect scanning alignment */}
                    <div style={{ 
                      position: 'absolute', 
                      bottom: '20px', 
                      left: '50%', 
                      transform: 'translateX(-50%)', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      gap: '8px',
                      zIndex: 10,
                      width: '90%',
                      maxWidth: '360px'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: 'rgba(11, 15, 25, 0.85)',
                        backdropFilter: 'blur(10px)',
                        padding: '10px 20px',
                        borderRadius: '30px',
                        border: `1.5px solid ${
                          !isAutoCapture ? 'var(--accent-primary)' :
                          liveScanStatus === 'perfect' ? '#22c55e' : 
                          liveScanStatus === 'aligning' ? '#fbbf24' : 
                          liveScanStatus === 'motion' ? '#ef4444' : 'var(--border-color)'
                        }`,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                        transition: 'all 0.25s ease',
                        width: '100%'
                      }}>
                        {captureCooldown > 0 ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
                            <span style={{ color: '#ffffff', fontSize: '12.5px', fontWeight: 700, letterSpacing: '0.02em' }}>
                              Flip Page! Shutter Cooldown: {captureCooldown}s
                            </span>
                          </>
                        ) : !isAutoCapture ? (
                          <>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', boxShadow: '0 0 8px var(--accent-primary)' }} />
                            <span style={{ color: '#fff', fontSize: '12.5px', fontWeight: 600 }}>Manual Mode Active</span>
                          </>
                        ) : liveScanStatus === 'perfect' ? (
                          <>
                            <CheckCircle size={15} style={{ color: '#22c55e' }} />
                            <span style={{ color: '#ffffff', fontSize: '12.5px', fontWeight: 700, letterSpacing: '0.02em' }}>Perfect Alignment! Snapping...</span>
                          </>
                        ) : liveScanStatus === 'aligning' ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" style={{ color: '#fbbf24' }} />
                            <span style={{ color: '#ffffff', fontSize: '12.5px', fontWeight: 600 }}>Aligning Page... Hold Steady</span>
                          </>
                        ) : liveScanStatus === 'motion' ? (
                          <>
                            <AlertTriangle size={14} style={{ color: '#ef4444' }} />
                            <span style={{ color: '#ffffff', fontSize: '12.5px', fontWeight: 600 }}>Camera Moving... Keep Still</span>
                          </>
                        ) : liveScanStatus === 'low-light' ? (
                          <>
                            <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
                            <span style={{ color: '#ffffff', fontSize: '12.5px', fontWeight: 600 }}>Too Dark... Increase Lighting</span>
                          </>
                        ) : (
                          <>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', animation: 'pulse 1.5s infinite' }} />
                            <span style={{ color: '#d1d5db', fontSize: '12.5px', fontWeight: 600 }}>Searching for document page...</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Smart Trigger Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '28px', width: '100%', flexWrap: 'wrap', margin: '12px 0' }}>
                    {/* Premium mode selector tabs */}
                    <div style={{
                      display: 'inline-flex',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      padding: '4px',
                      borderRadius: '30px',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
                      position: 'relative'
                    }}>
                      <button
                        onClick={() => {
                          setIsAutoCapture(true);
                          setLiveScanStatus('searching');
                          lastFramePixelsRef.current = null;
                        }}
                        style={{
                          padding: '8px 18px',
                          borderRadius: '26px',
                          border: 'none',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          backgroundColor: isAutoCapture ? 'var(--accent-primary)' : 'transparent',
                          color: isAutoCapture ? '#ffffff' : 'var(--text-secondary)',
                          transition: 'all 0.2s ease',
                          boxShadow: isAutoCapture ? '0 2px 10px rgba(56, 189, 248, 0.3)' : 'none'
                        }}
                      >
                        <Sparkles size={13} /> Auto-Capture
                      </button>
                      <button
                        onClick={() => {
                          setIsAutoCapture(false);
                          setLiveScanStatus('manual');
                        }}
                        style={{
                          padding: '8px 18px',
                          borderRadius: '26px',
                          border: 'none',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          backgroundColor: !isAutoCapture ? 'var(--accent-primary)' : 'transparent',
                          color: !isAutoCapture ? '#ffffff' : 'var(--text-secondary)',
                          transition: 'all 0.2s ease',
                          boxShadow: !isAutoCapture ? '0 2px 10px rgba(56, 189, 248, 0.3)' : 'none'
                        }}
                      >
                        <Camera size={13} /> Manual Mode
                      </button>
                    </div>

                    {/* Main capture action button */}
                    <button 
                      disabled={isCapturingProgress}
                      onClick={capturePage}
                      style={{
                        width: '68px',
                        height: '68px',
                        borderRadius: '50%',
                        backgroundColor: '#ffffff',
                        border: '6px solid var(--accent-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'scale 0.2s',
                        boxShadow: '0 4px 20px rgba(56, 189, 248, 0.4)'
                      }}
                      onMouseDown={(e) => { e.currentTarget.style.scale = '0.9'; }}
                      onMouseUp={(e) => { e.currentTarget.style.scale = '1.0'; }}
                    >
                      <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)' }} />
                    </button>

                    {pages.length > 0 && (
                      <button 
                        onClick={() => stopCamera()} 
                        className="btn btn-primary btn-gradient animate-bounce"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '24px', fontSize: '13px' }}
                      >
                        <Check size={16} /> Finish ({pages.length})
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* View 3: Quadrilateral Perspective warp cropper & scan filter settings */}
              {pages.length > 0 && !isCameraActive && activePage && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
                  
                  {/* Top Workspace Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <RotateCw size={15} style={{ color: 'var(--accent-primary)' }} />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Drag corner pins to align paper boundary perfectly</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={autoDetectBorders} className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px', color: 'var(--accent-primary)' }}>
                        <Sparkles size={14} /> Auto-Detect Borders
                      </button>
                      <button onClick={rotatePage} className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px' }}>
                        <RotateCw size={14} /> Rotate 90°
                      </button>
                      <button onClick={() => { startCamera(); }} className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px' }}>
                        <Plus size={14} /> Capture Next
                      </button>
                    </div>
                  </div>

                  {/* Mode Toggles: Crop corners vs Preview filtered scan vs Extracted OCR Text */}
                  <div className="editor-mode-tabs">
                    <button
                      onClick={() => setEditorMode('crop')}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        backgroundColor: editorMode === 'crop' ? 'var(--accent-primary)' : 'transparent',
                        color: editorMode === 'crop' ? '#ffffff' : 'var(--text-secondary)',
                        transition: 'all 0.2s ease',
                        boxShadow: editorMode === 'crop' ? '0 2px 8px rgba(56, 189, 248, 0.3)' : 'none'
                      }}
                    >
                      <Sparkles size={14} /> Adjust Crop Corners
                    </button>
                    <button
                      onClick={() => setEditorMode('preview')}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        backgroundColor: editorMode === 'preview' ? 'var(--accent-primary)' : 'transparent',
                        color: editorMode === 'preview' ? '#ffffff' : 'var(--text-secondary)',
                        transition: 'all 0.2s ease',
                        boxShadow: editorMode === 'preview' ? '0 2px 8px rgba(56, 189, 248, 0.3)' : 'none'
                      }}
                    >
                      <Eye size={14} /> See Scanned Document
                    </button>
                    <button
                      onClick={() => setEditorMode('ocr')}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        backgroundColor: editorMode === 'ocr' ? 'var(--accent-primary)' : 'transparent',
                        color: editorMode === 'ocr' ? '#ffffff' : 'var(--text-secondary)',
                        transition: 'all 0.2s ease',
                        boxShadow: editorMode === 'ocr' ? '0 2px 8px rgba(56, 189, 248, 0.3)' : 'none'
                      }}
                    >
                      <FileText size={14} /> Extracted OCR Text
                    </button>
                  </div>

                  {/* Interactive workspace: Crop sandbox OR Warped Preview sheet OR OCR text extraction pane */}
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, padding: '16px 0', minHeight: '340px' }}>
                    {editorMode === 'crop' ? (
                      <div 
                        ref={cropContainerRef}
                        style={{
                          position: 'relative',
                          width: `${displayWidth}px`,
                          height: `${displayHeight}px`,
                          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                          borderRadius: '6px',
                          overflow: 'visible',
                          backgroundColor: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-color)',
                          userSelect: 'none'
                        }}
                      >
                        <img 
                          src={activePage.originalSrc} 
                          alt="Workspace Crop Frame" 
                          style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', borderRadius: '6px' }} 
                        />

                        {/* Quad Vector Outline polygon */}
                        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
                          <polygon
                            points={`
                              ${activePage.corners[0].x * displayWidth},${activePage.corners[0].y * displayHeight} 
                              ${activePage.corners[1].x * displayWidth},${activePage.corners[1].y * displayHeight} 
                              ${activePage.corners[2].x * displayWidth},${activePage.corners[2].y * displayHeight} 
                              ${activePage.corners[3].x * displayWidth},${activePage.corners[3].y * displayHeight}
                            `}
                            fill="rgba(56, 189, 248, 0.12)"
                            stroke="var(--accent-primary)"
                            strokeWidth="2.5"
                            strokeDasharray="4 2"
                          />
                        </svg>

                        {/* Quadrilateral Drag handle pins */}
                        {activePage.corners.map((p, idx) => (
                          <div
                            key={idx}
                            onMouseDown={(e) => handleStartDrag(idx, e)}
                            onTouchStart={(e) => handleStartDrag(idx, e)}
                            className="crop-pin-handle"
                            style={{
                              position: 'absolute',
                              left: `${p.x * displayWidth}px`,
                              top: `${p.y * displayHeight}px`,
                              transform: 'translate(-50%, -50%)',
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--accent-primary)',
                              border: '3px solid #ffffff',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                              cursor: 'move',
                              zIndex: 30,
                              touchAction: 'none'
                            }}
                          />
                        ))}

                        {/* Premium Loupe Magnifier overlay */}
                        {activeDragPin !== null && dragPosition !== null && (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${dragPosition.x - 55}px`,
                              top: `${dragPosition.y - 125}px`,
                              width: '110px',
                              height: '110px',
                              borderRadius: '50%',
                              border: '3px solid var(--accent-primary)',
                              backgroundImage: `url(${activePage.originalSrc})`,
                              backgroundSize: `${displayWidth * 2.5}px ${displayHeight * 2.5}px`,
                              backgroundPosition: `${-(pages[currentPageIdx].corners[activeDragPin].x * displayWidth * 2.5) + 55}px ${-(pages[currentPageIdx].corners[activeDragPin].y * displayHeight * 2.5) + 55}px`,
                              backgroundRepeat: 'no-repeat',
                              boxShadow: '0 0 15px rgba(56, 189, 248, 0.6), inset 0 0 8px rgba(0,0,0,0.4), 0 6px 20px rgba(0,0,0,0.5)',
                              zIndex: 100,
                              pointerEvents: 'none'
                            }}
                          >
                            {/* Central Crosshair */}
                            <div style={{
                              position: 'absolute',
                              left: '50%',
                              top: '50%',
                              transform: 'translate(-50%, -50%)',
                              width: '14px',
                              height: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              pointerEvents: 'none'
                            }}>
                              <div style={{ position: 'absolute', width: '100%', height: '2px', backgroundColor: '#22c55e', boxShadow: '0 0 2px rgba(0,0,0,0.8)' }} />
                              <div style={{ position: 'absolute', height: '100%', width: '2px', backgroundColor: '#22c55e', boxShadow: '0 0 2px rgba(0,0,0,0.8)' }} />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : editorMode === 'ocr' ? (
                      <div className="ocr-split-pane">
                        {/* Left Side: Warped image preview */}
                        <div style={{
                          position: 'relative',
                          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          backgroundColor: '#ffffff',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '12px'
                        }}>
                          {warpedPreviewSrc ? (
                            <img 
                              src={warpedPreviewSrc} 
                              alt="Warped Scan for OCR" 
                              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }} 
                            />
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                              <div className="loading-spinner" style={{ width: '24px', height: '24px', borderWidth: '3px' }} />
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Processing dynamic filters...</span>
                            </div>
                          )}
                        </div>

                        {/* Right Side: OCR controls and text editor */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '20px',
                          justifyContent: 'space-between'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <FileText size={16} style={{ color: 'var(--accent-primary)' }} /> Privacy-First Offline OCR
                              </p>
                              <span style={{ fontSize: '11px', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-primary)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>Tesseract.js Engine</span>
                            </div>
                            
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                              Run optical character recognition directly inside your browser. No data ever leaves your device.
                            </p>

                            {ocrLoading[activePage.id] ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                  <span style={{ color: 'var(--text-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div className="loading-spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }} />
                                    Analyzing page layout & text...
                                  </span>
                                  <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{ocrProgress}%</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ width: `${ocrProgress}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: '3px', transition: 'width 0.1s ease' }} />
                                </div>
                              </div>
                            ) : ocrText[activePage.id] ? (
                              <textarea
                                value={ocrText[activePage.id]}
                                onChange={(e) => {
                                  const newText = e.target.value;
                                  setOcrText(prev => ({ ...prev, [activePage.id]: newText }));
                                }}
                                style={{
                                  width: '100%',
                                  flex: 1,
                                  minHeight: '220px',
                                  padding: '12px',
                                  borderRadius: '6px',
                                  backgroundColor: 'var(--bg-primary)',
                                  border: '1px solid var(--border-color)',
                                  color: 'var(--text-primary)',
                                  fontFamily: 'monospace',
                                  fontSize: '12px',
                                  lineHeight: '1.6',
                                  resize: 'none',
                                  outline: 'none'
                                }}
                              />
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, border: '2px dashed var(--border-color)', borderRadius: '6px', padding: '24px', textAlign: 'center', gap: '12px' }}>
                                <FileText size={32} style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>No Text Extracted Yet</div>
                                <button
                                  className="btn btn-primary btn-gradient"
                                  onClick={runOcrOnPage}
                                  style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                  <Sparkles size={14} /> Extract Text from Page
                                </button>
                              </div>
                            )}
                          </div>

                          {ocrText[activePage.id] && !ocrLoading[activePage.id] && (
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button
                                className="btn btn-ghost"
                                onClick={() => {
                                  navigator.clipboard.writeText(ocrText[activePage.id]);
                                }}
                                style={{ flex: 1, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px' }}
                              >
                                <Check size={14} /> Copy to Clipboard
                              </button>
                              <button
                                className="btn btn-ghost"
                                onClick={runOcrOnPage}
                                style={{ fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px' }}
                              >
                                <RefreshCw size={14} /> Re-run OCR
                              </button>
                              <button
                                className="btn btn-secondary"
                                onClick={downloadAllExtractedText}
                                style={{ fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px' }}
                              >
                                <Download size={14} /> Export All
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        position: 'relative',
                        width: `${displayWidth}px`,
                        height: `${displayHeight}px`,
                        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        backgroundColor: '#ffffff',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {warpedPreviewSrc ? (
                          <img 
                            src={warpedPreviewSrc} 
                            alt="Warped Filtered Document Preview" 
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                          />
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <div className="loading-spinner" style={{ width: '24px', height: '24px', borderWidth: '3px' }} />
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Processing dynamic filters...</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* High Fidelity Filter settings selector */}
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                    <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase' }}>Professional Document Filter</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                      {[
                        { id: 'magic', label: 'Magic Scan', desc: 'Boost color & contrast' },
                        { id: 'bw', label: 'B&W Document', desc: 'Crisp monochrome text' },
                        { id: 'gray', label: 'Grayscale', desc: 'Smooth black & white' },
                        { id: 'original', label: 'Original Photo', desc: 'Unfiltered snapshot' }
                      ].map((filt) => (
                        <button
                          key={filt.id}
                          onClick={() => updateFilter(filt.id)}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '6px',
                            backgroundColor: activePage.filter === filt.id ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                            border: `2px solid ${activePage.filter === filt.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            gap: '2px'
                          }}
                        >
                          <span style={{ fontSize: '12px', fontWeight: 700 }}>{filt.label}</span>
                          <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>{filt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </section>

        {/* Feature Highlights Section */}
        <section className="container" style={{ margin: '64px auto', maxWidth: '850px', lineHeight: '1.6' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Professional Edge Cropping & Visual Clarity</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
            <div style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Layers size={18} style={{ color: 'var(--accent-primary)' }} /> Auto-Capture Stability
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Intelligently samples pixel-wise motion shift in real-time. Automatically snaps the document once the camera is held perfectly still, completely hands-free.</p>
            </div>
            
            <div style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <RotateCw size={18} style={{ color: 'var(--accent-primary)' }} /> Duplicate Scan Guard
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Utilizes client-side 8x8 perceptual grayscale signatures to cross-examine and flag repeat document snaps, preventing accidental double uploads.</p>
            </div>

            <div style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Sparkles size={18} style={{ color: 'var(--accent-primary)' }} /> Magic Scan Dynamic Filter
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Leverages client-side pixel adjustments to automatically boost contrast, white-out shadows, and dark-level ink characters for crystal-clear readability.</p>
            </div>
          </div>
        </section>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '48px auto', maxWidth: '850px' }} />

        <section className="container tool-description-section">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>Comprehensive Guide to Online Document Scanning</h2>
          <p className="tool-description-para">
            Converting physical receipts, contracts, sketches, and notes into digital files has traditionally required heavy scanner machines or privacy-invasive mobile scanner apps. Fileora delivers a state-of-the-art alternative—providing fully automatic cropping, perspective correction, image optimization, and optical character recognition (OCR) natively inside your browser.
          </p>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
            Our dynamic scanning engine requires no third-party integrations, cloud uploads, or account logins. Your private documents are processed completely client-side, making Fileora the ultimate choice for confidential legal, financial, and personal scans.
          </p>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>Step-by-Step Instructions</h2>
          <ol style={{ paddingLeft: '20px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            <li><strong>Choose Capture Mode:</strong> Tap the camera icon above to scan live using your device's camera (smartphone or laptop webcam) or drop existing image files (JPEG, PNG) directly into the workspace.</li>
            <li><strong>Auto-Cropping & Perspective Grid:</strong> Fileora automatically calculates document corners in real-time. Drag the crop corner pins to tweak the borders manually with pixel precision. The perspective solver will instantly flatten skewed or angled captures.</li>
            <li><strong>Apply Visual Filters:</strong> Choose from standard filters including "Magic Color" (boosts ink readability while whitening out page shadows), "B&W" (transforms into standard photocopy style), "Grayscale", or "Original".</li>
            <li><strong>Configure OCR & Save:</strong> Enable OCR (Optical Character Recognition) to extract search-optimized text. You can re-order captured pages, append extra pages, and download the compiled package as a multipage PDF or individual JPEG files.</li>
          </ol>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>Tips for Perfect Document Scans</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '8px' }}>1. Maximize Illumination</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Scan documents in bright, uniform, and natural lighting. Avoid direct, harsh flashbulbs or overhead lights that cast dark hand shadows onto the document surface.</p>
            </div>
            <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '8px' }}>2. Use High-Contrast Backgrounds</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Place light-colored paper documents on dark tables or backdrops. This contrast enables our auto-capture boundary detectors to map corners instantly.</p>
            </div>
            <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '8px' }}>3. Align the Camera Parallel</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Keep your smartphone parallel to the document plane during capture. Although our perspective flattener corrects angles, parallel captures yield the sharpest text rendering.</p>
            </div>
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>Frequently Asked Questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '6px' }}>Is Fileora safe to scan sensitive personal or corporate documents?</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Yes, 100% safe. Unlike standard scanning tools like CamScanner or Adobe Scan which store your captures on external cloud databases, Fileora operates entirely inside your physical browser memory. We maintain a strict zero-server storage policy—your documents never travel across the network.</p>
            </div>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '6px' }}>Does the OCR feature support different languages?</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Our in-browser Optical Character Recognition runs natively on your machine's CPU via Tesseract.js. It automatically extracts selectable, searchable text blocks, allowing you to copy-paste ink structures smoothly in English, with additional local packages launching soon.</p>
            </div>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '6px' }}>Why is Fileora a better alternative to cloud-based document scanners?</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Cloud-based scanners require continuous internet connections, capture personal metadata, enforce watermarks, and cap daily pages. Fileora is free of watermarks, works completely offline once loaded, provides unlimited pages, and guarantees total document confidentiality in compliance with HIPAA and GDPR regulations.</p>
            </div>
          </div>
        </section>

      </main>

      <style>{`
        .capture-flash-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #ffffff;
          opacity: 0.9;
          z-index: 9999;
          animation: flashEffect 0.4s ease-out forwards;
        }

        .crop-pin-handle {
          transition: scale 0.15s, border-color 0.15s;
        }
        .crop-pin-handle:hover {
          scale: 1.25;
          border-color: var(--accent-primary) !important;
          background-color: #ffffff !important;
        }

        @keyframes flashEffect {
          0% { opacity: 0.9; }
          100% { opacity: 0; }
        }

        @keyframes scaleUp {
          from { transform: scale(0.9); opacity: 0.8; }
          to { transform: scale(1.1); opacity: 1; }
        }
      `}</style>
      <Footer />
    </div>
  )
}
