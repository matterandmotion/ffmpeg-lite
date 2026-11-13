# @matterandmotion/ffmpeg-core

A slim build of the [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) core: FFmpeg 5.1.4 with x264 and zimg, compiled to WebAssembly. It holds only what [Video Optimizer](https://github.com/matterandmotion/video-optimizer) needs to turn videos into H.264 MP4s and posters, so each wasm file is about 8 MB instead of 31 MB.

| Folder | Build                                     | Use when                                                          |
| ------ | ----------------------------------------- | ----------------------------------------------------------------- |
| `mt/`  | Multi-threaded (pthreads, 16-thread pool) | The page is cross-origin isolated (`crossOriginIsolated` is true) |
| `st/`  | Single-threaded                           | It isn't                                                          |

Each folder has `ffmpeg-core.js` (an ES module exporting `createFFmpegCore`) and `ffmpeg-core.wasm`; `mt/` also has `ffmpeg-core.worker.js`. They work in browsers (window and workers) and in Node.

## What's in it

- **Reads:** MP4/MOV, Matroska/WebM, AVI, MPEG-TS, FLV, GIF, image sequences, WAV, MP3, AAC.
- **Decodes:** H.264, HEVC, VP8, VP9, MPEG-4, MPEG-2, ProRes, DNxHD, MJPEG, GIF, PNG, raw video; AAC, MP3, Opus, Vorbis, ALAC, AC-3, E-AC-3, PCM.
- **Encodes:** H.264 (libx264), AAC, PNG, MJPEG, raw video.
- **Writes:** MP4, MOV, image sequences, raw, null.
- **Filters:** scale, zscale, tonemap, fps, format, setsar, transpose, hflip, vflip, trim, atrim, setpts, asetpts, aresample, aformat, anull, null, select, crop, split, ssim.
- Memory starts at 256 MB and grows to at most 2 GB.

## Using it

The API is ffmpeg.wasm's core API: `exec(...args)`, `ffprobe(...args)`, `setLogger`, `setProgress`, `reset`, and Emscripten's `FS` (including `WORKERFS` for reading `File` objects without copying them).

```js
import createFFmpegCore from '@matterandmotion/ffmpeg-core/mt/ffmpeg-core.js'

// In a browser, tell the core where its wasm (and, for mt, its worker) live:
const core = await createFFmpegCore({
  mainScriptUrlOrBlob: `${coreURL}#${btoa(JSON.stringify({ wasmURL, workerURL }))}`,
})
core.setLogger(({ message }) => console.log(message))
core.exec('-i', '/in/clip.mov', /* ... */ '/out/clip.mp4')
core.reset()
```

**Set every thread count.** The multi-threaded build has a fixed pool of 16 threads and fails a command (cleanly, without hanging) if it needs more. FFmpeg picks thread counts from the number of cores unless told otherwise, so always pass the decoder's `-threads` (before `-i`), `-filter_threads`, and `-threads` for every encoder. For example, x264 with 8 threads, the decoder with 2 and filters with 2 fit. In Node the pool grows instead of failing, so test thread use in a browser.

## Licence and source

FFmpeg is built with `--enable-gpl` and linked with x264, so this package is **GPL-2.0-or-later** (see `LICENSE`). zimg is WTFPL and zlib is under the zlib licence.

The complete source of each release (FFmpeg, x264, zimg, zlib and ffmpeg.wasm at the exact versions used, plus the build scripts) is attached to its `core-v<version>` release at https://github.com/matterandmotion/video-optimizer/releases. How it's built: https://github.com/matterandmotion/video-optimizer/tree/main/core.
