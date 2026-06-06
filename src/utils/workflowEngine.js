/**
 * Fileora workflow engine — dynamic "Continue with" suggestions per tool.
 * Single source of truth for all 35+ tools.
 */

export const TOOLS = {
  compress: {
    id: 'compress',
    route: '/compress',
    title: 'Image Compressor',
    category: 'image',
    acceptsMime: ['image/'],
    acceptsMultiple: true,
    offline: true,
  },
  resize: {
    id: 'resize',
    route: '/resize',
    title: 'Image Resizer',
    category: 'image',
    acceptsMime: ['image/'],
    multiMode: 'first-only',
    offline: true,
  },
  convert: {
    id: 'convert',
    route: '/convert',
    title: 'Image Converter',
    category: 'image',
    acceptsMime: ['image/'],
    multiMode: 'first-only',
    offline: true,
  },
  'image-to-pdf': {
    id: 'image-to-pdf',
    route: '/image-to-pdf',
    title: 'Image to PDF',
    category: 'image',
    acceptsMime: ['image/'],
    acceptsMultiple: true,
    offline: true,
  },
  'png-to-pdf': {
    id: 'png-to-pdf',
    route: '/png-to-pdf',
    title: 'PNG to PDF',
    category: 'image',
    acceptsMime: ['image/png'],
    acceptsMultiple: true,
    offline: true,
  },
  'jpg-to-pdf': {
    id: 'jpg-to-pdf',
    route: '/jpg-to-pdf',
    title: 'JPG to PDF',
    category: 'image',
    acceptsMime: ['image/jpeg', 'image/jpg', 'image/webp', 'image/png'],
    acceptsMultiple: true,
    offline: true,
  },
  'heic-to-jpg': {
    id: 'heic-to-jpg',
    route: '/heic-to-jpg',
    title: 'HEIC to JPG',
    category: 'image',
    acceptsMime: ['image/heic', 'image/heif'],
    acceptsMultiple: true,
    offline: true,
  },
  'passport-photo': {
    id: 'passport-photo',
    route: '/passport-photo',
    title: 'Passport Photo',
    category: 'image',
    acceptsMime: ['image/'],
    offline: true,
  },
  scanner: {
    id: 'scanner',
    route: '/scanner',
    title: 'AI Document Scanner',
    category: 'scanner',
    acceptsMime: ['image/', 'application/pdf'],
    acceptsMultiple: true,
    offline: true,
  },
  'merge-pdf': {
    id: 'merge-pdf',
    route: '/merge-pdf',
    title: 'Merge PDF',
    category: 'pdf',
    acceptsMime: ['application/pdf'],
    acceptsMultiple: true,
    minFiles: 2,
    offline: true,
  },
  'compress-pdf': {
    id: 'compress-pdf',
    route: '/compress-pdf',
    title: 'Compress PDF',
    category: 'pdf',
    acceptsMime: ['application/pdf'],
    offline: true,
  },
  'split-pdf': {
    id: 'split-pdf',
    route: '/split-pdf',
    title: 'Split PDF',
    category: 'pdf',
    acceptsMime: ['application/pdf'],
    offline: true,
  },
  'unlock-pdf': {
    id: 'unlock-pdf',
    route: '/unlock-pdf',
    title: 'Unlock PDF',
    category: 'pdf',
    acceptsMime: ['application/pdf'],
    offline: true,
  },
  'resize-pdf': {
    id: 'resize-pdf',
    route: '/resize-pdf',
    title: 'Resize PDF',
    category: 'pdf',
    acceptsMime: ['application/pdf'],
    offline: true,
  },
  'crop-pdf': {
    id: 'crop-pdf',
    route: '/crop-pdf',
    title: 'Crop PDF',
    category: 'pdf',
    acceptsMime: ['application/pdf'],
    offline: true,
  },
  'rotate-pdf': {
    id: 'rotate-pdf',
    route: '/rotate-pdf',
    title: 'Rotate PDF',
    category: 'pdf',
    acceptsMime: ['application/pdf'],
    offline: true,
  },
  'pdf-to-jpg': {
    id: 'pdf-to-jpg',
    route: '/pdf-to-jpg',
    title: 'PDF to JPG',
    category: 'pdf',
    acceptsMime: ['application/pdf'],
    offline: true,
  },
  'pdf-to-word': {
    id: 'pdf-to-word',
    route: '/pdf-to-word',
    title: 'PDF to Word',
    category: 'pdf',
    acceptsMime: ['application/pdf'],
    offline: true,
  },
  'word-to-pdf': {
    id: 'word-to-pdf',
    route: '/word-to-pdf',
    title: 'Word to PDF',
    category: 'pdf',
    acceptsMime: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ],
    offline: true,
  },
  'watermark-pdf': {
    id: 'watermark-pdf',
    route: '/watermark-pdf',
    title: 'Watermark PDF',
    category: 'pdf',
    acceptsMime: ['application/pdf'],
    offline: true,
  },
  'number-pdf': {
    id: 'number-pdf',
    route: '/number-pdf',
    title: 'Add Page Numbers',
    category: 'pdf',
    acceptsMime: ['application/pdf'],
    offline: true,
  },
  'protect-pdf': {
    id: 'protect-pdf',
    route: '/protect-pdf',
    title: 'Protect PDF',
    category: 'pdf',
    acceptsMime: ['application/pdf'],
    offline: true,
  },
  'sign-pdf': {
    id: 'sign-pdf',
    route: '/sign-pdf',
    title: 'Sign PDF',
    category: 'pdf',
    acceptsMime: ['application/pdf'],
    offline: true,
  },
  share: {
    id: 'share',
    route: '/share',
    title: 'P2P File Share',
    category: 'share',
    acceptsMime: ['*'],
    offline: false,
    needsNetwork: true,
  },
  'mov-to-mp4': {
    id: 'mov-to-mp4',
    route: '/mov-to-mp4',
    title: 'MOV to MP4',
    category: 'video',
    acceptsMime: ['video/quicktime', 'video/mp4', 'video/webm'],
    offline: true,
  },
  'compress-video': {
    id: 'compress-video',
    route: '/compress-video',
    title: 'Video Compressor',
    category: 'video',
    acceptsMime: ['video/'],
    offline: true,
  },
  'mp4-to-mp3': {
    id: 'mp4-to-mp3',
    route: '/mp4-to-mp3',
    title: 'MP4 to MP3',
    category: 'video',
    acceptsMime: ['video/'],
    offline: true,
  },
  'trim-video': {
    id: 'trim-video',
    route: '/trim-video',
    title: 'Trim Video',
    category: 'video',
    acceptsMime: ['video/'],
    offline: true,
  },
  'merge-video': {
    id: 'merge-video',
    route: '/merge-video',
    title: 'Merge Video',
    category: 'video',
    acceptsMime: ['video/'],
    acceptsMultiple: true,
    minFiles: 2,
    offline: true,
  },
  'mov-to-mp3': {
    id: 'mov-to-mp3',
    route: '/mov-to-mp3',
    title: 'MOV to MP3',
    category: 'video',
    acceptsMime: ['video/'],
    offline: true,
  },
  'repeat-video': {
    id: 'repeat-video',
    route: '/repeat-video',
    title: 'Video Repeater',
    category: 'video',
    acceptsMime: ['video/'],
    offline: true,
  },
}

