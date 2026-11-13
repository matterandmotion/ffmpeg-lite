# Video Optimizer

Make videos small and web-ready, in the browser. Files are processed on your device and never uploaded.

Work in progress: there's nothing to use yet.

## How it works

Videos are encoded with FFmpeg and x264 compiled to WebAssembly, running on your device. The FFmpeg build is our own slim one, published as `@matterandmotion/ffmpeg-core`: see [core/](core/).

## Third-party software

| Component                                        | Licence          | Source                                                              |
| ------------------------------------------------ | ---------------- | ------------------------------------------------------------------- |
| FFmpeg 5.1.4, built with x264                    | GPL-2.0-or-later | [ffmpeg.org](https://ffmpeg.org)                                    |
| x264 (ffmpeg.wasm's fork)                        | GPL-2.0-or-later | [ffmpegwasm/x264](https://github.com/ffmpegwasm/x264)               |
| zimg 3.0.5                                       | WTFPL            | [sekrit-twc/zimg](https://github.com/sekrit-twc/zimg)               |
| zlib 1.2.11                                      | zlib             | [madler/zlib](https://github.com/madler/zlib)                       |
| ffmpeg.wasm 0.12.10 (build scripts and bindings) | MIT              | [ffmpegwasm/ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) |

The complete source of each core release is attached to its `core-v<version>` [release](https://github.com/matterandmotion/video-optimizer/releases).

## License

GPL-3.0-or-later. See [LICENSE](LICENSE). The FFmpeg core in `core/` is GPL-2.0-or-later.
