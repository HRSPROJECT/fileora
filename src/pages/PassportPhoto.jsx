import { useState, useEffect, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { useShare } from '../context/ShareContext'
import { Crop, ArrowLeft, Shield, Download, Sparkles, Sliders, Check, Grid, RefreshCw, ZoomIn, ZoomOut, Paintbrush, Share2 } from 'lucide-react'
import Navbar from '../components/shared/Navbar'
import Footer from '../components/shared/Footer'
import DropZone from '../components/shared/DropZone'
import HowItWorks from '../components/home/HowItWorks'
import FaqSection from '../components/home/FaqSection'
import { downloadBlob, formatBytes, basename } from '../utils/imageUtils'

const faqs = [
  { q: 'What passport sizes are supported?', a: 'We support the US Passport / Visa (2" x 2" or 51 x 51 mm), the EU / UK / India standard Passport (35 x 45 mm), and custom manual crop dimension adjustments.' },
  { q: 'How does the background replacement feature work?', a: 'Fileora uses a premium local color-keying filter. Select your background color (White, Blue, etc.), activate the Brush tool, and click on any pixel in the photo. The tool will instantly replace all connected background pixels of that shade. Adjust the Tolerance slider to perfect the edges.' },
  { q: 'Can I print multiple passport photos on a single page?', a: 'Yes! You can toggle the A4 Grid Layout, which compiles a grid of 2, 4, 6, 8, or 12 photos onto a standard letter or A4 size sheet complete with cut guidelines, ready for instant printing.' },
  { q: 'Are my private portrait photos uploaded to your server?', a: 'Never. Your photos are processed completely inside your browser\'s local sandbox memory space. Fileora never sends your images or credentials across the network.' }
]

const TEMPLATES = {
  us: { name: 'United States Passport / Visa (2" x 2")', width: 51, height: 51, ratio: 1.0 },
  eu: { name: 'EU / UK / India Passport (35 x 45 mm)', width: 35, height: 45, ratio: 35 / 45 },
  custom: { name: 'Custom Dimensions', width: 40, height: 40, ratio: 1.0 }
}

export default function PassportPhoto() {
  const [file, setFile] = useState(null)
  const [image, setImage] = useState(null)
  const [templateKey, setTemplateKey] = useState('us')
  
  // Crop settings
  const [zoom, setZoom] = useState(1.0)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  
  // Custom manual sizes (mm)
  const [customWidth, setCustomWidth] = useState(40)
  const [customHeight, setCustomHeight] = useState(50)
  
  // Background replacement settings
  const [bgColor, setBgColor] = useState('original') // 'original', '#FFFFFF', '#3B82F6', '#E5E7EB'
  const [bgTolerance, setBgTolerance] = useState(30)
  const [selectedBgKeyColor, setSelectedBgKeyColor] = useState(null) // { r, g, b }
  const [replacingColor, setReplacingColor] = useState(false)

  // Layout mode
  const [layoutMode, setLayoutMode] = useState('single') // 'single', 'a4'
  const [gridCount, setGridCount] = useState(8) // 4, 6, 8, 12
  
  const [error, setError] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')
  const navigate = useNavigate()
  const { setFileToShare } = useShare()
  const [processing, setProcessing] = useState(false)
  
  const canvasRef = useRef(null)

  // Load selected image file
  const handleFile = (selectedFile) => {
    setError('')
    setDownloadUrl('')
    setSelectedBgKeyColor(null)
    setBgColor('original')
    setZoom(1.0)
    setOffsetX(0)
    setOffsetY(0)

    const img = new Image()
    img.onload = () => {
      setImage(img)
      setFile(selectedFile)
    }
    img.onerror = () => {
      setError('Could not open image file. Make sure it is a valid JPEG or PNG.')
    }
    img.src = URL.createObjectURL(selectedFile)
  }

  // Handle drag offset adjustments on canvas
  const handleMouseDown = (e) => {
    if (!image || replacingColor) return
    setIsDragging(true)
    const rect = canvasRef.current.getBoundingClientRect()
    setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const handleMouseMove = (e) => {
    if (!isDragging || !image || replacingColor) return
    const rect = canvasRef.current.getBoundingClientRect()
    const currentX = e.clientX - rect.left
    const currentY = e.clientY - rect.top
    
    setOffsetX((prev) => prev + (currentX - dragStart.x))
    setOffsetY((prev) => prev + (currentY - dragStart.y))
    setDragStart({ x: currentX, y: currentY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleCanvasClick = (e) => {
    if (!replacingColor || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = Math.round((e.clientX - rect.left) * (canvasRef.current.width / rect.width))
    const y = Math.round((e.clientY - rect.top) * (canvasRef.current.height / rect.height))
    
    const ctx = canvasRef.current.getContext('2d')
    const pixel = ctx.getImageData(x, y, 1, 1).data
    
    setSelectedBgKeyColor({
      r: pixel[0],
      g: pixel[1],
      b: pixel[2]
    })
    setReplacingColor(false)
  }

  // Draw crop guides or perform pixel replacement on canvas render
  useEffect(() => {
    if (!image || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    // Passport dimensions
    let aspect = TEMPLATES[templateKey].ratio
    if (templateKey === 'custom') {
      aspect = customWidth / customHeight
    }
    
    // Setup target resolution
    const targetW = 600
    const targetH = targetW / aspect
    canvas.width = targetW
    canvas.height = targetH

    ctx.clearRect(0, 0, targetW, targetH)
    
    // Draw background color if replacement is active
    if (bgColor !== 'original' && selectedBgKeyColor) {
      // 1. Draw temporary source image to buffer
      const buffer = document.createElement('canvas')
      buffer.width = targetW
      buffer.height = targetH
      const bCtx = buffer.getContext('2d')
      
      drawSourceImage(bCtx, targetW, targetH)
      
      // 2. Perform color range keying
      const imgData = bCtx.getImageData(0, 0, targetW, targetH)
      const data = imgData.data
      const hexColor = hexToRgb(bgColor)
      
      const kr = selectedBgKeyColor.r
      const kg = selectedBgKeyColor.g
      const kb = selectedBgKeyColor.b
      const tol = bgTolerance * 1.5 // scale factor for visual thresholding

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i+1]
        const b = data[i+2]
        
        // Calculate Euclidean distance in color space
        const diff = Math.sqrt(
          Math.pow(r - kr, 2) +
          Math.pow(g - kg, 2) +
          Math.pow(b - kb, 2)
        )
        
        if (diff < tol) {
          data[i] = hexColor.r
          data[i+1] = hexColor.g
          data[i+2] = hexColor.b
          data[i+3] = 255
        }
      }
      
      bCtx.putImageData(imgData, 0, 0)
      ctx.drawImage(buffer, 0, 0)
    } else {
      drawSourceImage(ctx, targetW, targetH)
    }

    // Draw grid/face guide overlay in edit mode (only if not drawing layout preview)
    if (layoutMode === 'single') {
      ctx.save()
      ctx.strokeStyle = 'rgba(110, 231, 183, 0.7)' // bright emerald green
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      
      // Draw Face Oval guide
      ctx.beginPath()
      ctx.ellipse(targetW / 2, targetH * 0.45, targetW * 0.22, targetH * 0.26, 0, 0, 2 * Math.PI)
      ctx.stroke()
      
      // Draw Eye Guide Line
      ctx.strokeStyle = 'rgba(110, 231, 183, 0.4)'
      ctx.beginPath()
      ctx.moveTo(0, targetH * 0.42)
      ctx.lineTo(targetW, targetH * 0.42)
      ctx.stroke()
      
      ctx.fillStyle = 'rgba(110, 231, 183, 0.9)'
      ctx.font = '12px system-ui'
      ctx.fillText('EYE LEVEL', 12, targetH * 0.40)
      ctx.fillText('ALIGN HEAD HERE', targetW / 2 - 55, targetH * 0.15)
      ctx.restore()
    }

  }, [image, templateKey, zoom, offsetX, offsetY, customWidth, customHeight, bgColor, selectedBgKeyColor, bgTolerance, layoutMode])

  const drawSourceImage = (ctx, targetW, targetH) => {
    ctx.save()
    // Calculate aspect match
    const imgAspect = image.width / image.height
    let drawW = targetW
    let drawH = targetW / imgAspect
    
    if (drawH < targetH) {
      drawH = targetH
      drawW = targetH * imgAspect
    }
    
    // Scale zoom factor
    drawW *= zoom
    drawH *= zoom
    
    // Draw centered with drag offsets
    const x = (targetW - drawW) / 2 + offsetX
    const y = (targetH - drawH) / 2 + offsetY
    
    ctx.drawImage(image, x, y, drawW, drawH)
    ctx.restore()
  }

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 }
  }

  const runCompile = async () => {
    if (!image || !canvasRef.current) return
    
    // If user wants standard single export
    if (layoutMode === 'single') {
      // Re-render canvas cleanly without green lines overlay
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      let aspect = TEMPLATES[templateKey].ratio
      if (templateKey === 'custom') {
        aspect = customWidth / customHeight
      }
      
      const targetW = 600
      const targetH = targetW / aspect
      canvas.width = targetW
      canvas.height = targetH
      
      if (bgColor !== 'original' && selectedBgKeyColor) {
        // Draw image and filter
        const buffer = document.createElement('canvas')
        buffer.width = targetW
        buffer.height = targetH
        const bCtx = buffer.getContext('2d')
        drawSourceImage(bCtx, targetW, targetH)
        
        const imgData = bCtx.getImageData(0, 0, targetW, targetH)
        const data = imgData.data
        const hexColor = hexToRgb(bgColor)
        const kr = selectedBgKeyColor.r
        const kg = selectedBgKeyColor.g
        const kb = selectedBgKeyColor.b
        const tol = bgTolerance * 1.5

        for (let i = 0; i < data.length; i += 4) {
          const diff = Math.sqrt(
            Math.pow(data[i] - kr, 2) +
            Math.pow(data[i+1] - kg, 2) +
            Math.pow(data[i+2] - kb, 2)
          )
          if (diff < tol) {
            data[i] = hexColor.r
            data[i+1] = hexColor.g
            data[i+2] = hexColor.b
          }
        }
        bCtx.putImageData(imgData, 0, 0)
        ctx.drawImage(buffer, 0, 0)
      } else {
        drawSourceImage(ctx, targetW, targetH)
      }

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob)
        downloadBlob(blob, `${basename(file.name)}-passport.jpg`)
      }, 'image/jpeg', 0.95)
      
    } else {
      // A4 Grid Compiler
      // Create high-res A4 canvas (300 DPI: 2480 x 3508 pixels)
      const a4Canvas = document.createElement('canvas')
      a4Canvas.width = 2480
      a4Canvas.height = 3508
      const a4Ctx = a4Canvas.getContext('2d')
      
      // Draw plain clean white backdrop
      a4Ctx.fillStyle = '#FFFFFF'
      a4Ctx.fillRect(0, 0, 2480, 3508)
      
      // Generate clean cut out preview from workspace state
      const singleCropCanvas = document.createElement('canvas')
      const scCtx = singleCropCanvas.getContext('2d')
      
      let aspect = TEMPLATES[templateKey].ratio
      if (templateKey === 'custom') {
        aspect = customWidth / customHeight
      }
      
      const scW = 600
      const scH = scW / aspect
      singleCropCanvas.width = scW
      singleCropCanvas.height = scH
      
      if (bgColor !== 'original' && selectedBgKeyColor) {
        // Draw with filter
        const buffer = document.createElement('canvas')
        buffer.width = scW
        buffer.height = scH
        const bCtx = buffer.getContext('2d')
        drawSourceImage(bCtx, scW, scH)
        
        const imgData = bCtx.getImageData(0, 0, scW, scH)
        const data = imgData.data
        const hexColor = hexToRgb(bgColor)
        const kr = selectedBgKeyColor.r
        const kg = selectedBgKeyColor.g
        const kb = selectedBgKeyColor.b
        const tol = bgTolerance * 1.5

        for (let i = 0; i < data.length; i += 4) {
          const diff = Math.sqrt(
            Math.pow(data[i] - kr, 2) +
            Math.pow(data[i+1] - kg, 2) +
            Math.pow(data[i+2] - kb, 2)
          )
          if (diff < tol) {
            data[i] = hexColor.r
            data[i+1] = hexColor.g
            data[i+2] = hexColor.b
          }
        }
        bCtx.putImageData(imgData, 0, 0)
        scCtx.drawImage(buffer, 0, 0)
      } else {
        drawSourceImage(scCtx, scW, scH)
      }

      // Print grid on A4
      // Standard photo size on 300 DPI A4:
      // EU size: 35x45mm -> 35 * (300/25.4) = 413px width, 45 * (300/25.4) = 531px height
      // US size: 51x51mm -> 51 * (300/25.4) = 602px width, 602px height
      let mmW = templateKey === 'us' ? 51 : 35
      let mmH = templateKey === 'us' ? 51 : 45
      if (templateKey === 'custom') {
        mmW = customWidth
        mmH = customHeight
      }
      
      const pxW = Math.round(mmW * (300 / 25.4))
      const pxH = Math.round(mmH * (300 / 25.4))
      
      // Calculate layout margins
      const cols = gridCount <= 4 ? 2 : gridCount <= 8 ? 4 : 4
      const rows = Math.ceil(gridCount / cols)
      const gap = 60 // margins gap in px
      
      const totalGridWidth = cols * pxW + (cols - 1) * gap
      const startX = (2480 - totalGridWidth) / 2
      const startY = 400 // start printing lower
      
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const index = r * cols + c
          if (index >= gridCount) break
          
          const x = startX + c * (pxW + gap)
          const y = startY + r * (pxH + gap)
          
          // Draw image
          a4Ctx.drawImage(singleCropCanvas, x, y, pxW, pxH)
          
          // Draw subtle border around photo
          a4Ctx.strokeStyle = '#D1D5DB'
          a4Ctx.lineWidth = 2
          a4Ctx.strokeRect(x, y, pxW, pxH)
          
          // Draw micro black crop tic marks around margins
          a4Ctx.strokeStyle = '#1F2937'
          a4Ctx.lineWidth = 3
          // top left
          a4Ctx.beginPath(); a4Ctx.moveTo(x - 15, y); a4Ctx.lineTo(x, y); a4Ctx.stroke()
          a4Ctx.beginPath(); a4Ctx.moveTo(x, y - 15); a4Ctx.lineTo(x, y); a4Ctx.stroke()
          // top right
          a4Ctx.beginPath(); a4Ctx.moveTo(x + pxW, y); a4Ctx.lineTo(x + pxW + 15, y); a4Ctx.stroke()
          a4Ctx.beginPath(); a4Ctx.moveTo(x + pxW, y - 15); a4Ctx.lineTo(x + pxW, y); a4Ctx.stroke()
          // bottom left
          a4Ctx.beginPath(); a4Ctx.moveTo(x - 15, y + pxH); a4Ctx.lineTo(x, y + pxH); a4Ctx.stroke()
          a4Ctx.beginPath(); a4Ctx.moveTo(x, y + pxH); a4Ctx.lineTo(x, y + pxH + 15); a4Ctx.stroke()
          // bottom right
          a4Ctx.beginPath(); a4Ctx.moveTo(x + pxW, y + pxH); a4Ctx.lineTo(x + pxW + 15, y + pxH); a4Ctx.stroke()
          a4Ctx.beginPath(); a4Ctx.moveTo(x + pxW, y + pxH); a4Ctx.lineTo(x + pxW, y + pxH + 15); a4Ctx.stroke()
        }
      }

      // Draw footer caption
      a4Ctx.fillStyle = '#9CA3AF'
      a4Ctx.font = '36px Helvetica'
      a4Ctx.textAlign = 'center'
      a4Ctx.fillText('Created securely on Fileora.tech — Free local passport generator.', 1240, 3350)

      a4Canvas.toBlob((blob) => {
        downloadBlob(blob, `${basename(file.name)}-passport-A4-sheet.jpg`)
      }, 'image/jpeg', 0.95)
    }
  }

  const handleShare = async () => {
    if (!image || !canvasRef.current) return
    setProcessing(true)
    try {
      let finalBlob
      let finalName
      
      if (layoutMode === 'single') {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        let aspect = TEMPLATES[templateKey].ratio
        if (templateKey === 'custom') {
          aspect = customWidth / customHeight
        }
        const targetW = 600
        const targetH = targetW / aspect
        canvas.width = targetW
        canvas.height = targetH
        
        if (bgColor !== 'original' && selectedBgKeyColor) {
          const buffer = document.createElement('canvas')
          buffer.width = targetW
          buffer.height = targetH
          const bCtx = buffer.getContext('2d')
          drawSourceImage(bCtx, targetW, targetH)
          
          const imgData = bCtx.getImageData(0, 0, targetW, targetH)
          const data = imgData.data
          const hexColor = hexToRgb(bgColor)
          const kr = selectedBgKeyColor.r
          const kg = selectedBgKeyColor.g
          const kb = selectedBgKeyColor.b
          const tol = bgTolerance * 1.5
          for (let i = 0; i < data.length; i += 4) {
            const diff = Math.sqrt(
              Math.pow(data[i] - kr, 2) +
              Math.pow(data[i+1] - kg, 2) +
              Math.pow(data[i+2] - kb, 2)
            )
            if (diff < tol) {
              data[i] = hexColor.r
              data[i+1] = hexColor.g
              data[i+2] = hexColor.b
            }
          }
          bCtx.putImageData(imgData, 0, 0)
          ctx.drawImage(buffer, 0, 0)
        } else {
          drawSourceImage(ctx, targetW, targetH)
        }
        
        finalBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95))
        finalName = `${basename(file.name)}-passport.jpg`
      } else {
        const a4Canvas = document.createElement('canvas')
        a4Canvas.width = 2480
        a4Canvas.height = 3508
        const a4Ctx = a4Canvas.getContext('2d')
        a4Ctx.fillStyle = '#FFFFFF'
        a4Ctx.fillRect(0, 0, 2480, 3508)
        
        const singleCropCanvas = document.createElement('canvas')
        const scCtx = singleCropCanvas.getContext('2d')
        let aspect = TEMPLATES[templateKey].ratio
        if (templateKey === 'custom') {
          aspect = customWidth / customHeight
        }
        const scW = 600
        const scH = scW / aspect
        singleCropCanvas.width = scW
        singleCropCanvas.height = scH
        
        if (bgColor !== 'original' && selectedBgKeyColor) {
          const buffer = document.createElement('canvas')
          buffer.width = scW
          buffer.height = scH
          const bCtx = buffer.getContext('2d')
          drawSourceImage(bCtx, scW, scH)
          
          const imgData = bCtx.getImageData(0, 0, scW, scH)
          const data = imgData.data
          const hexColor = hexToRgb(bgColor)
          const kr = selectedBgKeyColor.r
          const kg = selectedBgKeyColor.g
          const kb = selectedBgKeyColor.b
          const tol = bgTolerance * 1.5
          for (let i = 0; i < data.length; i += 4) {
            const diff = Math.sqrt(
              Math.pow(data[i] - kr, 2) +
              Math.pow(data[i+1] - kg, 2) +
              Math.pow(data[i+2] - kb, 2)
            )
            if (diff < tol) {
              data[i] = hexColor.r
              data[i+1] = hexColor.g
              data[i+2] = hexColor.b
            }
          }
          bCtx.putImageData(imgData, 0, 0)
          scCtx.drawImage(buffer, 0, 0)
        } else {
          drawSourceImage(scCtx, scW, scH)
        }
        
        let mmW = templateKey === 'us' ? 51 : 35
        let mmH = templateKey === 'us' ? 51 : 45
        if (templateKey === 'custom') {
          mmW = customWidth
          mmH = customHeight
        }
        const pxW = Math.round(mmW * (300 / 25.4))
        const pxH = Math.round(mmH * (300 / 25.4))
        const cols = gridCount <= 4 ? 2 : gridCount <= 8 ? 4 : 4
        const rows = Math.ceil(gridCount / cols)
        const gap = 60
        const totalGridWidth = cols * pxW + (cols - 1) * gap
        const startX = (2480 - totalGridWidth) / 2
        const startY = 400
        
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const index = r * cols + c
            if (index >= gridCount) break
            const x = startX + c * (pxW + gap)
            const y = startY + r * (pxH + gap)
            a4Ctx.drawImage(singleCropCanvas, x, y, pxW, pxH)
            a4Ctx.strokeStyle = '#D1D5DB'
            a4Ctx.lineWidth = 2
            a4Ctx.strokeRect(x, y, pxW, pxH)
            a4Ctx.strokeStyle = '#1F2937'
            a4Ctx.lineWidth = 3
            a4Ctx.beginPath(); a4Ctx.moveTo(x - 15, y); a4Ctx.lineTo(x, y); a4Ctx.stroke()
            a4Ctx.beginPath(); a4Ctx.moveTo(x, y - 15); a4Ctx.lineTo(x, y); a4Ctx.stroke()
            a4Ctx.beginPath(); a4Ctx.moveTo(x + pxW, y); a4Ctx.lineTo(x + pxW + 15, y); a4Ctx.stroke()
            a4Ctx.beginPath(); a4Ctx.moveTo(x + pxW, y - 15); a4Ctx.lineTo(x + pxW, y); a4Ctx.stroke()
            a4Ctx.beginPath(); a4Ctx.moveTo(x - 15, y + pxH); a4Ctx.lineTo(x, y + pxH); a4Ctx.stroke()
            a4Ctx.beginPath(); a4Ctx.moveTo(x, y + pxH); a4Ctx.lineTo(x, y + pxH + 15); a4Ctx.stroke()
            a4Ctx.beginPath(); a4Ctx.moveTo(x + pxW, y + pxH); a4Ctx.lineTo(x + pxW + 15, y + pxH); a4Ctx.stroke()
            a4Ctx.beginPath(); a4Ctx.moveTo(x + pxW, y + pxH); a4Ctx.lineTo(x + pxW + 15, y + pxH + 15); a4Ctx.stroke()
          }
        }
        
        a4Ctx.fillStyle = '#9CA3AF'
        a4Ctx.font = '36px Helvetica'
        a4Ctx.textAlign = 'center'
        a4Ctx.fillText('Created securely on Fileora.tech — Free local passport generator.', 1240, 3350)
        
        finalBlob = await new Promise((resolve) => a4Canvas.toBlob(resolve, 'image/jpeg', 0.95))
        finalName = `${basename(file.name)}-passport-A4-sheet.jpg`
      }
      
      const fileObj = new File([finalBlob], finalName, { type: 'image/jpeg' })
      setFileToShare(fileObj)
      navigate('/share')
    } catch (err) {
      console.error(err)
    } finally {
      setProcessing(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setImage(null)
    setDownloadUrl('')
    setSelectedBgKeyColor(null)
    setBgColor('original')
    setZoom(1.0)
    setOffsetX(0)
    setOffsetY(0)
  }

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Fileora Passport Photo Maker',
    url: 'https://fileora.tech/passport-photo',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a }
    }))
  }

  return (
    <div className="app-shell">
      <Navbar />
      <Helmet>
        <title>Passport Photo Maker Online - Free & Private | Fileora</title>
        <meta name="description" content="Create print-ready passport photos online for free. Visa templates for US, UK, EU, and India. Crop, edit backdrops, and layout photo print grids locally." />
        <link rel="canonical" href="https://fileora.tech/passport-photo" data-rh="true" />
        <meta property="og:title" content="Passport Photo Maker Online - Free & Private | Fileora" />
        <meta property="og:description" content="Create print-ready passport photos online for free. Visa templates for US, UK, EU, and India. Crop, edit backdrops, and layout photo print grids locally." />
        <meta property="og:url" content="https://fileora.tech/passport-photo" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(appSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fileora_tech" />
        <meta name="twitter:creator" content="@fileora_tech" />
        <meta name="twitter:title" content="Passport Photo Maker Online - Free & Private | Fileora" />
        <meta name="twitter:description" content="Create print-ready passport photos online for free. Visa templates for US, UK, EU, and India. Crop, edit backdrops, and layout photo print grids locally." />
        <meta name="twitter:image" content="https://fileora.tech/og-image.png" />
      </Helmet>

      <main className="tool-main">
        <section className="tool-hero container">
          <h1>Passport Photo Maker</h1>
          <p>Align, crop, replace backgrounds, and compile printable sheets locally. Zero network server uploads ensures total security.</p>
        </section>

        {!file && (
          <div className="container container-narrow">
            <DropZone
              accept="image/png,image/jpeg"
              maxSizeLabel="15MB"
              helpText="Select your portrait or selfie photo"
              error={error}
              onFiles={(files) => {
                const next = files[0]
                if (next) handleFile(next)
              }}
            />
          </div>
        )}

        {file && image && (
          <section className="workspace-panel">
            {/* Left side preview */}
            <div className="workspace-preview" style={{ background: 'var(--bg-secondary)', borderRadius: '8px', minHeight: '480px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', zIndex: 10 }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {replacingColor ? '⚠️ Click background pixel on photo to key color out' : 'Drag & Align Portrait with Guidelines'}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))} className="btn btn-ghost" style={{ padding: '6px' }} title="Zoom Out">
                    <ZoomOut size={16} />
                  </button>
                  <button onClick={() => setZoom(prev => Math.min(3.0, prev + 0.1))} className="btn btn-ghost" style={{ padding: '6px' }} title="Zoom In">
                    <ZoomIn size={16} />
                  </button>
                  <button onClick={() => { setOffsetX(0); setOffsetY(0); setZoom(1.0); }} className="btn btn-ghost" style={{ fontSize: '11px', padding: '4px 8px' }}>
                    Recenter
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative', overflow: 'auto' }}>
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onClick={handleCanvasClick}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '420px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                    borderRadius: '4px',
                    cursor: replacingColor ? 'crosshair' : isDragging ? 'grabbing' : 'grab',
                    border: '2px solid var(--border-color)',
                    backgroundColor: '#1E293B'
                  }}
                />
              </div>
            </div>

            {/* Right side settings panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', background: 'var(--bg-secondary)', padding: '1.2rem', borderRadius: '8px', border: '1px solid var(--border-color)', maxHeight: '700px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={handleReset} className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '13px' }}>
                  <ArrowLeft size={16} /> Reset
                </button>
                <div className="badge"><Shield size={12} style={{ marginRight: '4px' }} /> 100% Secure</div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Select Size Template</label>
                <select
                  value={templateKey}
                  onChange={(e) => setTemplateKey(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                >
                  <option value="us">United States (2" x 2" / 51x51 mm)</option>
                  <option value="eu">EU / UK / India (35 x 45 mm)</option>
                  <option value="custom">Custom Dimensions (Manual mm)</option>
                </select>
              </div>

              {templateKey === 'custom' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Width (mm)</label>
                    <input 
                      type="number" 
                      value={customWidth} 
                      onChange={(e) => setCustomWidth(parseInt(e.target.value) || 40)}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Height (mm)</label>
                    <input 
                      type="number" 
                      value={customHeight} 
                      onChange={(e) => setCustomHeight(parseInt(e.target.value) || 40)}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              )}

              {/* Background replacement controls */}
              <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Change Background Backdrop</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(65px, 1fr))', gap: '6px', marginBottom: '10px' }}>
                  {[
                    { id: 'original', label: 'Original', color: 'transparent' },
                    { id: '#FFFFFF', label: 'White', color: '#FFFFFF' },
                    { id: '#3B82F6', label: 'Blue', color: '#3B82F6' },
                    { id: '#E5E7EB', label: 'Gray', color: '#E5E7EB' }
                  ].map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => { setBgColor(bg.id); if (bg.id !== 'original' && !selectedBgKeyColor) setReplacingColor(true); }}
                      style={{
                        padding: '6px 2px',
                        fontSize: '10px',
                        fontWeight: 600,
                        backgroundColor: bgColor === bg.id ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                        border: `1.5px solid ${bgColor === bg.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                        color: 'var(--text-primary)',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      {bg.label}
                    </button>
                  ))}
                </div>

                {bgColor !== 'original' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      onClick={() => setReplacingColor(true)}
                      className="btn btn-secondary"
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', padding: '6px' }}
                    >
                      <Paintbrush size={13} /> {selectedBgKeyColor ? 'Re-key Background Color' : 'Click Background Color'}
                    </button>
                    
                    {selectedBgKeyColor && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                          <span>Color similarity Tolerance ({bgTolerance})</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="90"
                          value={bgTolerance}
                          onChange={(e) => setBgTolerance(parseInt(e.target.value))}
                          className="slider"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Layout arrangements */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>Print Grid Layout Mode</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    onClick={() => setLayoutMode('single')}
                    style={{
                      padding: '10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: layoutMode === 'single' ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                      border: `1.5px solid ${layoutMode === 'single' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                      color: 'var(--text-primary)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <Crop size={14} /> Single Crop
                  </button>
                  <button
                    onClick={() => setLayoutMode('a4')}
                    style={{
                      padding: '10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: layoutMode === 'a4' ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                      border: `1.5px solid ${layoutMode === 'a4' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                      color: 'var(--text-primary)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <Grid size={14} /> A4 Print Grid
                  </button>
                </div>
              </div>

              {layoutMode === 'a4' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Number of Photos ({gridCount})</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: '6px' }}>
                    {[4, 6, 8, 12].map((num) => (
                      <button
                        key={num}
                        onClick={() => setGridCount(num)}
                        style={{
                          padding: '6px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          backgroundColor: gridCount === num ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                          border: `1.5px solid ${gridCount === num ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                          color: 'var(--text-primary)',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        {num} Photos
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '16px' }}>
                <button
                  className="btn btn-primary btn-gradient"
                  onClick={runCompile}
                  disabled={processing}
                  style={{ flex: 1, padding: '14px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}
                >
                  <Download size={18} /> {processing ? 'Compiling...' : (layoutMode === 'single' ? 'Download Crop' : 'Download Print A4 Sheet')}
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={processing}
                  className="btn btn-secondary"
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px', 
                    padding: '14px', 
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
          </section>
        )}

        <section className="container tool-description-section">
          <h2>Premium Client-Side Passport & Visa Photo Creator</h2>
          <p className="tool-description-para">
            Perfectly crop and compile biometrically aligned passport, visa, or profile pictures. 
            Because this tool executes 100% inside your local browser memory space, your personal face profiles and ID structures remain fully private.
          </p>
          <p className="tool-description-para-last">
            ✓ Professional oval biometric overlays · ✓ White/Blue chroma backdrop replacement · ✓ Standard multi-photo A4 sheet templates.
          </p>
        </section>

        <HowItWorks steps={[
          ['Upload Selfie/Portrait', 'Upload any sharp photo, portrait, or selfie securely in the browser.'],
          ['Biometric Alignment & Colors', 'Position your chin and eyes within the oval guides, key out similar backgrounds with single-click fill colors.'],
          ['Generate and Print', 'Instant export of single images or neatly aligned A4 cutting sheet templates.']
        ]} />
        <FaqSection faqs={faqs} />
      </main>
      <Footer />
    </div>
  )
}