/** Ordered suggestions after each tool — tuned to real user flows */
export const CONTINUE_GRAPH = {
  compress: ['image-to-pdf', 'resize', 'convert', 'scanner', 'share'],
  resize: ['compress', 'convert', 'image-to-pdf', 'passport-photo', 'jpg-to-pdf', 'share'],
  convert: ['compress', 'resize', 'image-to-pdf', 'jpg-to-pdf', 'share'],
  'image-to-pdf': ['compress-pdf', 'protect-pdf', 'sign-pdf', 'merge-pdf', 'share'],
  'png-to-pdf': ['compress-pdf', 'protect-pdf', 'sign-pdf', 'merge-pdf', 'share'],
  'jpg-to-pdf': ['compress-pdf', 'protect-pdf', 'sign-pdf', 'merge-pdf', 'share'],
  'heic-to-jpg': ['compress', 'resize', 'image-to-pdf', 'jpg-to-pdf', 'share'],
  'passport-photo': ['compress', 'jpg-to-pdf', 'image-to-pdf', 'share'],
  scanner: ['compress-pdf', 'protect-pdf', 'sign-pdf', 'watermark-pdf', 'share'],
  'merge-pdf': ['compress-pdf', 'split-pdf', 'protect-pdf', 'sign-pdf', 'watermark-pdf', 'number-pdf', 'rotate-pdf', 'pdf-to-jpg', 'share'],
  'compress-pdf': ['protect-pdf', 'sign-pdf', 'merge-pdf', 'split-pdf', 'share'],
  'split-pdf': ['merge-pdf', 'compress-pdf', 'protect-pdf', 'share'],
  'unlock-pdf': ['compress-pdf', 'protect-pdf', 'sign-pdf', 'pdf-to-word', 'share'],
  'resize-pdf': ['compress-pdf', 'crop-pdf', 'merge-pdf', 'share'],
  'crop-pdf': ['compress-pdf', 'resize-pdf', 'merge-pdf', 'share'],
  'rotate-pdf': ['compress-pdf', 'merge-pdf', 'protect-pdf', 'share'],
  'pdf-to-jpg': ['compress', 'resize', 'convert', 'image-to-pdf', 'share'],
  'pdf-to-word': ['word-to-pdf', 'share'],
  'word-to-pdf': ['compress-pdf', 'protect-pdf', 'sign-pdf', 'watermark-pdf', 'merge-pdf', 'share'],
  'watermark-pdf': ['protect-pdf', 'compress-pdf', 'sign-pdf', 'share'],
  'number-pdf': ['protect-pdf', 'compress-pdf', 'sign-pdf', 'share'],
  'protect-pdf': ['sign-pdf', 'share'],
  'sign-pdf': ['protect-pdf', 'compress-pdf', 'share'],
  'mov-to-mp4': ['compress-video', 'trim-video', 'mp4-to-mp3', 'merge-video', 'share'],
  'compress-video': ['trim-video', 'merge-video', 'mov-to-mp4', 'share'],
  'mp4-to-mp3': ['share'],
  'trim-video': ['compress-video', 'merge-video', 'repeat-video', 'share'],
  'merge-video': ['compress-video', 'trim-video', 'share'],
  'mov-to-mp3': ['share'],
  'repeat-video': ['compress-video', 'trim-video', 'share'],
  share: ['compress', 'merge-pdf', 'scanner'],
}

