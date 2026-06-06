import { useState } from 'react'
import { FileArchive, FileImage, FilePlus2, ImageIcon, Maximize2, Repeat2, FileDown, Scissors, FileLock, Scale, Crop, FileText, ArrowLeftRight, Contact, RotateCw, Type, Hash, Shield, PenTool, Sparkles, Search, X, Camera, Video, Music, Layers, Share2 } from 'lucide-react'
import ToolCard from '../shared/ToolCard'

const tools = [
  {
    href: '/compress',
    icon: <FileArchive size={25} />,
    title: 'Image Compressor',
    description: 'Shrink JPEG, PNG, WebP and AVIF files with a live comparison view.',
    formats: 'JPEG · PNG · WebP · AVIF',
  },
  {
    href: '/resize',
    icon: <Maximize2 size={25} />,
    title: 'Image Resizer',
    description: 'Resize photos with presets for WhatsApp, Instagram, passport photos and more.',
    formats: 'JPG · PNG · WebP',
  },
  {
    href: '/convert',
    icon: <Repeat2 size={25} />,
    title: 'Image Converter',
    description: 'Convert images between JPG, PNG, WebP and AVIF directly in the browser.',
    formats: 'JPG · PNG · WebP · AVIF',
  },
  {
    href: '/image-to-pdf',
    icon: <FilePlus2 size={25} />,
    title: 'Image to PDF',
    description: 'Combine one or more images into a clean PDF with page and margin controls.',
    formats: 'JPG · PNG · WebP',
  },
  {
    href: '/png-to-pdf',
    icon: <ImageIcon size={25} />,
    title: 'PNG to PDF',
    description: 'Convert PNG images to PDF online for free in your browser.',
    formats: 'PNG',
  },
  {
    href: '/merge-pdf',
    icon: <FileImage size={25} />,
    title: 'Merge PDF',
    description: 'Merge PDFs in your chosen order with exact page copying and no upload step.',
    formats: 'PDF',
  },
  {
    href: '/compress-pdf',
    icon: <FileDown size={25} />,
    title: 'PDF Compressor',
    description: 'Reduce PDF file size to 100KB, 200KB or 500KB in your browser.',
    formats: 'PDF',
  },
  {
    href: '/split-pdf',
    icon: <Scissors size={25} />,
    title: 'Split PDF',
    description: 'Split PDF pages by range, extract specific pages, or remove pages.',
    formats: 'PDF',
  },
  {
    href: '/unlock-pdf',
    icon: <FileLock size={25} />,
    title: 'Unlock PDF',
    description: 'Remove password and protection from your PDF files online.',
    formats: 'PDF',
  },
  {
    href: '/resize-pdf',
    icon: <Scale size={25} />,
    title: 'Resize PDF',
    description: 'Change PDF page size to A4, Letter, A3 and more instantly.',
    formats: 'PDF',
  },
  {
    href: '/crop-pdf',
    icon: <Crop size={25} />,
    title: 'Crop PDF',
    description: 'Crop margins and define custom boundaries on PDF pages.',
    formats: 'PDF',
  },
  {
    href: '/pdf-to-word',
    icon: <FileText size={25} />,
    title: 'PDF to Word',
    description: 'Convert PDF files to editable Word documents.',
    formats: 'PDF → DOCX',
  },
  {
    href: '/word-to-pdf',
    icon: <FileText size={25} />,
    title: 'Word to PDF',
    description: 'Convert Word DOCX files to clean PDF files.',
    formats: 'DOCX → PDF',
  },
  {
    href: '/pdf-to-jpg',
    icon: <ArrowLeftRight size={25} />,
    title: 'PDF to JPG',
    description: 'Extract pages or render whole PDF pages as high-quality JPEGs.',
    formats: 'PDF → JPG · PNG',
  },
  {
    href: '/heic-to-jpg',
    icon: <Repeat2 size={25} />,
    title: 'HEIC to JPG',
    description: 'Convert iPhone HEIC photos to compatible JPG, PNG or WebP formats.',
    formats: 'HEIC → JPG · PNG · WebP',
  },
  {
    href: '/jpg-to-pdf',
    icon: <ImageIcon size={25} />,
    title: 'JPG to PDF',
    description: 'Convert and merge JPG and WebP images into clean, stylized PDFs.',
    formats: 'JPG · JPEG · WebP → PDF',
  },
  {
    href: '/rotate-pdf',
    icon: <RotateCw size={25} />,
    title: 'Rotate PDF',
    description: 'Rotate individual or all PDF pages clockwise or counterclockwise.',
    formats: 'PDF',
  },
  {
    href: '/watermark-pdf',
    icon: <Type size={25} />,
    title: 'Watermark PDF',
    description: 'Stamp highly custom text or image watermarks onto PDF pages securely.',
    formats: 'PDF',
  },
  {
    href: '/number-pdf',
    icon: <Hash size={25} />,
    title: 'Add Page Numbers',
    description: 'Add standard page numbering indices with multiple coordinate layouts.',
    formats: 'PDF',
  },
  {
    href: '/passport-photo',
    icon: <Contact size={25} />,
    title: 'Passport Photo',
    description: 'Crop and scale photos to standard passport size templates.',
    formats: 'JPG · PNG',
  },
  {
    href: '/protect-pdf',
    icon: <Shield size={25} />,
    title: 'Protect PDF',
    description: 'Encrypt PDF documents and restrict formatting or editing privileges.',
    formats: 'PDF',
  },
  {
    href: '/sign-pdf',
    icon: <PenTool size={25} />,
    title: 'Sign PDF',
    description: 'Type cursive typography or draw anti-aliased digital signatures on PDF pages.',
    formats: 'PDF',
  },
  {
    href: '/share',
    icon: <Share2 size={25} />,
    title: 'P2P File Share',
    description: 'Send large files device-to-device with a secure PIN. Requires internet to pair — file never uploads to Fileora.',
    badge: 'Online',
    formats: 'Any file · WebRTC · Wi‑Fi required',
  },
  {
    href: '/scanner',
    icon: <Camera size={25} />,
    title: 'Document Scanner',
    description: 'Scan documents using your webcam or photos. Features automatic quadrilateral crop detection, perspective alignment, and high contrast B&W filters.',
    badge: 'New',
    formats: 'Webcam · JPG · PNG → PDF',
  },
  {
    href: '/mov-to-mp4',
    icon: <Video size={25} />,
    title: 'MOV to MP4',
    description: 'Convert Apple QuickTime MOV video containers to universal MP4 format locally.',
    badge: 'New',
    formats: 'MOV → MP4',
  },
  {
    href: '/compress-video',
    icon: <FileDown size={25} />,
    title: 'Video Compressor',
    description: 'Reduce video file size by adjusting bitrate quality and scaling dimensions locally.',
    badge: 'New',
    formats: 'MP4 · MOV · WebM',
  },
  {
    href: '/mp4-to-mp3',
    icon: <Music size={25} />,
    title: 'MP4 to MP3',
    description: 'Extract high-fidelity MP3 audio tracks from video files securely in your browser.',
    badge: 'New',
    formats: 'Video → MP3',
  },
  {
    href: '/trim-video',
    icon: <Scissors size={25} />,
    title: 'Trim Video',
    description: 'Precise frame-by-frame timeline cutter and slicer for video clips.',
    badge: 'New',
    formats: 'MP4 · MOV · WebM',
  },
  {
    href: '/merge-video',
    icon: <Layers size={25} />,
    title: 'Merge Video',
    description: 'Combine and stitch multiple video clips together locally with aspect ratio alignment.',
    badge: 'New',
    formats: 'MP4 · MOV · WebM',
  },
  {
    href: '/mov-to-mp3',
    icon: <Music size={25} />,
    title: 'MOV to MP3',
    description: 'Extract high-quality MP3 audio tracks directly from Apple MOV video captures.',
    badge: 'New',
    formats: 'MOV → MP3',
  },
  {
    href: '/repeat-video',
    icon: <Repeat2 size={25} />,
    title: 'Video Repeater',
    description: 'Repeat a video multiple times and combine them into a single looped video.',
    badge: 'New',
    formats: 'MP4 · MOV · WebM',
  },
]
// Helper for standard Levenshtein distance between two strings
function getLevenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1  // deletion
          )
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Helper to find the minimum edit distance of any substring of target matching the query's length
function getMinSubstringLevenshtein(query, target) {
  let minDistance = Infinity;
  const qLen = query.length;
  const tLen = target.length;
  
  if (tLen < qLen) {
    return getLevenshteinDistance(query, target);
  }
  
  // Slide a window over target of lengths near query length to catch partial/typo matches
  const minLen = Math.max(1, qLen - 1);
  const maxLen = Math.min(tLen, qLen + 2);
  
  for (let len = minLen; len <= maxLen; len++) {
    for (let start = 0; start <= tLen - len; start++) {
      const sub = target.substring(start, start + len);
      const dist = getLevenshteinDistance(query, sub);
      if (dist < minDistance) {
        minDistance = dist;
      }
    }
  }
  return minDistance;
}

