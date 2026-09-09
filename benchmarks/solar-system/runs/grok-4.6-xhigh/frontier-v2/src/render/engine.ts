import * as THREE from 'three'
import { ALL_BODIES, getBody, radiusKm } from '../data/catalog'
import { poseAt } from '../sim/ephemeris'
import { displayRadius, mapSatelliteOffset, mapVecKm, ringDisplayRadii, sunDisplayRadius } from '../core/scale'
import type { BodyId, ScaleMode } from '../core/types'
import { seeded } from '../core/math'
import {
  earthTexture,
  europaTexture,
  iceTexture,
  ioTexture,
  jupiterTexture,
  marsTexture,
  mercuryTexture,
  moonTexture,
  rockyTexture,
  ringTexture,
  saturnTexture,
  sunTexture,
  venusTexture,
} from './textures'
import { state, wantsReducedMotion } from '../state/store'

THREE.ColorManagement.enabled = true

export type Engine = {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  sunLight: THREE.PointLight
  fill: THREE.AmbientLight
  bodies: Map<BodyId, BodyVisual>
  starField: THREE.Points
  belt: THREE.InstancedMesh
  kuiper: THREE.InstancedMesh
  orbits: Map<BodyId, THREE.Line>
  measureLine: THREE.Line
  pick: (x: number, y: number) => BodyId[]
  setSize: (w: number, h: number) => void
  tick: (simMs: number) => void
  focusBody: (id: BodyId, instant?: boolean) => void
  resetView: () => void
  capturePng: () => string | null
  dispose: () => void
  cameraRig: CameraRig
  getDisplayPos: (id: BodyId) => THREE.Vector3
  captureView: () => ViewSnap
  restoreView: (s: ViewSnap) => void
}

export type ViewSnap = {
  followId: BodyId | null
  radius: number
  phi: number
  theta: number
  tx: number
  ty: number
  tz: number
}

type BodyVisual = {
  id: BodyId
  root: THREE.Group
  axial: THREE.Group
  spin: THREE.Group
  mesh: THREE.Object3D
  atmosphere?: THREE.Mesh
  clouds?: THREE.Mesh
  rings?: THREE.Mesh
  marker: THREE.Mesh
  radius: number
  ionTail?: THREE.Line
  dustTail?: THREE.Line
}

export type CameraRig = {
  target: THREE.Vector3
  spherical: THREE.Spherical
  followId: BodyId | null
  anim: null | {
    t0: number
    dur: number
    from: THREE.Vector3
    fromSph: THREE.Spherical
    toSph: THREE.Spherical
    toId: BodyId
  }
  dragging: boolean
  moved: boolean
  pointerId: number | null
  lastX: number
  lastY: number
}

const sphereHi = new THREE.SphereGeometry(1, 64, 48)
const sphereMd = new THREE.SphereGeometry(1, 32, 24)
const sphereLo = new THREE.SphereGeometry(1, 16, 12)

function qualityGeo(): THREE.SphereGeometry {
  const q = state.prefs.quality
  if (q === 'low-power') return sphereLo
  if (q === 'cinematic') return sphereHi
  return sphereMd
}

