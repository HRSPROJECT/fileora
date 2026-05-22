import React, { Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from './context/ThemeContext'

// Eagerly load Home and Compress (most visited pages)
import Home from './pages/Home'
import Compress from './pages/Compress'

// Lazily load PDF/image tools to improve page load speed
const Resize = React.lazy(() => import('./pages/Resize'))
const Convert = React.lazy(() => import('./pages/Convert'))
const ImageToPdf = React.lazy(() => import('./pages/ImageToPdf'))
const MergePdf = React.lazy(() => import('./pages/MergePdf'))
const CompressPdf = React.lazy(() => import('./pages/CompressPdf'))
const SplitPdf = React.lazy(() => import('./pages/SplitPdf'))
const UnlockPdf = React.lazy(() => import('./pages/UnlockPdf'))
const ResizePdf = React.lazy(() => import('./pages/ResizePdf'))
const CropPdf = React.lazy(() => import('./pages/CropPdf'))
const PngToPdf = React.lazy(() => import('./pages/PngToPdf'))
const PdfToJpg = React.lazy(() => import('./pages/PdfToJpg'))
const HeicToJpg = React.lazy(() => import('./pages/HeicToJpg'))
const JpgToPdf = React.lazy(() => import('./pages/JpgToPdf'))
const RotatePdf = React.lazy(() => import('./pages/RotatePdf'))
const WatermarkPdf = React.lazy(() => import('./pages/WatermarkPdf'))
const NumberPdf = React.lazy(() => import('./pages/NumberPdf'))
const PassportPhoto = React.lazy(() => import('./pages/PassportPhoto'))
const ProtectPdf = React.lazy(() => import('./pages/ProtectPdf'))
const SignPdf = React.lazy(() => import('./pages/SignPdf'))
const PdfToWord = React.lazy(() => import('./pages/PdfToWord'))
const WordToPdf = React.lazy(() => import('./pages/WordToPdf'))
const Scanner = React.lazy(() => import('./pages/Scanner'))


const LoadingFallback = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: 'var(--bg-primary, #0B0F19)',
    color: 'var(--text-primary, #F3F4F6)',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    gap: '16px'
  }}>
    <div style={{
      width: '40px',
      height: '40px',
      border: '3px solid rgba(110, 231, 183, 0.1)',
      borderTopColor: '#6EE7B7',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }} />
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
    <span style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '0.05em', opacity: 0.8 }}>LOADING FILEORA TOOL...</span>
  </div>
)

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

export default function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/compress" element={<Compress />} />
              <Route path="/resize" element={<Resize />} />
              <Route path="/convert" element={<Convert />} />
              <Route path="/image-to-pdf" element={<ImageToPdf />} />
              <Route path="/merge-pdf" element={<MergePdf />} />
              <Route path="/compress-pdf" element={<CompressPdf />} />
              <Route path="/split-pdf" element={<SplitPdf />} />
              <Route path="/unlock-pdf" element={<UnlockPdf />} />
              <Route path="/resize-pdf" element={<ResizePdf />} />
              <Route path="/crop-pdf" element={<CropPdf />} />
              <Route path="/png-to-pdf" element={<PngToPdf />} />
              <Route path="/pdf-to-jpg" element={<PdfToJpg />} />
              <Route path="/heic-to-jpg" element={<HeicToJpg />} />
              <Route path="/jpg-to-pdf" element={<JpgToPdf />} />
              <Route path="/rotate-pdf" element={<RotatePdf />} />
              <Route path="/watermark-pdf" element={<WatermarkPdf />} />
              <Route path="/number-pdf" element={<NumberPdf />} />
              <Route path="/passport-photo" element={<PassportPhoto />} />
              <Route path="/protect-pdf" element={<ProtectPdf />} />
              <Route path="/sign-pdf" element={<SignPdf />} />
              <Route path="/pdf-to-word" element={<PdfToWord />} />
              <Route path="/word-to-pdf" element={<WordToPdf />} />
              <Route path="/scanner" element={<Scanner />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ThemeProvider>
    </HelmetProvider>
  )
}

