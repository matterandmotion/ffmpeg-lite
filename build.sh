#!/usr/bin/env bash
# Builds ffmpeg-lite into package/st (single-threaded) and package/mt (multi-threaded).
#
# It starts from ffmpegwasm/ffmpeg.wasm at the commit that released @ffmpeg/core 0.12.10, applies
# ffmpeg-lite.patch and runs that repo's own Docker build. Needs git, make and Docker with buildx.
#
# Usage: ./build.sh [st|mt|all]
# Extra `docker buildx build` arguments can be passed in EXTRA_ARGS (e.g. a build cache).
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
COMMIT=71aa99d37c02a7b4c435275ca9ef50e612f6efa1 # tag v12.15
WORK="$HERE/work/ffmpeg.wasm"
VARIANT="${1:-all}"

if [ ! -d "$WORK/.git" ]; then
  git init -q "$WORK"
  git -C "$WORK" remote add origin https://github.com/ffmpegwasm/ffmpeg.wasm.git
fi
if [ "$(git -C "$WORK" rev-parse -q --verify HEAD || true)" != "$COMMIT" ]; then
  git -C "$WORK" fetch -q --depth 1 origin "$COMMIT"
fi
git -C "$WORK" checkout -q --force "$COMMIT"
git -C "$WORK" apply "$HERE/ffmpeg-lite.patch"

build() { # target package-dir output-dir
  make -C "$WORK" "$1" EXTRA_ARGS="--progress=plain ${EXTRA_ARGS:-}"
  rm -rf "$HERE/package/$3"
  mkdir -p "$HERE/package/$3"
  cp "$WORK/packages/$2/dist/esm/"* "$HERE/package/$3/"
}

case "$VARIANT" in
  st) build prd core st ;;
  mt) build prd-mt core-mt mt ;;
  all) build prd core st && build prd-mt core-mt mt ;;
  *) echo "usage: $0 [st|mt|all]" >&2 && exit 2 ;;
esac
