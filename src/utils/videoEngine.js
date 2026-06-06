import { saveToOPFS, getFromOPFS } from './opfsHelper';

let ffmpegInstance = null;
let isLoading = false;

/**
 * Dynamically loads FFmpeg WASM library from public CDN
 * This prevents the massive WASM files from bloating the initial app bundle size.
 */
export const loadFFmpegEngine = async (onProgress = () => {}) => {
  if (ffmpegInstance) return ffmpegInstance;
  if (isLoading) {
    // Wait until loading completes
    while (isLoading) {
      await new Promise((res) => setTimeout(res, 100));
    }
    return ffmpegInstance;
  }

  isLoading = true;
  onProgress({ message: 'Downloading High-Speed Processing Engine (WASM)...' });

  try {
    // 1. Inject FFmpeg minified script dynamically if not available
    if (typeof window.FFmpeg === 'undefined') {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js';
        script.async = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error('CDN Connection failed. WebAssembly engine could not be fetched.'));
        document.head.appendChild(script);
      });
    }

    // 2. Instantiate and load FFmpeg WASM
    const { createFFmpeg } = window.FFmpeg;
    const ffmpeg = createFFmpeg({
      log: true,
      corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
    });

    ffmpeg.setProgress(({ ratio }) => {
      onProgress({
        message: 'Processing file...',
        progress: Math.min(Math.round(ratio * 100), 100),
      });
    });

    await ffmpeg.load();
    ffmpegInstance = ffmpeg;
    isLoading = false;
    return ffmpegInstance;
  } catch (error) {
    isLoading = false;
    console.error('Failed to load FFmpeg WASM:', error);
    throw new Error('Could not load the client-side video processing engine. Please ensure SharedArrayBuffers are active.');
  }
};

/**
 * Helper to write a file from OPFS into FFmpeg's Virtual FS
 */
const mountFileFromOPFSToFFmpeg = async (ffmpeg, opfsName, ffmpegName) => {
  const file = await getFromOPFS(opfsName);
  const buffer = await file.arrayBuffer();
  ffmpeg.FS('writeFile', ffmpegName, new Uint8Array(buffer));
};

/**
 * Helper to read from FFmpeg FS and save into OPFS
 */
const exportFileFromFFmpegToOPFS = async (ffmpeg, ffmpegName, opfsName, mimeType) => {
  const data = ffmpeg.FS('readFile', ffmpegName);
  const blob = new Blob([data.buffer], { type: mimeType });
  await saveToOPFS(opfsName, blob);
  // Clean up virtual file
  ffmpeg.FS('unlink', ffmpegName);
};

/**
 * Lossless or H.264 conversion from Apple MOV container to universal MP4 format.
 * Supports optional compression settings.
 */
export const remuxMovToMp4 = async (inputOpfsName, outputOpfsName, settingsOrProgress, maybeProgress) => {
  let settings = {};
  let onProgress = () => {};

  if (typeof settingsOrProgress === 'function') {
    onProgress = settingsOrProgress;
  } else {
    settings = settingsOrProgress || {};
    onProgress = maybeProgress || (() => {});
  }

  const { compress = false, quality = 50, scale = 100 } = settings;
  const ffmpeg = await loadFFmpegEngine(onProgress);
  onProgress({ message: 'Buffering MOV data from storage...', progress: 5 });

  await mountFileFromOPFSToFFmpeg(ffmpeg, inputOpfsName, 'input.mov');
  
  if (compress) {
    onProgress({ message: 'Compressing and transcoding video locally...', progress: 15 });
    // Map quality (1-100) to CRF (51 - 18)
    const crf = Math.round(51 - ((quality / 100) * (51 - 18)));
    const filters = [];
    if (scale < 100) {
      filters.push(`scale=trunc(iw*${scale/100}/2)*2:trunc(ih*${scale/100}/2)*2`);
    }

    const args = ['-i', 'input.mov'];
    if (filters.length > 0) {
      args.push('-vf', filters.join(','));
    }
    args.push(
      '-c:v', 'libx264',
      '-crf', crf.toString(),
      '-preset', 'ultrafast',
      '-c:a', 'aac',
      '-b:a', '128k',
      'output.mp4'
    );
    await ffmpeg.run(...args);
  } else {
    onProgress({ message: 'Remuxing video streams locally...', progress: 15 });
    // Attempt stream copy first (lossless, near-instant). If it fails due to audio/video layout, transcode.
    try {
      await ffmpeg.run('-i', 'input.mov', '-c', 'copy', 'output.mp4');
    } catch (err) {
      console.warn('Direct copy failed. Transcoding streams to standard H.264/AAC...', err);
      await ffmpeg.run(
        '-i', 'input.mov',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        'output.mp4'
      );
    }
  }

  onProgress({ message: 'Saving processed MP4 output...', progress: 90 });
  await exportFileFromFFmpegToOPFS(ffmpeg, 'output.mp4', outputOpfsName, 'video/mp4');
  
  // Clean up input
  ffmpeg.FS('unlink', 'input.mov');
};