// Calculate match strength score of a tool for a given query
function getFuzzyScore(query, tool) {
  const q = query.toLowerCase().trim();
  if (!q) return 100;
  
  const title = tool.title.toLowerCase();
  const desc = tool.description.toLowerCase();
  const formats = (tool.formats || '').toLowerCase();
  
  // 1. Exact clean match: strip spaces and non-alphanumeric chars
  const qClean = q.replace(/[^a-z0-9]/g, '');
  const titleClean = title.replace(/[^a-z0-9]/g, '');
  const descClean = desc.replace(/[^a-z0-9]/g, '');
  const formatsClean = formats.replace(/[^a-z0-9]/g, '');
  
  let score = 0;
  
  if (qClean && titleClean.includes(qClean)) {
    // Huge boost if it exactly matches or is contained inside the cleaned title
    score += 150 + (qClean.length * 5);
  } else if (qClean && formatsClean.includes(qClean)) {
    // Strong boost for formatting match (e.g. docx -> word to pdf)
    score += 120 + (qClean.length * 3);
  } else if (qClean && descClean.includes(qClean)) {
    // Normal boost for description matches
    score += 80 + (qClean.length * 2);
  }
  
  // 2. Token Matches: split into word tokens and find alignment
  const qTokens = q.split(/\s+/).filter(Boolean);
  const titleTokens = title.split(/[^a-z0-9]+/).filter(Boolean);
  
  for (const qt of qTokens) {
    for (const tt of titleTokens) {
      if (tt.startsWith(qt)) {
        score += 50 * (qt.length / tt.length);
      } else if (tt.includes(qt)) {
        score += 25 * (qt.length / tt.length);
      } else {
        // Character level typo check on words (length must be > 2)
        if (qt.length > 2 && tt.length > 2) {
          const dist = getLevenshteinDistance(qt, tt);
          const maxLen = Math.max(qt.length, tt.length);
          if (dist <= 2) {
            const sim = 1 - (dist / maxLen);
            score += 35 * sim;
          }
        }
      }
    }
  }
  
  // 3. Substring typo check (sliding window)
  if (q.length >= 3) {
    const minDistance = getMinSubstringLevenshtein(q, title);
    if (minDistance <= 2) {
      const sim = 1 - (minDistance / q.length);
      score += 45 * sim;
    }
  }
  
  return score;
}

