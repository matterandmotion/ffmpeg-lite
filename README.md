# ffmpeg-lite

A slim build of FFmpeg for the browser: FFmpeg 5.1.4 with x264, compiled to WebAssembly. It holds only what's needed to turn videos into small, web-ready H.264 MP4s and poster images, so each wasm file is 8 MB instead of the 31 MB of [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm)'s full core.

It's the engine of [Video Optimizer](https://github.com/matterandmotion/video-optimizer), and it's published on npm as [`@matterandmotion/ffmpeg-lite`](https://www.npmjs.com/package/@matterandmotion/ffmpeg-lite).

## This version: 0.1.0

| Part                       | Version                                                                                                                                                                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FFmpeg                     | [n5.1.4](https://github.com/FFmpeg/FFmpeg/tree/n5.1.4)                                                                                                                                                                            |
| x264                       | [ffmpeg.wasm's fork](https://github.com/ffmpegwasm/x264/tree/33cac6b77d5b9259c552156013a817ab23119612) (`4-cores` branch at `33cac6b`), x264 core 164                                                                             |
| zimg                       | [3.0.5](https://github.com/sekrit-twc/zimg/tree/release-3.0.5)                                                                                                                                                                    |
| zlib                       | [1.2.11](https://github.com/ffmpegwasm/zlib/tree/v1.2.11)                                                                                                                                                                         |
| Build scripts and bindings | [ffmpeg.wasm v12.15](https://github.com/ffmpegwasm/ffmpeg.wasm/tree/v12.15) (the release of `@ffmpeg/core` 0.12.10), changed by [`ffmpeg-lite.patch`](https://github.com/matterandmotion/ffmpeg-lite/blob/main/ffmpeg-lite.patch) |
| Compiler                   | Emscripten 3.1.40, `-O3 -msimd128`                                                                                                                                                                                                |

There are two builds:

| Folder | Build                                | Use it when                                                       | `ffmpeg-core.wasm` | Brotli |
| ------ | ------------------------------------ | ----------------------------------------------------------------- | ------------------ | ------ |
| `mt/`  | Multi-threaded: a pool of 16 threads | The page is cross-origin isolated (`crossOriginIsolated` is true) | 8.2 MiB            | 1.8 MB |
| `st/`  | Single-threaded                      | It isn't                                                          | 8.1 MiB            | 1.8 MB |

- Each folder has `ffmpeg-core.js` (an ES module that exports `createFFmpegCore`) and `ffmpeg-core.wasm`; `mt/` also has `ffmpeg-core.worker.js`.
- Both builds run in browsers and in Node. `exec` blocks until the command finishes, so in a browser, run it in a worker.
- Memory starts at 256 MB and grows as needed, up to 2 GB.

## What's included

Everything below is enabled by name; everything else in FFmpeg is switched off (`--disable-everything`).

**Reading files.** Files only: there are no network protocols.

| Kind         | Included                                                                                                                                                             |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Containers   | MP4, MOV, M4V and 3GP; Matroska and WebM; AVI; MPEG-TS (`.ts`, `.mts`, `.m2ts`); FLV; animated GIF; image sequences; WAV; MP3; AAC (ADTS)                            |
| Video codecs | H.264; HEVC (H.265), 8- and 10-bit; VP8; VP9; MPEG-4 Part 2; MPEG-2; Apple ProRes; Avid DNxHD and DNxHR; Motion JPEG; GIF; PNG; raw video; H.263 (comes with MPEG-4) |
| Audio codecs | AAC; MP3; Opus; Vorbis; Apple Lossless (ALAC); AC-3; E-AC-3; PCM (16- and 24-bit integer, 32-bit float)                                                              |

**Writing files.**

| Kind       | Included                                                                   |
| ---------- | -------------------------------------------------------------------------- |
| Video      | H.264 through x264                                                         |
| Audio      | AAC (FFmpeg's own encoder)                                                 |
| Images     | PNG, JPEG (Motion JPEG), raw frames                                        |
| Containers | MP4, MOV, image sequences, raw, and `null` (for measuring without writing) |

**Processing.**

| Filters                                    | What for                                                                                     |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `scale`, `format`, `setsar`                | Resizing, pixel formats and colour matrix conversion (BT.601/BT.709, full and limited range) |
| `zscale`, `tonemap`                        | Converting HDR video (HLG and PQ, BT.2020) to standard range BT.709                          |
| `fps`                                      | Changing the frame rate, and making variable frame rate constant                             |
| `transpose`, `hflip`, `vflip`              | Applying phone rotation                                                                      |
| `trim`, `atrim`, `setpts`, `asetpts`       | Cutting a clip                                                                               |
| `aresample`, `aformat`                     | Audio sample rate and channel layout (e.g. 5.1 down to stereo)                               |
| `select`, `crop`, `split`, `null`, `anull` | Picking frames, cropping, and plumbing                                                       |
| `ssim`                                     | Measuring how close an output is to its source                                               |

- Also included: the bitstream filters `aac_adtstoasc`, `extract_extradata`, `vp9_superframe` and `vp9_superframe_split`.
- Also included: the parsers for H.264, HEVC, VP8, VP9, MPEG-4, H.263, AAC, AC-3, MP3, Opus, Motion JPEG, PNG and GIF.
- `ffprobe` is included alongside `ffmpeg`.

## What's left out

Anything not listed above, notably:

- **Other encoders:** H.265 (x265), VP8 and VP9 (libvpx), AV1, MP3 (LAME), Opus, Vorbis, Theora, WebP and GIF. This build only makes H.264 MP4s, AAC audio and PNG/JPEG images.
- **AV1 input:** FFmpeg 5.1 needs a library such as dav1d to decode AV1, and it isn't included. AV1 videos can't be read.
- **Some containers:**
  - Ogg (`.ogg`, `.opus`, `.oga`). Opus and Vorbis audio can only be read from WebM, Matroska or MP4.
  - MXF, which some professional cameras use.
  - ASF/WMV, RealMedia and other older formats.
- **Deinterlacing:** there's no `yadif` or `bwdif`, so interlaced video (e.g. 1080i camcorder footage) stays interlaced.
- **Text:** subtitles, fonts and text overlays (libass, FreeType, FriBidi, HarfBuzz, `drawtext`).
- **Other filters:** overlay, padding, colour correction, sharpening, denoising, audio mixing and volume.
- **Image formats as input** other than PNG, JPEG and GIF (no WebP, TIFF or BMP).
- **Network protocols** (HTTP, HTTPS, RTMP and the rest), devices, and `ffplay`.
- **Assembly:** FFmpeg and x264 are compiled from C only, with WebAssembly SIMD where the compiler finds it. Encoding is several times slower than a native `ffmpeg`.
- **Hardware acceleration,** which WebAssembly doesn't have.

Compared with ffmpeg.wasm's full core (`@ffmpeg/core` 0.12.10), the libraries removed are x265, libvpx, LAME, libogg, Theora, libvorbis, libopus, libwebp, FreeType, FriBidi, HarfBuzz and libass.

To add something, open an issue. It becomes a new version.

## Using it

The API is ffmpeg.wasm's core API: `exec(...args)`, `ffprobe(...args)`, `setLogger`, `setProgress`, `reset`, and Emscripten's `FS`, including `WORKERFS` for reading a `File` without copying it into memory.

```js
import createFFmpegCore from '@matterandmotion/ffmpeg-lite/mt/ffmpeg-core.js'

// In a browser, tell it where its wasm (and, for mt, its worker) are:
const core = await createFFmpegCore({
  mainScriptUrlOrBlob: `${coreURL}#${btoa(JSON.stringify({ wasmURL, workerURL }))}`,
})
core.setLogger(({ message }) => console.log(message))
core.exec('-i', '/in/clip.mov', /* ... */ '/out/clip.mp4')
core.reset()
```

**Set every thread count.**

- The `mt` build has a fixed pool of 16 threads. A command that needs more fails straight away instead of hanging.
- Unless told otherwise, FFmpeg picks thread counts from the number of cores, which can need more than 16.
- So always pass the decoder's `-threads` (before `-i`), `-filter_threads`, and `-threads` for every encoder.
- For example, x264 with 8 threads, the decoder with 2 and filters with 2 fit.
- In Node the pool grows instead of failing, so test thread counts in a browser.

**The same input gives the same bytes.**

- For a given command and thread count, the output is identical in Chromium, Firefox, WebKit and Node.
- x264's thread count changes its output, so the `st` and `mt` builds give different files of the same size and quality.

## Building

```sh
./build.sh            # both builds into package/st and package/mt (or `st` or `mt`)
node test/smoke.mjs   # checks sizes, components and real encodes; needs ffmpeg on PATH
./source.sh 0.1.0     # the complete source, as work/ffmpeg-lite-0.1.0-source.tar.gz
```

- `build.sh` needs git, make and Docker with buildx. From cold it takes about 6 minutes per build on 8 cores.
- It applies `ffmpeg-lite.patch` to ffmpeg.wasm at `v12.15` and runs that repo's Docker build.
- The build is reproducible: building the same version gives byte-identical files. Each release lists their SHA-256 hashes in `SHA256SUMS`.

What `ffmpeg-lite.patch` changes in ffmpeg.wasm's build:

- FFmpeg is configured with `--disable-everything`, then only the parts listed above. Only x264, zimg and zlib are linked.
- Memory starts at 256 MB, instead of the multi-threaded build's fixed 1 GB, and grows to at most 2 GB. A 4 GB maximum breaks thread creation in the `mt` build with Emscripten 3.1.40.
- The thread pool is 16 instead of 32. A command that needs more fails instead of hanging.
- It also runs in Node, so tests can use the real build.
- The x264 branch, the Dockerfile frontend and the emsdk image are pinned to a commit or digest.
- `make` runs one job per core.

## Releasing

1. Change the version in `package/package.json` and add it to `CHANGELOG.md`, in a pull request.
2. Once it's on `main`, run the **Build** workflow on `main` with **publish** ticked.
3. The workflow publishes the package to npm with provenance (npm trusted publishing, no stored token).
4. It also creates the `v<version>` release, with the package, the source tarball and `SHA256SUMS`.

## Earlier name

Version 0.1.0 was first published as `@matterandmotion/ffmpeg-core`, from this repository when it was called `video-optimizer`. That package is deprecated. Its files are identical to `@matterandmotion/ffmpeg-lite` 0.1.0, and its source is attached to the [`core-v0.1.0`](https://github.com/matterandmotion/ffmpeg-lite/releases/tag/core-v0.1.0) release.

## Licence

**GPL-2.0-or-later.** See [LICENSE](https://github.com/matterandmotion/ffmpeg-lite/blob/main/LICENSE). FFmpeg is built with `--enable-gpl` and linked with x264, so the build as a whole is under the GPL.

| Part                                   | Licence                                                       |
| -------------------------------------- | ------------------------------------------------------------- |
| FFmpeg                                 | GPL-2.0-or-later as built here (LGPL-2.1-or-later on its own) |
| x264                                   | GPL-2.0-or-later                                              |
| zimg                                   | WTFPL                                                         |
| zlib                                   | zlib                                                          |
| ffmpeg.wasm build scripts and bindings | MIT                                                           |

The complete source of each release is attached to its GitHub [release](https://github.com/matterandmotion/ffmpeg-lite/releases): every library at the exact version built, plus the build files.