const mimeMatches = (fileMime, patterns) => {
  if (!fileMime) return false
  return patterns.some((p) => {
    if (p === '*') return true
    if (p.endsWith('/')) return fileMime.startsWith(p)
    return fileMime === p
  })
}

export const toolAcceptsFile = (toolId, file) => {
  const tool = TOOLS[toolId]
  if (!tool || !file) return false
  return mimeMatches(file.type || '', tool.acceptsMime)
}

export const toHandoffFile = (file) => {
  if (!file) return null
  if (file instanceof File) return file
  return new File([file], 'fileora-output', { type: file.type || 'application/octet-stream' })
}

export const normalizeFileList = (file, files) => {
  const raw = files?.length ? files : file ? [file] : []
  return raw.map(toHandoffFile).filter(Boolean)
}

/**
 * @param {string} sourceToolId
 * @param {File|Blob|null} file
 * @param {boolean} isOnline
 * @param {File[]|null} files
 */
export const getContinueOptions = (sourceToolId, file, isOnline = true, files = null) => {
  const fileList = normalizeFileList(file, files)
  if (!fileList.length) return []

  const isMulti = fileList.length > 1
  const ordered = CONTINUE_GRAPH[sourceToolId] || []

  return ordered
    .filter((id) => id !== sourceToolId && TOOLS[id])
    .filter((id) => fileList.every((f) => toolAcceptsFile(id, f)))
    .filter((id) => {
      const tool = TOOLS[id]
      if (tool.minFiles && fileList.length < tool.minFiles) return false
      if (isMulti && !tool.acceptsMultiple && tool.multiMode !== 'first-only' && tool.id !== 'share') {
        return false
      }
      return true
    })
    .filter((id) => {
      if (TOOLS[id].needsNetwork && !isOnline) return false
      return true
    })
    .map((id) => {
      const tool = TOOLS[id]
      let hint = tool.needsNetwork ? 'Wi‑Fi required' : null
      if (isMulti && tool.multiMode === 'first-only') {
        hint = hint ? `${hint} · First file only` : 'First file only'
      }
      if (isMulti && tool.acceptsMultiple) {
        hint = hint ? `${hint} · All ${fileList.length} files` : `All ${fileList.length} files`
      }
      return {
        ...tool,
        disabled: tool.needsNetwork && !isOnline,
        hint,
      }
    })
}

export const blobToHandoffFile = (blob, name, type) => {
  const mime = type || blob.type || 'application/octet-stream'
  let filename = name || `fileora-${Date.now()}`
  if (mime === 'application/pdf' && !filename.toLowerCase().endsWith('.pdf')) {
    filename = `${filename}.pdf`
  }
  return new File([blob], filename, { type: mime === 'application/octet-stream' && filename.endsWith('.pdf') ? 'application/pdf' : mime })
}