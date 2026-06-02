import React, { Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from './context/ThemeContext'

// Eagerly load Home (most visited page)
import Home from './pages/Home'

// Lazily load PDF/image tools to improve page load speed
const Compress = React.lazy(() => import('./pages/Compress'))
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
const Share = React.lazy(() => import('./pages/Share'))


// Lazily load high-performance video utilities
const MovToMp4 = React.lazy(() => import('./pages/MovToMp4'))
const CompressVideo = React.lazy(() => import('./pages/CompressVideo'))
const Mp4ToMp3 = React.lazy(() => import('./pages/Mp4ToMp3'))
const TrimVideo = React.lazy(() => import('./pages/TrimVideo'))
const MergeVideo = React.lazy(() => import('./pages/MergeVideo'))
const MovToMp3 = React.lazy(() => import('./pages/MovToMp3'))
const RepeatVideo = React.lazy(() => import('./pages/RepeatVideo'))

// Lazy-loaded competitor comparison alternative pages
const IlovepdfAlternative = React.lazy(() => import('./pages/IlovepdfAlternative'))
const SmallpdfAlternative = React.lazy(() => import('./pages/SmallpdfAlternative'))
const CamscannerAlternative = React.lazy(() => import('./pages/CamscannerAlternative'))
const NotFound = React.lazy(() => import('./pages/NotFound'))


const LoadingFallback = () => (
  <div className="loader-shell">
    <div className="loader-spinner" />
    <span className="loader-text">LOADING FILEORA TOOL...</span>
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
              <Route path="/share" element={<Share />} />
              
              {/* Dynamic Offline Video Processing Routes */}
              <Route path="/mov-to-mp4" element={<MovToMp4 />} />
              <Route path="/compress-video" element={<CompressVideo />} />
              <Route path="/mp4-to-mp3" element={<Mp4ToMp3 />} />
              <Route path="/trim-video" element={<TrimVideo />} />
              <Route path="/merge-video" element={<MergeVideo />} />
              <Route path="/mov-to-mp3" element={<MovToMp3 />} />
              <Route path="/repeat-video" element={<RepeatVideo />} />
              
              {/* Competitor Alternative Comparison Routes */}
              <Route path="/alternative/ilovepdf" element={<IlovepdfAlternative />} />
              <Route path="/alternative/smallpdf" element={<SmallpdfAlternative />} />
              <Route path="/alternative/camscanner" element={<CamscannerAlternative />} />
              
              {/* Fallback route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ThemeProvider>
    </HelmetProvider>
  )
}

