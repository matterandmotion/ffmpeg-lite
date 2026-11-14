// Checks a build of ffmpeg-lite (package/st and package/mt) in Node:
// - every file is under Cloudflare Pages' 25 MiB limit;
// - every component the app needs is present;
// - an SDR encode with sound, the HDR tone-mapping chain, `-f null` and a raw frame grab all work,
//   checked with the native ffprobe.
// Needs native ffmpeg and ffprobe on PATH to make the test clips.
//
// Usage: node test/smoke.mjs
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PACKAGE = new URL('../package/', import.meta.url).pathname
const MAX_BYTES = 25 * 1024 * 1024

const REQUIRED = {
  protocols: ['file'],
  demuxers: ['mov', 'matroska', 'avi', 'mpegts', 'flv', 'gif', 'image2', 'wav', 'mp3', 'aac'],
  decoders: [
    'h264',
    'hevc',
    'vp8',
    'vp9',
    'mpeg4',
    'mpeg2video',
    'mjpeg',
    'prores',
    'dnxhd',
    'gif',
    'png',
    'rawvideo',
    'aac',
    'mp3',
    'mp3float',
    'opus',
    'vorbis',
    'alac',
    'ac3',
    'eac3',
    'pcm_s16le',
    'pcm_s24le',
    'pcm_f32le',
  ],
  encoders: ['libx264', 'aac', 'rawvideo', 'png', 'mjpeg', 'wrapped_avframe'],
  muxers: ['mp4', 'mov', 'image2', 'rawvideo', 'null'],
  bsfs: ['aac_adtstoasc', 'extract_extradata', 'vp9_superframe_split'],
  filters: [
    'scale',
    'zscale',
    'tonemap',
    'fps',
    'format',
    'setsar',
    'transpose',
    'hflip',
    'vflip',
    'trim',
    'atrim',
    'setpts',
    'asetpts',
    'aresample',
    'aformat',
    'anull',
    'null',
    'select',
    'crop',
    'split',
    'ssim',
  ],
}

/** Component names from `ffmpeg -<kind>` output. */
function names(kind, lines) {
  const found = new Set()
  for (const line of lines.join('\n').split('\n')) {
    let m
    if (kind === 'encoders' || kind === 'decoders') m = line.match(/^ [VASFXBD.]{6} (\S+)/)
    else if (kind === 'filters') m = line.match(/^ [TSC.]{3} (\S+)\s+\S+->\S+/)
    else if (kind === 'demuxers' || kind === 'muxers') m = line.match(/^ [DE ]{1,2}d?\s+(\S+)\s/)
    else m = line.match(/^\s*(\w+)\s*$/)
    if (m && m[1] !== '=') for (const n of m[1].split(',')) found.add(n)
  }
  return found
}

const probe = (file) =>
  JSON.parse(
    execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], {
      encoding: 'utf8',
    }),
  )

// Test clips, made natively: 3 s of 1280x720 SDR with sound, and 2 s of 10-bit HEVC tagged HLG.
const dir = mkdtempSync(join(tmpdir(), 'ffmpeg-lite-smoke-'))
const native = (...args) =>
  execFileSync('ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y', ...args])
native(
  '-f',
  'lavfi',
  '-i',
  'testsrc2=size=1280x720:rate=30',
  '-f',
  'lavfi',
  '-i',
  'sine',
  '-t',
  '3',
  '-c:v',
  'libx264',
  '-pix_fmt',
  'yuv420p',
  '-c:a',
  'aac',
  join(dir, 'sdr.mp4'),
)
native(
  '-f',
  'lavfi',
  '-i',
  'testsrc2=size=1280x720:rate=30',
  '-t',
  '2',
  '-c:v',
  'libx265',
  '-x265-params',
  'log-level=error',
  '-pix_fmt',
  'yuv420p10le',
  '-color_primaries',
  'bt2020',
  '-color_trc',
  'arib-std-b67',
  '-colorspace',
  'bt2020nc',
  '-tag:v',
  'hvc1',
  join(dir, 'hlg.mov'),
)