export function createEngine(canvas: HTMLCanvasElement): Engine {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
  })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, state.prefs.pixelRatioCap))
  renderer.setClearColor(0x07080d, 1)

  const scene = new THREE.Scene()
  scene.up.set(0, 0, 1)
  const camera = new THREE.PerspectiveCamera(50, 1, 0.02, 8000)
  camera.up.set(0, 0, 1)

  const sunLight = new THREE.PointLight(0xfff2d0, 2.4, 0, 0)
  sunLight.position.set(0, 0, 0)
  scene.add(sunLight)
  const fill = new THREE.AmbientLight(0x6a7aaa, 0.045)
  scene.add(fill)

  const textures = buildTextures()
  const bodies = new Map<BodyId, BodyVisual>()
  const orbits = new Map<BodyId, THREE.Line>()

  for (const rec of ALL_BODIES) {
    if (rec.kind === 'region') continue
    const vis = makeBody(rec.id, textures)
    bodies.set(rec.id, vis)
    scene.add(vis.root)
  }

  const starField = makeStars()
  scene.add(starField)
  const belt = makeBelt(2.2, 3.2, 1400, 17)
  const kuiper = makeBelt(32, 48, 900, 29)
  scene.add(belt, kuiper)

  const measureLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
    new THREE.LineBasicMaterial({ color: 0x5ec8e8, transparent: true, opacity: 0.85 }),
  )
  measureLine.visible = false
  scene.add(measureLine)
  const pulse = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xfff4c8 }),
  )
  pulse.visible = false
  scene.add(pulse)

  const orbitIds = [
    'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune',
    'pluto', 'ceres', 'vesta', 'edu-comet',
    ...ALL_BODIES.filter((b) => b.kind === 'moon').map((b) => b.id),
  ]
  for (const id of orbitIds) {
    const line = makeOrbitLine(id)
    orbits.set(id, line)
    scene.add(line)
  }

  const e0 = mapVecKm(poseAt('earth', state.simMs).km, state.prefs.scaleMode)
  const cameraRig: CameraRig = {
    target: new THREE.Vector3(e0.x * 0.25, e0.y * 0.25, 3),
    spherical: new THREE.Spherical(48, 1.05, 0.72),
    followId: null,
    anim: null,
    dragging: false,
    moved: false,
    pointerId: null,
    lastX: 0,
    lastY: 0,
  }
  applyRig(camera, cameraRig)

  const ray = new THREE.Raycaster()

  function getDisplayPos(id: BodyId): THREE.Vector3 {
    const vis = bodies.get(id)
    return vis ? vis.root.position.clone() : new THREE.Vector3()
  }

  function setSize(w: number, h: number): void {
    const pr = Math.min(window.devicePixelRatio, state.prefs.pixelRatioCap)
    renderer.setPixelRatio(pr)
    renderer.setSize(w, h, false)
    camera.aspect = w / Math.max(1, h)
    camera.updateProjectionMatrix()
  }

  let lastOrbitMs = 0
  function tick(simMs: number): void {
    const mode = state.prefs.scaleMode
    fill.intensity = 0.03 + state.prefs.illuminationBoost * 0.4
    renderer.toneMappingExposure = state.tool === 'photo' ? state.photo.exposure : state.prefs.presentation === 'enhanced' ? 1.15 : 1
    if (state.tool === 'photo') camera.fov = state.photo.fov
    else camera.fov = 50
    camera.updateProjectionMatrix()
    starField.visible = !state.prefs.cleanBackground
    ;(starField.material as THREE.PointsMaterial).opacity = 0.35 + state.prefs.backgroundIntensity * 0.65
    kuiper.visible = mode === 'relative' || Boolean(state.selectedId && ['pluto', 'kuiper-belt', 'eris', 'haumea', 'makemake'].includes(state.selectedId))

    for (const rec of ALL_BODIES) {
      if (rec.kind === 'region') continue
      const vis = bodies.get(rec.id)
      if (!vis) continue
      const pose = poseAt(rec.id, simMs)
      let disp
      if (rec.satOrbit && pose.relKm && pose.parentKm) {
        const parent = getBody(rec.satOrbit.parentId)!
        const pr = radiusKm(parent) ?? 1
        const parentDisp = mapVecKm(pose.parentKm, mode)
        const off = mapSatelliteOffset(pose.relKm, pr, mode)
        disp = { x: parentDisp.x + off.x, y: parentDisp.y + off.y, z: parentDisp.z + off.z }
      } else {
        disp = mapVecKm(pose.km, mode)
      }
      vis.root.position.set(disp.x, disp.y, disp.z)
      const r = rec.id === 'sun' ? sunDisplayRadius(mode) : displayRadius(radiusKm(rec) ?? 1, mode)
      vis.radius = r
      vis.spin.scale.setScalar(r)
      vis.axial.rotation.set(pose.axialTiltRad, 0, 0)
      vis.spin.rotation.z = pose.spinRad
      if (vis.clouds) vis.clouds.rotation.z = pose.spinRad * 1.02
      if (vis.rings && rec.rings) {
        const rr = ringDisplayRadii(radiusKm(rec) ?? 1, rec.rings.innerKm, rec.rings.outerKm, mode)
        vis.rings.scale.setScalar(rr.outer)
      }
      vis.marker.visible = r * 50 < 0.4 && state.prefs.labels !== 'none'
      if (rec.id === 'edu-comet') {
        const au = Math.hypot(pose.km.x, pose.km.y, pose.km.z) / 149597870.7
        const activity = Math.min(1, 0.55 / Math.max(0.2, au * au))
        vis.marker.scale.setScalar(0.12 + activity)
        updateCometTails(vis, disp, activity)
      }
    }

    const now = performance.now()
    if (now - lastOrbitMs > 220) {
      lastOrbitMs = now
      updateOrbits(orbits, simMs, mode)
    }
    updateMeasure(measureLine, simMs)
    updatePulse(pulse, simMs)
    updateCamera(camera, cameraRig, getDisplayPos)
    renderer.render(scene, camera)
  }

  function pick(cx: number, cy: number): BodyId[] {
    const ndc = new THREE.Vector2((cx / canvas.clientWidth) * 2 - 1, -(cy / canvas.clientHeight) * 2 + 1)
    ray.setFromCamera(ndc, camera)
    const meshes: THREE.Object3D[] = []
    for (const vis of bodies.values()) meshes.push(vis.mesh, vis.marker)
    const hits = ray.intersectObjects(meshes, true)
    const ids: BodyId[] = []
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object
      while (o && !o.userData.bodyId) o = o.parent
      if (o?.userData.bodyId && !ids.includes(o.userData.bodyId)) ids.push(o.userData.bodyId)
    }
    const extra = screenPick(cx, cy)
    for (const id of extra) if (!ids.includes(id)) ids.push(id)
    return ids
  }

  function screenPick(cx: number, cy: number): BodyId[] {
    const out: { id: BodyId; d: number }[] = []
    const v = new THREE.Vector3()
    for (const [id, vis] of bodies) {
      v.copy(vis.root.position).project(camera)
      if (v.z > 1 || v.z < -1) continue
      const x = (v.x * 0.5 + 0.5) * canvas.clientWidth
      const y = (-v.y * 0.5 + 0.5) * canvas.clientHeight
      const d = Math.hypot(x - cx, y - cy)
      const tol = Math.max(14, Math.min(44, vis.radius * 8 + 16))
      if (d < tol) out.push({ id, d })
    }
    out.sort((a, b) => a.d - b.d)
    return out.slice(0, 6).map((x) => x.id)
  }

  function focusBody(id: BodyId, instant = false): void {
    const vis = bodies.get(id)
    if (!vis) return
    const rec = getBody(id)
    let r = vis.radius * 5.5
    if (rec?.rings) r *= 2.8
    if (rec?.kind === 'star') r = vis.radius * 8
    const sph = new THREE.Spherical(Math.max(r, 0.8), 1.05, cameraRig.spherical.theta)
    if (instant || wantsReducedMotion()) {
      cameraRig.target.copy(vis.root.position)
      cameraRig.spherical.copy(sph)
      cameraRig.anim = null
      applyRig(camera, cameraRig)
      return
    }
    cameraRig.anim = {
      t0: performance.now(),
      dur: 1100,
      from: cameraRig.target.clone(),
      fromSph: cameraRig.spherical.clone(),
      toSph: sph.clone(),
      toId: id,
    }
  }

  function resetView(): void {
    cameraRig.followId = null
    state.cameraMode = 'free'
    cameraRig.spherical.set(48, 1.05, 0.72)
    const e = mapVecKm(poseAt('earth', state.simMs).km, state.prefs.scaleMode)
    cameraRig.target.set(e.x * 0.25, e.y * 0.25, 3)
    cameraRig.anim = null
    applyRig(camera, cameraRig)
  }

  function capturePng(): string | null {
    try {
      return renderer.domElement.toDataURL('image/png')
    } catch {
      return null
    }
  }

  function captureView(): ViewSnap {
    return {
      followId: cameraRig.followId,
      radius: cameraRig.spherical.radius,
      phi: cameraRig.spherical.phi,
      theta: cameraRig.spherical.theta,
      tx: cameraRig.target.x,
      ty: cameraRig.target.y,
      tz: cameraRig.target.z,
    }
  }

  function restoreView(s: ViewSnap): void {
    cameraRig.followId = s.followId
    cameraRig.spherical.set(s.radius, s.phi, s.theta)
    cameraRig.target.set(s.tx, s.ty, s.tz)
    cameraRig.anim = null
    applyRig(camera, cameraRig)
  }

  function dispose(): void {
    renderer.dispose()
  }

  bindCamera(canvas, camera, cameraRig, pick)

  return {
    renderer, scene, camera, sunLight, fill, bodies, starField, belt, kuiper, orbits, measureLine,
    pick, setSize, tick, focusBody, resetView, capturePng, dispose, cameraRig, getDisplayPos,
    captureView, restoreView,
  }
}

