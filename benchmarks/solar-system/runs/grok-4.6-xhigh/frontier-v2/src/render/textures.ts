import * as THREE from 'three'
import { seeded } from '../core/math'

function canvas(w: number, h: number): { c: HTMLCanvasElement; g: CanvasRenderingContext2D } {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')
  if (!g) throw new Error('2d')
  return { c, g }
}

function tex(c: HTMLCanvasElement, srgb = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  t.anisotropy = 8
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.ClampToEdgeWrapping
  t.needsUpdate = true
  return t
}

function noiseFill(g: CanvasRenderingContext2D, w: number, h: number, rng: () => number, alpha = 0.12): void {
  const img = g.getImageData(0, 0, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng() - 0.5) * 255 * alpha
    d[i] = Math.max(0, Math.min(255, d[i] + n))
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n))
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n))
  }
  g.putImageData(img, 0, 0)
}

export function sunTexture(): THREE.CanvasTexture {
  const { c, g } = canvas(1024, 512)
  const grd = g.createLinearGradient(0, 0, 0, 512)
  grd.addColorStop(0, '#fff6d0')
  grd.addColorStop(0.5, '#ffcc55')
  grd.addColorStop(1, '#ff9a33')
  g.fillStyle = grd
  g.fillRect(0, 0, 1024, 512)
  const rng = seeded(7)
  for (let i = 0; i < 1800; i++) {
    const x = rng() * 1024
    const y = rng() * 512
    const r = 4 + rng() * 18
    g.fillStyle = `rgba(255,${180 + rng() * 70},40,${0.08 + rng() * 0.12})`
    g.beginPath()
    g.arc(x, y, r, 0, Math.PI * 2)
    g.fill()
  }
  noiseFill(g, 1024, 512, rng, 0.2)
  return tex(c)
}

