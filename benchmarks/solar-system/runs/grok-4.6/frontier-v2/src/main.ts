import './styles/app.css'
import { advanceClock, onVisibility } from './core/clock'
import { createEngine, type Engine } from './render/engine'
import { canStore, loadPersisted, savePersisted } from './state/persistence'
import { clock, notify, state } from './state/store'
import { attachEngine, mountUI } from './ui/app'
import { clearPoseCache } from './sim/ephemeris'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('#app missing')
const root = app
root.classList.add('app')

const persisted = loadPersisted()
state.storageOk = canStore()
if (persisted.note === 'malformed') state.lastError = 'malformed-storage'
document.documentElement.lang = state.prefs.lang

const ui = mountUI(root)
const canvas = root.querySelector<HTMLCanvasElement>('#scene-canvas')
if (!canvas) throw new Error('canvas missing')

let engine: Engine | null = null
try {
  engine = createEngine(canvas)
  attachEngine(engine)
  state.webgl = true
} catch (err) {
  state.webgl = false
  state.lastError = String(err)
  const fb = document.createElement('div')
  fb.className = 'fallback'
  fb.textContent = state.prefs.lang === 'pt-BR'
    ? 'A vista 3D não iniciou neste navegador. O catálogo continua nos painéis.'
    : 'The 3D view could not start. The catalog remains in the panels.'
  root.append(fb)
}
ui.hideBoot()

function resize(): void {
  engine?.setSize(root.clientWidth, root.clientHeight)
}
resize()
window.addEventListener('resize', resize)

let lastUi = 0
let raf = 0
function loop(now: number): void {
  raf = requestAnimationFrame(loop)
  const bound = advanceClock(clock, now)
  if (bound.jumpedBound) notify('bound')
  clearPoseCache()
  engine?.tick(clock.simMs)
  if (now - lastUi > 120) {
    lastUi = now
    ui.updateLive()
    ui.updateLabels()
  }
}
raf = requestAnimationFrame(loop)

document.addEventListener('visibilitychange', () => {
  onVisibility(clock, document.hidden)
  notify('vis')
})

canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault()
  state.lastError = 'context-lost'
  notify()
})
canvas.addEventListener('webglcontextrestored', () => {
  state.lastError = null
  resize()
  notify()
})

window.addEventListener('beforeunload', () => savePersisted())
setInterval(() => savePersisted(), 20_000)

notify('boot')

void raf