/** phi from +Z (north ecliptic pole), theta around Z. */
function sphericalOffset(sph: THREE.Spherical): THREE.Vector3 {
  const sinPhi = Math.sin(sph.phi)
  return new THREE.Vector3(
    sph.radius * sinPhi * Math.cos(sph.theta),
    sph.radius * sinPhi * Math.sin(sph.theta),
    sph.radius * Math.cos(sph.phi),
  )
}

function applyRig(camera: THREE.PerspectiveCamera, rig: CameraRig): void {
  camera.position.copy(rig.target).add(sphericalOffset(rig.spherical))
  camera.lookAt(rig.target)
}

function updateCamera(camera: THREE.PerspectiveCamera, rig: CameraRig, getPos: (id: BodyId) => THREE.Vector3): void {
  if (rig.followId && !rig.anim) rig.target.copy(getPos(rig.followId))
  if (rig.anim) {
    const k = Math.min(1, (performance.now() - rig.anim.t0) / rig.anim.dur)
    const e = k * k * (3 - 2 * k)
    const to = getPos(rig.anim.toId)
    rig.target.lerpVectors(rig.anim.from, to, e)
    rig.spherical.radius = rig.anim.fromSph.radius + (rig.anim.toSph.radius - rig.anim.fromSph.radius) * e
    rig.spherical.phi = rig.anim.fromSph.phi + (rig.anim.toSph.phi - rig.anim.fromSph.phi) * e
    rig.spherical.theta = rig.anim.fromSph.theta + (rig.anim.toSph.theta - rig.anim.fromSph.theta) * e
    if (k >= 1) {
      rig.target.copy(to)
      rig.spherical.copy(rig.anim.toSph)
      rig.anim = null
    }
  }
  applyRig(camera, rig)
}