const failures = []
const check = (ok, message) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${message}`)
  if (!ok) failures.push(message)
}

for (const variant of ['st', 'mt']) {
  console.log(`\n== ${variant}`)
  for (const file of [
    'ffmpeg-core.js',
    'ffmpeg-core.wasm',
    ...(variant === 'mt' ? ['ffmpeg-core.worker.js'] : []),
  ]) {
    const { size } = statSync(join(PACKAGE, variant, file))
    check(size < MAX_BYTES, `${file} is ${(size / 1024 / 1024).toFixed(2)} MiB`)
  }

  const { default: createFFmpegCore } = await import(join(PACKAGE, variant, 'ffmpeg-core.js'))
  const core = await createFFmpegCore()
  let lines = []
  core.setLogger(({ message }) => lines.push(message))
  const run = (...args) => {
    lines = []
    core.exec(...args)
    const ret = core.ret
    core.reset()
    return ret
  }
  for (const name of ['sdr.mp4', 'hlg.mov'])
    core.FS.writeFile(`/${name}`, readFileSync(join(dir, name)))

  for (const [kind, required] of Object.entries(REQUIRED)) {
    run('-hide_banner', `-${kind}`)
    const found = names(kind, lines)
    const missing = required.filter((n) => !found.has(n))
    check(
      missing.length === 0,
      `${kind}: ${missing.length ? `missing ${missing}` : `all ${required.length} present`}`,
    )
  }

  // The app's encode, with sound kept, and every thread count set.
  const threads = variant === 'mt' ? '2' : '1'
  let ret = run(
    '-hide_banner',
    '-threads',
    threads,
    '-filter_threads',
    '1',
    '-i',
    '/sdr.mp4',
    '-map',
    '0:v:0',
    '-map',
    '0:a:0',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-ac',
    '2',
    '-sn',
    '-dn',
    '-map_metadata',
    '-1',
    '-map_chapters',
    '-1',
    '-vf',
    'fps=30,scale=640:360:flags=lanczos:in_color_matrix=bt709:in_range=tv:out_color_matrix=bt709:out_range=tv,setsar=1,format=yuv420p',
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '28',
    '-profile:v',
    'high',
    '-level:v',
    '3.1',
    '-maxrate',
    '3M',
    '-bufsize',
    '6M',
    '-g',
    '120',
    '-threads',
    threads,
    '-color_primaries',
    'bt709',
    '-color_trc',
    'bt709',
    '-colorspace',
    'bt709',
    '-color_range',
    'tv',
    '-movflags',
    '+faststart',
    '-fflags',
    '+bitexact',
    '-f',
    'mp4',
    '/sdr-out.mp4',
  )
  check(ret === 0, `SDR encode exits 0 (${ret})`)
  if (ret === 0) {
    writeFileSync(join(dir, `${variant}-sdr.mp4`), core.FS.readFile('/sdr-out.mp4'))
    const { streams } = probe(join(dir, `${variant}-sdr.mp4`))
    const v = streams.find((s) => s.codec_type === 'video')
    const a = streams.find((s) => s.codec_type === 'audio')
    check(
      v?.codec_name === 'h264' && v.profile === 'High' && v.level === 31,
      `video is H.264 High 3.1 (${v?.profile} ${v?.level})`,
    )
    check(
      v?.width === 640 && v.height === 360 && v.pix_fmt === 'yuv420p',
      `640x360 yuv420p (${v?.width}x${v?.height} ${v?.pix_fmt})`,
    )
    check(
      v?.color_space === 'bt709' && v.color_transfer === 'bt709' && v.color_range === 'tv',
      'tagged BT.709, limited range',
    )
    check(
      a?.codec_name === 'aac' && a.channels === 2,
      `AAC stereo (${a?.codec_name} ${a?.channels})`,
    )
  }

  // HDR (HEVC 10-bit HLG) to SDR BT.709 through zimg.
  ret = run(
    '-hide_banner',
    '-threads',
    threads,
    '-filter_threads',
    '1',
    '-i',
    '/hlg.mov',
    '-an',
    '-vf',
    'zscale=w=640:h=360:t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p',
    '-c:v',
    'libx264',
    '-crf',
    '28',
    '-threads',
    threads,
    '-color_primaries',
    'bt709',
    '-color_trc',
    'bt709',
    '-colorspace',
    'bt709',
    '-color_range',
    'tv',
    '/hdr-out.mp4',
  )
  check(ret === 0, `HDR tone mapping exits 0 (${ret})`)
  if (ret === 0) {
    writeFileSync(join(dir, `${variant}-hdr.mp4`), core.FS.readFile('/hdr-out.mp4'))
    const v = probe(join(dir, `${variant}-hdr.mp4`)).streams[0]
    check(
      v.pix_fmt === 'yuv420p' && v.color_transfer === 'bt709',
      `HDR output is 8-bit BT.709 (${v.pix_fmt} ${v.color_transfer})`,
    )
  }

  // `-f null` (needs the wrapped_avframe encoder), as used for probing and SSIM.
  ret = run(
    '-hide_banner',
    '-threads',
    threads,
    '-i',
    '/sdr.mp4',
    '-an',
    '-threads',
    '1',
    '-f',
    'null',
    '-',
  )
  check(ret === 0, `-f null exits 0 (${ret})`)

  // A raw RGBA frame, as used for posters and compare stills.
  ret = run(
    '-hide_banner',
    '-ss',
    '1',
    '-i',
    '/sdr.mp4',
    '-frames:v',
    '1',
    '-vf',
    'scale=320:180',
    '-pix_fmt',
    'rgba',
    '-c:v',
    'rawvideo',
    '-threads',
    '1',
    '-f',
    'rawvideo',
    '/frame.rgba',
  )
  const bytes = ret === 0 ? core.FS.readFile('/frame.rgba').length : 0
  check(bytes === 320 * 180 * 4, `raw RGBA frame is 320x180 (${bytes} bytes)`)
}

console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nAll checks passed')
// The multi-threaded core's workers would keep Node running.
process.exit(failures.length ? 1 : 0)