/**
 * Compresses a video using resolution scaling and target CRF bitrates
 */
export const compressVideo = async (inputOpfsName, outputOpfsName, settings, onProgress) => {
  const { quality, scale } = settings;
  const ffmpeg = await loadFFmpegEngine(onProgress);
  
  onProgress({ message: 'Reading video stream buffer...', progress: 5 });
  await mountFileFromOPFSToFFmpeg(ffmpeg, inputOpfsName, 'input_raw.mp4');

  // Map quality (1-100) to CRF (51 - 18)
  // CRF 18 is visually lossless, CRF 51 is extremely compressed
  const crf = Math.round(51 - ((quality / 100) * (51 - 18)));
  
  // Create video filters (e.g. scale scale%)
  const filters = [];
  if (scale < 100) {
    // scale to scale%, keeping aspect ratio, making divisible by 2 for H.264 compatibility
    filters.push(`scale=trunc(iw*${scale/100}/2)*2:trunc(ih*${scale/100}/2)*2`);
  }

  const args = ['-i', 'input_raw.mp4'];
  
  if (filters.length > 0) {
    args.push('-vf', filters.join(','));
  }

  // standard compression h.264
  args.push(
    '-vcodec', 'libx264',
    '-crf', crf.toString(),
    '-preset', 'ultrafast',
    '-acodec', 'aac',
    '-b:a', '128k',
    'output_compressed.mp4'
  );

  onProgress({ message: 'Executing client-side WebAssembly compression...', progress: 15 });
  await ffmpeg.run(...args);

  onProgress({ message: 'Saving compressed output package...', progress: 90 });
  await exportFileFromFFmpegToOPFS(ffmpeg, 'output_compressed.mp4', outputOpfsName, 'video/mp4');
  
  ffmpeg.FS('unlink', 'input_raw.mp4');
};

/**
 * Extracts high-fidelity audio stream to MP3 container
 */
export const extractAudioToMp3 = async (inputOpfsName, outputOpfsName, bitrate = 192, onProgress) => {
  const ffmpeg = await loadFFmpegEngine(onProgress);
  
  onProgress({ message: 'Loading source video tracks...', progress: 5 });
  await mountFileFromOPFSToFFmpeg(ffmpeg, inputOpfsName, 'input_video.mp4');

  onProgress({ message: 'Decoding audio and encoding to MP3...', progress: 15 });
  await ffmpeg.run(
    '-i', 'input_video.mp4',
    '-vn', // no video stream
    '-acodec', 'libmp3lame',
    '-ab', `${bitrate}k`,
    'output_audio.mp3'
  );

  onProgress({ message: 'Exporting MP3 output...', progress: 90 });
  await exportFileFromFFmpegToOPFS(ffmpeg, 'output_audio.mp3', outputOpfsName, 'audio/mp3');
  
  ffmpeg.FS('unlink', 'input_video.mp4');
};

/**
 * Precise time range trimming (lossless copy when possible, fallbacks to H.264 transcode)
 */
export const trimVideo = async (inputOpfsName, outputOpfsName, startSeconds, endSeconds, onProgress) => {
  const ffmpeg = await loadFFmpegEngine(onProgress);
  
  onProgress({ message: 'Reading timeline streams...', progress: 5 });
  await mountFileFromOPFSToFFmpeg(ffmpeg, inputOpfsName, 'input_trim.mp4');

  const duration = endSeconds - startSeconds;
  
  onProgress({ message: 'Slicing timeline frames in background...', progress: 15 });
  
  try {
    // Try lightning fast stream copying first
    await ffmpeg.run(
      '-ss', startSeconds.toFixed(3),
      '-i', 'input_trim.mp4',
      '-t', duration.toFixed(3),
      '-c', 'copy',
      '-avoid_negative_ts', '1',
      'output_trim.mp4'
    );
  } catch (err) {
    console.warn('Lossless trim failed. Re-encoding frames for precise trim...', err);
    await ffmpeg.run(
      '-ss', startSeconds.toFixed(3),
      '-i', 'input_trim.mp4',
      '-t', duration.toFixed(3),
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '23',
      '-c:a', 'aac',
      'output_trim.mp4'
    );
  }

  onProgress({ message: 'Buffering trimmed segment...', progress: 90 });
  await exportFileFromFFmpegToOPFS(ffmpeg, 'output_trim.mp4', outputOpfsName, 'video/mp4');
  
  ffmpeg.FS('unlink', 'input_trim.mp4');
};

/**
 * Merges multiple video streams into a unified MP4 file
 */
