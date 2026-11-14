#!/usr/bin/env bash
# Makes the complete corresponding source of a core release, as the GPL requires: every library the
# build compiles, at the exact version used, plus the build scripts and patch.
#
# Usage: ./source.sh <version>   → work/ffmpeg-lite-<version>-source.tar.gz
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
VERSION="${1:?usage: $0 <version>}"
NAME="ffmpeg-lite-$VERSION-source"
OUT="$HERE/work/source/$NAME"
rm -rf "$OUT"
mkdir -p "$OUT"

fetch() { # dir url ref
  git init -q "$OUT/$1"
  git -C "$OUT/$1" fetch -q --depth 1 "$2" "$3"
  git -C "$OUT/$1" checkout -q FETCH_HEAD
  git -C "$OUT/$1" submodule -q update --init --recursive --depth 1
  echo "$1: $2 $3 ($(git -C "$OUT/$1" rev-parse HEAD))" >> "$OUT/SOURCES.txt"
  rm -rf "$OUT/$1/.git"
}

# Must match build.sh and the Dockerfile in ffmpeg-lite.patch.
fetch ffmpeg.wasm https://github.com/ffmpegwasm/ffmpeg.wasm.git 71aa99d37c02a7b4c435275ca9ef50e612f6efa1
fetch ffmpeg https://github.com/FFmpeg/FFmpeg.git refs/tags/n5.1.4
fetch x264 https://github.com/ffmpegwasm/x264.git 33cac6b77d5b9259c552156013a817ab23119612
fetch zlib https://github.com/ffmpegwasm/zlib.git refs/tags/v1.2.11
fetch zimg https://github.com/sekrit-twc/zimg.git refs/tags/release-3.0.5
mkdir -p "$OUT/ffmpeg-lite"
cp "$HERE/README.md" "$HERE/build.sh" "$HERE/source.sh" "$HERE/ffmpeg-lite.patch" "$OUT/ffmpeg-lite/"
cp "$HERE/LICENSE" "$OUT/LICENSE"
cat >> "$OUT/SOURCES.txt" <<TXT

The build applies ffmpeg-lite/ffmpeg-lite.patch to ffmpeg.wasm and runs its Docker build
(ffmpeg-lite/build.sh), which compiles the other directories with Emscripten 3.1.40
(docker image emscripten/emsdk:3.1.40). See ffmpeg-lite/README.md.
TXT
tar -C "$OUT/.." -czf "$HERE/work/$NAME.tar.gz" "$NAME"
echo "$HERE/work/$NAME.tar.gz"