function bindCamera(
  canvas: HTMLCanvasElement,
  camera: THREE.PerspectiveCamera,
  rig: CameraRig,
  pick: (x: number, y: number) => BodyId[],
): void {
  canvas.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0 && ev.pointerType === 'mouse') return
    rig.dragging = true
    rig.moved = false
    rig.pointerId = ev.pointerId
    rig.lastX = ev.clientX
    rig.lastY = ev.clientY
    canvas.setPointerCapture(ev.pointerId)
    rig.anim = null
  })
  canvas.addEventListener('pointermove', (ev) => {
    if (!rig.dragging) return
    const dx = ev.clientX - rig.lastX
    const dy = ev.clientY - rig.lastY
    if (Math.hypot(dx, dy) > 4) rig.moved = true
    rig.lastX = ev.clientX
    rig.lastY = ev.clientY
    if (ev.shiftKey || ev.buttons === 2) {
      const right = new THREE.Vector3()
      const up = new THREE.Vector3()
      camera.matrix.extractBasis(right, up, new THREE.Vector3())
      const pan = rig.spherical.radius * 0.0015
      rig.target.addScaledVector(right, -dx * pan)
      rig.target.addScaledVector(camera.up, dy * pan)
    } else {
      rig.spherical.theta -= dx * 0.005
      rig.spherical.phi = Math.min(Math.PI - 0.05, Math.max(0.05, rig.spherical.phi - dy * 0.005))
    }
  })
  const end = (ev: PointerEvent) => {
    if (rig.pointerId !== ev.pointerId) return
    const wasDrag = rig.moved
    rig.dragging = false
    rig.pointerId = null
    if (!wasDrag) {
      const rect = canvas.getBoundingClientRect()
      const ids = pick(ev.clientX - rect.left, ev.clientY - rect.top)
      canvas.dispatchEvent(new CustomEvent('sso-pick', { detail: { ids } }))
    }
  }
  canvas.addEventListener('pointerup', end)
  canvas.addEventListener('pointercancel', end)
  canvas.addEventListener('contextmenu', (e) => e.preventDefault())
  canvas.addEventListener(
    'wheel',
    (ev) => {
      ev.preventDefault()
      const f = Math.exp(ev.deltaY * 0.0012)
      rig.spherical.radius = Math.min(2500, Math.max(0.12, rig.spherical.radius * f))
      rig.anim = null
    },
    { passive: false },
  )
  let pinch = 0
  canvas.addEventListener('touchstart', (ev) => {
    if (ev.touches.length === 2) {
      pinch = Math.hypot(ev.touches[0].clientX - ev.touches[1].clientX, ev.touches[0].clientY - ev.touches[1].clientY)
    }
  })
  canvas.addEventListener('touchmove', (ev) => {
    if (ev.touches.length === 2) {
      const d = Math.hypot(ev.touches[0].clientX - ev.touches[1].clientX, ev.touches[0].clientY - ev.touches[1].clientY)
      if (pinch) rig.spherical.radius = Math.min(2500, Math.max(0.12, rig.spherical.radius * (pinch / d)))
      pinch = d
      rig.moved = true
    }
  })
}

