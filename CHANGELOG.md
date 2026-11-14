# Changelog

## 0.1.0 (2026-11-14)

The first version. FFmpeg 5.1.4, x264 (core 164), zimg 3.0.5 and zlib 1.2.11, built from ffmpeg.wasm v12.15 (`@ffmpeg/core` 0.12.10) with `ffmpeg-lite.patch`. See the README for what's included and left out.

- Each wasm file is about 8 MB (1.8 MB with Brotli), down from 31 MB.
- Memory starts at 256 MB and grows to 2 GB. The multi-threaded build has a pool of 16 threads, and a command that needs more fails instead of hanging.
- For the same command, the output is byte-identical to `@ffmpeg/core` 0.12.10's.
- First published as `@matterandmotion/ffmpeg-core` 0.1.0, with identical files.