export function mercuryTexture(): THREE.CanvasTexture {
  const { c, g } = canvas(1024, 512)
  g.fillStyle = '#8a8680'
  g.fillRect(0, 0, 1024, 512)
  const rng = seeded(11)
  g.fillStyle = '#6c6862'
  for (let i = 0; i < 80; i++) {
    g.globalAlpha = 0.25 + rng() * 0.3
    g.beginPath()
    g.ellipse(rng() * 1024, rng() * 512, 40 + rng() * 90, 20 + rng() * 40, rng() * 3, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1
  for (let i = 0; i < 420; i++) {
    const x = rng() * 1024
    const y = rng() * 512
    const r = 2 + rng() * 16
    g.fillStyle = rng() > 0.5 ? '#5a564e' : '#b0aaa0'
    g.beginPath()
    g.arc(x, y, r, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = 'rgba(30,28,26,0.35)'
    g.stroke()
  }
  return tex(c)
}

export function venusTexture(): THREE.CanvasTexture {
  const { c, g } = canvas(1024, 512)
  const grd = g.createLinearGradient(0, 0, 1024, 512)
  grd.addColorStop(0, '#efe3c2')
  grd.addColorStop(0.5, '#e0c58a')
  grd.addColorStop(1, '#d4b070')
  g.fillStyle = grd
  g.fillRect(0, 0, 1024, 512)
  const rng = seeded(13)
  g.strokeStyle = 'rgba(200,160,90,0.35)'
  g.lineWidth = 8
  for (let i = 0; i < 28; i++) {
    g.beginPath()
    g.moveTo(0, rng() * 512)
    for (let x = 0; x <= 1024; x += 32) g.quadraticCurveTo(x + 16, rng() * 512, x + 32, 80 + rng() * 350)
    g.stroke()
  }
  return tex(c)
}

/** Simplified equirectangular continents — illustrative geography, not a GIS product. */
export function earthTexture(): { color: THREE.CanvasTexture; spec: THREE.CanvasTexture; night: THREE.CanvasTexture; clouds: THREE.CanvasTexture } {
  const { c, g } = canvas(2048, 1024)
  g.fillStyle = '#1a4a86'
  g.fillRect(0, 0, 2048, 1024)
  const land = '#2f7a3c'
  const desert = '#c2b07a'
  const ice = '#e8eef4'
  function blob(lon: number, lat: number, rx: number, ry: number, color: string, rot = 0): void {
    const x = ((lon + 180) / 360) * 2048
    const y = ((90 - lat) / 180) * 1024
    g.save()
    g.translate(x, y)
    g.rotate(rot)
    g.fillStyle = color
    g.beginPath()
    g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
    g.fill()
    g.restore()
  }
  blob(-100, 45, 220, 120, land, -0.4)
  blob(-100, 55, 160, 70, land, 0.2)
  blob(-58, -15, 120, 180, land, 0.35)
  blob(20, 10, 140, 170, land, 0.15)
  blob(15, 50, 90, 50, land, 0.1)
  blob(90, 45, 280, 120, land, 0)
  blob(100, 20, 180, 90, land, 0.2)
  blob(135, -25, 90, 55, land, 0.2)
  blob(0, -90, 900, 70, ice)
  blob(0, 90, 700, 55, ice)
  blob(-110, 35, 70, 40, desert)
  blob(25, 22, 80, 35, desert)
  blob(45, 25, 90, 30, desert)
  const rng = seeded(21)
  noiseFill(g, 2048, 1024, rng, 0.08)
  const color = tex(c)

  const specC = canvas(1024, 512)
  specC.g.fillStyle = '#111'
  specC.g.fillRect(0, 0, 1024, 512)
  specC.g.fillStyle = '#ddd'
  specC.g.fillRect(0, 0, 1024, 512)
  specC.g.globalCompositeOperation = 'destination-in'
  specC.g.drawImage(c, 0, 0, 1024, 512)
  specC.g.globalCompositeOperation = 'source-over'
  specC.g.fillStyle = '#0a2a60'
  specC.g.globalAlpha = 0.85
  specC.g.fillRect(0, 0, 1024, 512)

  const { c: nc, g: ng } = canvas(1024, 512)
  ng.fillStyle = '#000'
  ng.fillRect(0, 0, 1024, 512)
  ng.fillStyle = '#ffd59a'
  for (let i = 0; i < 900; i++) {
    const x = rng() * 1024
    const y = 80 + rng() * 280
    ng.globalAlpha = 0.15 + rng() * 0.55
    ng.fillRect(x, y, 1 + rng() * 2, 1)
  }
  const night = tex(nc)

  const { c: cc, g: cg } = canvas(1024, 512)
  cg.clearRect(0, 0, 1024, 512)
  cg.fillStyle = 'rgba(255,255,255,0.55)'
  for (let i = 0; i < 40; i++) {
    cg.globalAlpha = 0.08 + rng() * 0.18
    cg.beginPath()
    cg.ellipse(rng() * 1024, rng() * 512, 80 + rng() * 160, 18 + rng() * 28, rng() * 2, 0, Math.PI * 2)
    cg.fill()
  }
  const clouds = tex(cc)
  clouds.premultiplyAlpha = false
  return { color, spec: tex(specC.c, false), night, clouds }
}

export function moonTexture(): THREE.CanvasTexture {
  const { c, g } = canvas(1024, 512)
  g.fillStyle = '#bdb8b0'
  g.fillRect(0, 0, 1024, 512)
  const rng = seeded(31)
  g.fillStyle = '#6e6a64'
  const maria: [number, number, number, number][] = [
    [280, 220, 90, 60],
    [360, 200, 70, 50],
    [200, 260, 50, 40],
    [420, 280, 40, 30],
  ]
  for (const [x, y, rx, ry] of maria) {
    g.beginPath()
    g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
    g.fill()
  }
  for (let i = 0; i < 500; i++) {
    const x = rng() * 1024
    const y = rng() * 512
    const r = 1 + rng() * 14
    g.fillStyle = rng() > 0.6 ? '#9a958c' : '#5c5852'
    g.beginPath()
    g.arc(x, y, r, 0, Math.PI * 2)
    g.fill()
  }
  return tex(c)
}

export function marsTexture(): THREE.CanvasTexture {
  const { c, g } = canvas(1024, 512)
  g.fillStyle = '#b85a32'
  g.fillRect(0, 0, 1024, 512)
  const rng = seeded(41)
  g.fillStyle = '#6e2e1c'
  for (let i = 0; i < 50; i++) {
    g.globalAlpha = 0.25
    g.beginPath()
    g.ellipse(rng() * 1024, rng() * 512, 40 + rng() * 120, 20 + rng() * 50, 0, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1
  g.fillStyle = '#e8eef4'
  g.fillRect(0, 0, 1024, 36)
  g.fillRect(0, 476, 1024, 36)
  noiseFill(g, 1024, 512, rng, 0.15)
  return tex(c)
}

export function jupiterTexture(): THREE.CanvasTexture {
  const { c, g } = canvas(1024, 512)
  const bands = ['#d9c09a', '#c9a070', '#e8dcc4', '#b07a48', '#d4b48a', '#9a6238', '#e2d2b0']
  for (let y = 0; y < 512; y++) {
    const i = Math.floor((y / 512) * bands.length)
    g.fillStyle = bands[i]
    g.fillRect(0, y, 1024, 2)
  }
  const rng = seeded(43)
  for (let i = 0; i < 120; i++) {
    g.strokeStyle = `rgba(80,40,20,${0.08 + rng() * 0.12})`
    g.beginPath()
    g.moveTo(0, rng() * 512)
    for (let x = 0; x < 1024; x += 16) g.lineTo(x, rng() * 512)
    g.stroke()
  }
  g.fillStyle = '#c45a32'
  g.beginPath()
  g.ellipse(700, 300, 55, 32, 0.2, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#e07a48'
  g.beginPath()
  g.ellipse(700, 300, 32, 18, 0.2, 0, Math.PI * 2)
  g.fill()
  return tex(c)
}

export function saturnTexture(): THREE.CanvasTexture {
  const { c, g } = canvas(1024, 512)
  const bands = ['#ead6a8', '#e0c890', '#f0e4c4', '#d2b17a', '#eee0b8']
  for (let y = 0; y < 512; y++) {
    g.fillStyle = bands[Math.floor((y / 512) * bands.length)]
    g.fillRect(0, y, 1024, 2)
  }
  return tex(c)
}

export function iceTexture(seed: number, a: string, b: string): THREE.CanvasTexture {
  const { c, g } = canvas(1024, 512)
  g.fillStyle = a
  g.fillRect(0, 0, 1024, 512)
  const rng = seeded(seed)
  g.fillStyle = b
  for (let i = 0; i < 40; i++) {
    g.globalAlpha = 0.15
    g.beginPath()
    g.ellipse(rng() * 1024, rng() * 512, 60 + rng() * 120, 18 + rng() * 40, 0, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1
  noiseFill(g, 1024, 512, rng, 0.1)
  return tex(c)
}

export function rockyTexture(seed: number, base: string, dark: string, light: string): THREE.CanvasTexture {
  const { c, g } = canvas(1024, 512)
  g.fillStyle = base
  g.fillRect(0, 0, 1024, 512)
  const rng = seeded(seed)
  for (let i = 0; i < 70; i++) {
    g.fillStyle = rng() > 0.5 ? dark : light
    g.globalAlpha = 0.2 + rng() * 0.3
    g.beginPath()
    g.ellipse(rng() * 1024, rng() * 512, 20 + rng() * 80, 12 + rng() * 40, 0, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1
  for (let i = 0; i < 200; i++) {
    g.fillStyle = dark
    g.beginPath()
    g.arc(rng() * 1024, rng() * 512, 1 + rng() * 8, 0, Math.PI * 2)
    g.fill()
  }
  return tex(c)
}

export function ringTexture(): THREE.CanvasTexture {
  const { c, g } = canvas(1024, 64)
  const img = g.createImageData(1024, 64)
  for (let x = 0; x < 1024; x++) {
    const u = x / 1024
    let a = 220
    if (u < 0.04 || u > 0.98) a = 0
    if (u > 0.55 && u < 0.62) a = 12
    if (u > 0.78 && u < 0.8) a = 40
    const n = Math.sin(u * 80) * 18 + Math.sin(u * 220) * 8
    const v = 180 + n
    for (let y = 0; y < 64; y++) {
      const i = (y * 1024 + x) * 4
      img.data[i] = v
      img.data[i + 1] = v - 10
      img.data[i + 2] = v - 30
      img.data[i + 3] = a * (y > 8 && y < 56 ? 1 : 0.3)
    }
  }
  g.putImageData(img, 0, 0)
  const t = tex(c)
  t.wrapS = THREE.ClampToEdgeWrapping
  t.wrapT = THREE.ClampToEdgeWrapping
  return t
}

export function starTexture(): THREE.CanvasTexture {
  const { c, g } = canvas(64, 64)
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.2, 'rgba(255,255,255,0.6)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 64, 64)
  const t = tex(c)
  t.wrapS = THREE.ClampToEdgeWrapping
  t.wrapT = THREE.ClampToEdgeWrapping
  return t
}

export function ioTexture(): THREE.CanvasTexture {
  return rockyTexture(51, '#e8d15a', '#c45a20', '#f4e9a8')
}
export function europaTexture(): THREE.CanvasTexture {
  return iceTexture(53, '#dfe9f4', '#8aa0b8')
}