function makeBody(id: BodyId, textures: ReturnType<typeof buildTextures>): BodyVisual {
  const rec = getBody(id)!
  const root = new THREE.Group()
  root.userData.bodyId = id
  const axial = new THREE.Group()
  const spin = new THREE.Group()
  root.add(axial)
  axial.add(spin)
  const mat = materialFor(id, textures)
  const mesh = rec.visual.type === 'irregular' ? new THREE.Mesh(irregularGeo(id), mat) : new THREE.Mesh(qualityGeo(), mat)
  mesh.userData.bodyId = id
  spin.add(mesh)
  let atmosphere: THREE.Mesh | undefined
  let clouds: THREE.Mesh | undefined
  let rings: THREE.Mesh | undefined
  if (id === 'earth') {
    clouds = new THREE.Mesh(
      sphereMd,
      new THREE.MeshLambertMaterial({ map: textures.earth.clouds, transparent: true, opacity: 0.45, depthWrite: false }),
    )
    clouds.scale.setScalar(1.018)
    spin.add(clouds)
    atmosphere = new THREE.Mesh(
      sphereMd,
      new THREE.MeshBasicMaterial({ color: 0x6ec8ff, transparent: true, opacity: 0.12, side: THREE.BackSide, depthWrite: false }),
    )
    atmosphere.scale.setScalar(1.045)
    axial.add(atmosphere)
  }
  if (id === 'titan' || id === 'venus') {
    atmosphere = new THREE.Mesh(
      sphereMd,
      new THREE.MeshBasicMaterial({
        color: id === 'venus' ? 0xe8d4a0 : 0xc9a46a,
        transparent: true,
        opacity: 0.22,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    )
    atmosphere.scale.setScalar(1.06)
    axial.add(atmosphere)
  }
  if (rec.rings) {
    const geo = new THREE.RingGeometry(rec.rings.innerKm / rec.rings.outerKm, 1, 128, 4)
    rings = new THREE.Mesh(
      geo,
      new THREE.MeshPhongMaterial({
        map: textures.ring,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: rec.rings.faint ? 0.22 : 0.92,
        depthWrite: false,
      }),
    )
    axial.add(rings)
  }
  if (id === 'sun') {
    const corona = new THREE.Mesh(
      sphereLo,
      new THREE.MeshBasicMaterial({ color: 0xffc878, transparent: true, opacity: 0.18, side: THREE.BackSide, depthWrite: false }),
    )
    corona.scale.setScalar(1.35)
    spin.add(corona)
    const corona2 = new THREE.Mesh(
      sphereLo,
      new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.08, side: THREE.BackSide, depthWrite: false }),
    )
    corona2.scale.setScalar(2.1)
    spin.add(corona2)
  }
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(1, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x5ec8e8, transparent: true, opacity: 0.55, depthTest: false }),
  )
  marker.scale.setScalar(0.12)
  marker.userData.bodyId = id
  root.add(marker)
  let ionTail: THREE.Line | undefined
  let dustTail: THREE.Line | undefined
  if (id === 'edu-comet') {
    ionTail = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]),
      new THREE.LineBasicMaterial({ color: 0x88ddff, transparent: true, opacity: 0.85 }),
    )
    dustTail = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]),
      new THREE.LineBasicMaterial({ color: 0xc8b89a, transparent: true, opacity: 0.7 }),
    )
    sceneSafeAdd(root, ionTail, dustTail)
  }
  return { id, root, axial, spin, mesh, atmosphere, clouds, rings, marker, radius: 1, ionTail, dustTail }
}

