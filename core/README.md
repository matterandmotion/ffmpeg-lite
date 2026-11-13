# FFmpeg core

Video Optimizer encodes with FFmpeg and x264 compiled to WebAssembly. This folder builds that core and publishes it as [`@matterandmotion/ffmpeg-core`](package/README.md).

## Why a custom build

The core comes from [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm). Its stock multi-threaded build, `@ffmpeg/core-mt` 0.12.10, can't be used as it is:

- Its wasm file is 31.2 MiB, over Cloudflare Pages' 25 MiB limit per file.
- It bundles libraries the app never uses: x265, libvpx, LAME, Theora, Vorbis, Opus, libwebp, FreeType, FriBidi, HarfBuzz, libass.
- It starts with a fixed 1 GB of memory, which is too much to ask of a phone.
- It only runs in browsers, so tests can't use it.

## What changes

`slim-core.patch` applies to ffmpeg.wasm at tag `v12.15` (the release of `@ffmpeg/core` 0.12.10):

- FFmpeg is configured with `--disable-everything`, then only the formats, codecs and filters the app uses (listed in the [package README](package/README.md)). Only x264, zimg and zlib are linked.
- Memory starts at 256 MB and grows to at most 2 GB. A 4 GB maximum breaks thread creation in the multi-threaded build with Emscripten 3.1.40.
- The multi-threaded build has a pool of 16 threads. A command that needs more fails straight away instead of hanging, so the app sets every thread count.
- It runs in Node as well as browsers.
- References that could move are pinned: the x264 branch to a commit, the Dockerfile frontend and the emsdk image to digests.
- `make -j` uses the number of cores, so the build doesn't run out of memory.

FFmpeg 5.1.4, x264, zimg 3.0.5, the compiler (Emscripten 3.1.40) and its flags (`-O3 -msimd128`) are the same as the stock build. For the same command, the output is byte-identical to the stock core's.

| File                       | Raw         | Brotli     |
| -------------------------- | ----------- | ---------- |
| `st/ffmpeg-core.wasm`      | 8.1 MiB     | 1.8 MB     |
| `mt/ffmpeg-core.wasm`      | 8.2 MiB     | 1.8 MB     |
| `ffmpeg-core.js` (st / mt) | 89 / 108 KB | 21 / 25 KB |

## Building

```sh
core/build.sh            # both variants into core/package/{st,mt}; or `st` or `mt`
node core/test/smoke.mjs # checks sizes, components and real encodes (needs ffmpeg on PATH)
```

The build needs Docker with buildx. From cold it takes about 6 minutes per variant on 8 cores.

## Releasing

1. Change the version in `package/package.json` in a pull request.
2. After it's merged to `main`, run the **Core** workflow on `main` with **publish** ticked.
3. The workflow builds and checks the core, then:
   - publishes the package to npm with provenance, through npm's trusted publishing (no token is stored);
   - creates the `core-v<version>` GitHub release, with the package and `ffmpeg-core-<version>-source.tar.gz`.

The source tarball holds every library at the exact version built, plus these build files. That's what the GPL asks for. `core/source.sh` makes it.

The first version was published by hand, because npm's trusted publishing can only be set up for a package that already exists.

## Licence

The core is GPL-2.0-or-later: FFmpeg is built with `--enable-gpl` and linked with x264. The rest of this repository is GPL-3.0-or-later.