export default function ToolsGrid(props) {
  const [searchQuery, setSearchQuery] = useState('')

  // Calculate scores and sort/filter tools if query is active
  const filteredTools = searchQuery.trim()
    ? tools
        .map((tool) => ({ ...tool, score: getFuzzyScore(searchQuery, tool) }))
        .filter((tool) => tool.score >= 15)
        .sort((a, b) => b.score - a.score)
    : tools

  return (
    <section className="section container" {...props}>
      <div className="section-heading">
        <p className="eyebrow">All tools</p>
        <h2>Everything useful, nothing invasive</h2>
        <p>Each tool runs locally in your browser. All tools work offline after load — except P2P Share, which needs internet to connect two devices.</p>
      </div>

      <div className="search-container">
        <div className="search-wrapper">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            className="search-input"
            placeholder="Search tools (e.g. compress, word, heic)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="search-clear-btn"
              aria-label="Clear search"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {filteredTools.length > 0 ? (
        <div className="tools-grid">
          {filteredTools.map((tool) => (
            <ToolCard key={tool.title} {...tool} />
          ))}
        </div>
      ) : (
        <div className="search-empty-state">
          <div className="empty-icon-wrap">
            <Search size={28} />
          </div>
          <h3>No matching tools found</h3>
          <p>We couldn't find anything matching "{searchQuery}". Try adjusting your keywords or spelling.</p>
          <button className="reset-search-btn" onClick={() => setSearchQuery('')}>
            Reset Search
          </button>
        </div>
      )}
    </section>
  )
}