function sceneSafeAdd(root: THREE.Group, a: THREE.Object3D, b: THREE.Object3D): void {
  root.add(a, b)
}

function materialFor(id: BodyId, textures: ReturnType<typeof buildTextures>): THREE.Material {
  if (id === 'sun') return new THREE.MeshBasicMaterial({ map: textures.sun })
  const map =
    id === 'mercury' ? textures.mercury
    : id === 'venus' ? textures.venus
    : id === 'earth' ? textures.earth.color
    : id === 'moon' ? textures.moon
    : id === 'mars' ? textures.mars
    : id === 'jupiter' ? textures.jupiter
    : id === 'saturn' ? textures.saturn
    : id === 'uranus' ? textures.uranus
    : id === 'neptune' ? textures.neptune
    : id === 'io' ? textures.io
    : id === 'europa' ? textures.europa
    : id === 'ganymede' ? textures.ganymede
    : id === 'callisto' ? textures.callisto
    : id === 'titan' ? textures.titan
    : id === 'enceladus' ? textures.enceladus
    : id === 'pluto' ? textures.pluto
    : textures.generic.get(id) ?? textures.rock
  return new THREE.MeshStandardMaterial({
    map,
    roughness: id === 'enceladus' || id === 'europa' ? 0.45 : 0.85,
    metalness: 0,
    emissive: id === 'earth' ? new THREE.Color(0x221800) : new THREE.Color(0x000000),
    emissiveMap: id === 'earth' ? textures.earth.night : null,
    emissiveIntensity: id === 'earth' ? 0.8 : 0,
  })
}

function buildTextures() {
  return {
    sun: sunTexture(),
    mercury: mercuryTexture(),
    venus: venusTexture(),
    earth: earthTexture(),
    moon: moonTexture(),
    mars: marsTexture(),
    jupiter: jupiterTexture(),
    saturn: saturnTexture(),
    uranus: iceTexture(61, '#9fe3e0', '#7ec9c8'),
    neptune: iceTexture(67, '#3a6ad6', '#7aa7ff'),
    io: ioTexture(),
    europa: europaTexture(),
    ganymede: rockyTexture(71, '#b8a990', '#6a6458', '#ddd3c2'),
    callisto: rockyTexture(73, '#6a635c', '#3e3a36', '#a39a90'),
    titan: rockyTexture(79, '#c9a46a', '#8a6a3a', '#e8d2a8'),
    enceladus: iceTexture(83, '#f4fbff', '#bcd4e4'),
    pluto: rockyTexture(89, '#d8c4b0', '#8b5a4a', '#f0e6d8'),
    rock: rockyTexture(97, '#8a8580', '#4a4540', '#c0bbb4'),
    ring: ringTexture(),
    generic: new Map<string, THREE.CanvasTexture>([
      ['phobos', rockyTexture(101, '#8a7a6a', '#4a4038', '#a09080')],
      ['deimos', rockyTexture(103, '#9a8c7c', '#5a5048', '#b0a090')],
      ['triton', iceTexture(107, '#c8d4d0', '#8aa09a')],
      ['charon', rockyTexture(109, '#b0a8a0', '#6e6860', '#d0c8c0')],
      ['ceres', rockyTexture(113, '#8a8580', '#5a5550', '#c0bbb4')],
      ['vesta', rockyTexture(127, '#9a9084', '#5c564c', '#c2b8ac')],
      ['eris', iceTexture(131, '#e8eef2', '#c0c8d0')],
      ['haumea', iceTexture(137, '#f2f6fa', '#d0d8e0')],
      ['makemake', iceTexture(139, '#e8dcc8', '#c8b090')],
      ['edu-comet', rockyTexture(149, '#c8d0d8', '#8aa0b8', '#e8eef4')],
      ['miranda', iceTexture(151, '#cfd6d8', '#9aa3a8')],
      ['ariel', iceTexture(157, '#d9e0e4', '#b0b8bc')],
      ['umbriel', rockyTexture(163, '#4a4e52', '#2e3236', '#6a7074')],
      ['titania', iceTexture(167, '#c5c8cc', '#8b9096')],
      ['oberon', rockyTexture(173, '#7a7670', '#4c4844', '#9a9690')],
    ]),
  }
}