export const mergeVideos = async (inputOpfsNames, outputOpfsName, onProgress) => {
  const ffmpeg = await loadFFmpegEngine(onProgress);
  
  onProgress({ message: 'Mounting clips to storage directory...', progress: 5 });

  // Mount all files
  const fileNamesList = [];
  for (let i = 0; i < inputOpfsNames.length; i++) {
    const virtualName = `clip_${i}.mp4`;
    await mountFileFromOPFSToFFmpeg(ffmpeg, inputOpfsNames[i], virtualName);
    fileNamesList.push(`file '${virtualName}'`);
  }

  // Create concat file list
  const concatText = fileNamesList.join('\n');
  ffmpeg.FS('writeFile', 'concat_list.txt', new TextEncoder().encode(concatText));

  onProgress({ message: 'Stitching clip streams together...', progress: 15 });

  try {
    // Try fast copy concat demuxer
    await ffmpeg.run(
      '-f', 'concat',
      '-safe', '0',
      '-i', 'concat_list.txt',
      '-c', 'copy',
      'output_merge.mp4'
    );
  } catch (err) {
    console.warn('Lossless stitch failed (possibly due to mismatched frame resolutions). Fallback to filter stitching...', err);
    
    // Fallback: transcode concat using filter_complex
    // For 2 clips: -filter_complex "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[outv][outa]" -map "[outv]" -map "[outa]"
    const filterInputs = [];
    const runArgs = [];
    
    for (let i = 0; i < inputOpfsNames.length; i++) {
      runArgs.push('-i', `clip_${i}.mp4`);
      filterInputs.push(`[${i}:v][${i}:a]`);
    }
    
    const filterString = `${filterInputs.join('')}concat=n=${inputOpfsNames.length}:v=1:a=1[outv][outa]`;
    runArgs.push(
      '-filter_complex', filterString,
      '-map', '[outv]',
      '-map', '[outa]',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '24',
      '-c:a', 'aac',
      'output_merge.mp4'
    );
    
    await ffmpeg.run(...runArgs);
  }

  onProgress({ message: 'Building output video stream...', progress: 90 });
  await exportFileFromFFmpegToOPFS(ffmpeg, 'output_merge.mp4', outputOpfsName, 'video/mp4');
  
  // Cleanup virtual files
  ffmpeg.FS('unlink', 'concat_list.txt');
  for (let i = 0; i < inputOpfsNames.length; i++) {
    ffmpeg.FS('unlink', `clip_${i}.mp4`);
  }
};

/**
 * Repeats/loops a video a specified number of times using lossless stream concat
 */
export const repeatVideo = async (inputOpfsName, outputOpfsName, repeatsCount, onProgress) => {
  const ffmpeg = await loadFFmpegEngine(onProgress);
  
  onProgress({ message: 'Loading clip into memory...', progress: 5 });
  await mountFileFromOPFSToFFmpeg(ffmpeg, inputOpfsName, 'input_repeat.mp4');
  
  onProgress({ message: `Preparing timeline for ${repeatsCount} repetitions...`, progress: 15 });
  
  // Create the list of clips to repeat
  const fileLines = [];
  for (let i = 0; i < repeatsCount; i++) {
    fileLines.push("file 'input_repeat.mp4'");
  }
  const listText = fileLines.join('\n');
  ffmpeg.FS('writeFile', 'repeat_list.txt', new TextEncoder().encode(listText));
  
  onProgress({ message: `Concatenating video segments locally...`, progress: 30 });
  
  try {
    await ffmpeg.run(
      '-f', 'concat',
      '-safe', '0',
      '-i', 'repeat_list.txt',
      '-c', 'copy',
      'output_repeated.mp4'
    );
  } catch (err) {
    console.warn('Lossless repeat failed. Transcoding fallback...', err);
    // Transcode concat using filter_complex
    const inputs = [];
    const filterInputs = [];
    for (let i = 0; i < repeatsCount; i++) {
      inputs.push('-i', 'input_repeat.mp4');
      filterInputs.push(`[${i}:v][${i}:a]`);
    }
    const filterStr = `${filterInputs.join('')}concat=n=${repeatsCount}:v=1:a=1[outv][outa]`;
    await ffmpeg.run(
      ...inputs,
      '-filter_complex', filterStr,
      '-map', '[outv]',
      '-map', '[outa]',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '24',
      '-c:a', 'aac',
      'output_repeated.mp4'
    );
  }
  
  onProgress({ message: 'Exporting compiled loop track...', progress: 90 });
  await exportFileFromFFmpegToOPFS(ffmpeg, 'output_repeated.mp4', outputOpfsName, 'video/mp4');
  
  // Clean up
  ffmpeg.FS('unlink', 'repeat_list.txt');
  ffmpeg.FS('unlink', 'input_repeat.mp4');
};