function irregularGeo(id: string): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, 2)
  const pos = g.attributes.position
  const rng = seeded(id.split('').reduce((a, c) => a + c.charCodeAt(0), 0))
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const n = 0.78 + rng() * 0.4
    pos.setXYZ(i, x * n, y * n * (0.7 + rng() * 0.3), z * n)
  }
  g.computeVertexNormals()
  return g
}

function makeStars(): THREE.Points {
  const rng = seeded(2026)
  const n = 4000
  const pos = new Float32Array(n * 3)
  const col = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const r = 1800 + rng() * 400
    const th = rng() * Math.PI * 2
    const ph = Math.acos(2 * rng() - 1)
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th)
    pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th)
    pos[i * 3 + 2] = r * Math.cos(ph)
    const t = rng()
    col[i * 3] = 0.75 + t * 0.25
    col[i * 3 + 1] = 0.78 + t * 0.18
    col[i * 3 + 2] = 0.9 - t * 0.15
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  const mat = new THREE.PointsMaterial({
    size: 1.6,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  })
  const pts = new THREE.Points(geo, mat)
  pts.frustumCulled = false
  return pts
}

function makeBelt(a0: number, a1: number, count: number, seed: number): THREE.InstancedMesh {
  const geo = new THREE.SphereGeometry(1, 6, 4)
  const mat = new THREE.MeshStandardMaterial({ color: 0x8a8478, roughness: 0.95 })
  const mesh = new THREE.InstancedMesh(geo, mat, count)
  const rng = seeded(seed)
  const dummy = new THREE.Object3D()
  for (let i = 0; i < count; i++) {
    const a = a0 + rng() * (a1 - a0)
    const th = rng() * Math.PI * 2
    const inc = (rng() - 0.5) * 0.18
    const d = mapVecKm(
      { x: a * Math.cos(th) * 149597870.7, y: a * Math.sin(th) * 149597870.7, z: a * inc * 0.1 * 149597870.7 },
      'exploration',
    )
    dummy.position.set(d.x, d.y, d.z)
    dummy.scale.setScalar(0.015 + rng() * 0.03)
    dummy.rotation.set(rng() * 3, rng() * 3, rng() * 3)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
  }
  mesh.instanceMatrix.needsUpdate = true
  mesh.frustumCulled = false
  return mesh
}

function makeOrbitLine(id: BodyId): THREE.Line {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(180 * 3), 3))
  const mat = new THREE.LineBasicMaterial({ color: 0x3a4258, transparent: true, opacity: 0.45 })
  const line = new THREE.Line(geo, mat)
  line.userData.bodyId = id
  line.frustumCulled = false
  return line
}

function updateOrbits(orbits: Map<BodyId, THREE.Line>, simMs: number, mode: ScaleMode): void {
  const visMode = state.prefs.orbits
  for (const [id, line] of orbits) {
    const rec = getBody(id)
    if (!rec) continue
    const selected = state.selectedId
    const parent = rec.parentId
    let show = visMode === 'all'
    if (visMode === 'none') show = false
    if (visMode === 'selected') show = id === selected
    if (visMode === 'system') show = id === selected || parent === selected || rec.id === getBody(selected ?? '')?.parentId
    if (rec.kind === 'moon' && visMode === 'all') {
      show = selected === id || selected === parent || getBody(selected ?? '')?.parentId === parent
    }
    if (state.tool === 'photo') show = show && state.photo.orbits
    line.visible = show
    if (!line.visible) continue
    const pos = line.geometry.getAttribute('position')
    const n = pos.count
    const period = rec.siderealOrbitDays ?? 365
    const parentId = rec.satOrbit?.parentId
    for (let i = 0; i < n; i++) {
      const t = simMs + (i / (n - 1) - 0.5) * Math.abs(period) * 86_400_000
      const p = poseAt(id, t)
      let d
      if (parentId && p.relKm && p.parentKm) {
        const parentRec = getBody(parentId)!
        const nowP = poseAt(parentId, simMs)
        const parentDisp = mapVecKm(nowP.km, mode)
        const off = mapSatelliteOffset(p.relKm, radiusKm(parentRec) ?? 1, mode)
        d = { x: parentDisp.x + off.x, y: parentDisp.y + off.y, z: parentDisp.z + off.z }
      } else {
        d = mapVecKm(p.km, mode)
      }
      pos.setXYZ(i, d.x, d.y, d.z)
    }
    pos.needsUpdate = true
    line.geometry.computeBoundingSphere()
  }
}

function updateMeasure(line: THREE.Line, simMs: number): void {
  const m = state.measure
  if (!m) {
    line.visible = false
    return
  }
  const a = poseAt(m.a, m.live ? simMs : m.frozenMs ?? simMs)
  const b = poseAt(m.b, m.live ? simMs : m.frozenMs ?? simMs)
  const da = mapVecKm(a.km, state.prefs.scaleMode)
  const db = mapVecKm(b.km, state.prefs.scaleMode)
  const pos = line.geometry.getAttribute('position')
  pos.setXYZ(0, da.x, da.y, da.z)
  pos.setXYZ(1, db.x, db.y, db.z)
  pos.needsUpdate = true
  line.visible = true
}

function updatePulse(mesh: THREE.Mesh, simMs: number): void {
  const m = state.measure
  if (!m || !state.lightPulse) {
    mesh.visible = false
    return
  }
  const t = ((simMs / 400) % 1000) / 1000
  const a = poseAt(m.a, m.live ? simMs : m.frozenMs ?? simMs)
  const b = poseAt(m.b, m.live ? simMs : m.frozenMs ?? simMs)
  const da = mapVecKm(a.km, state.prefs.scaleMode)
  const db = mapVecKm(b.km, state.prefs.scaleMode)
  mesh.position.set(da.x + (db.x - da.x) * t, da.y + (db.y - da.y) * t, da.z + (db.z - da.z) * t)
  mesh.visible = true
}

function updateCometTails(vis: BodyVisual, disp: { x: number; y: number; z: number }, activity: number): void {
  const len = 0.4 + activity * 7
  const r = Math.hypot(disp.x, disp.y, disp.z) || 1
  const ux = disp.x / r
  const uy = disp.y / r
  const uz = disp.z / r
  if (vis.ionTail) {
    const pos = vis.ionTail.geometry.getAttribute('position')
    pos.setXYZ(0, 0, 0, 0)
    pos.setXYZ(1, ux * len, uy * len, uz * len)
    pos.needsUpdate = true
    vis.ionTail.visible = activity > 0.04
  }
  if (vis.dustTail) {
    const pos = vis.dustTail.geometry.getAttribute('position')
    const curve = 0.35 * len
    pos.setXYZ(0, 0, 0, 0)
    pos.setXYZ(1, ux * len * 0.75 - uy * curve, uy * len * 0.75 + ux * curve, uz * len * 0.7)
    pos.needsUpdate = true
    vis.dustTail.visible = activity > 0.04
  }
}
