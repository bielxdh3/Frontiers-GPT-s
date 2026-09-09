import { AU_KM, C_KMS, DAY_S, DEFAULT_RATE, SPEED_PRESETS, VALID_END_ISO, VALID_START_ISO } from '../core/constants'
import { goToNow, resetSimulation, reverseDirection, setDateMs, setRate, stepSim, togglePlay } from '../core/clock'
import { formatAu, formatDateUtc, formatDays, formatKm, formatLightTime, formatMassKg, isoToDatetimeLocal, ratePhrase } from '../core/format'
import { orbitLabDerived } from '../core/gravity'
import { SCALE_EXPLAIN } from '../core/scale'
import type { BodyId, ToolId } from '../core/types'
import { ALL_BODIES, childrenOf, diameterKm, getBody, groupNavigator, radiusKm, searchBodies } from '../data/catalog'
import { t, kindLabel, type MsgKey } from '../data/i18n'
import { ACTIVITIES, ARTICLES, MISSIONS, TOURS } from '../data/learn'
import { poseAt, distanceKm, angularSeparationDeg } from '../sim/ephemeris'
import { clock, notify, popLayer, selectBody, setLang, setTool, state, subscribe, wantsReducedMotion } from '../state/store'
import { downloadText, exportLocalJson, importLocalJson, savePersisted } from '../state/persistence'
import type { Engine } from '../render/engine'

let eng: Engine | null = null
export function attachEngine(e: Engine | null): void {
  eng = e
}

const GROUPS: Record<string, MsgKey> = {
  star: 'groupStar', planets: 'groupPlanets', moons: 'groupMoons', dwarfs: 'groupDwarfs', small: 'groupSmall', regions: 'groupRegions',
}

const LIVE_HINTS = new Set(['rate', 'bound', 'vis', 'clock'])

export function mountUI(root: HTMLElement): { updateLive: () => void; updateLabels: () => void; hideBoot: () => void } {
  root.innerHTML = shellHtml()
  bind(root)
  refresh(root, 'boot')
  subscribe((hint) => {
    if (LIVE_HINTS.has(hint)) {
      updateLive(root)
      drawMini(root)
      return
    }
    refresh(root, hint)
  })
  return {
    updateLive: () => updateLive(root),
    updateLabels: () => updateLabels(root, eng),
    hideBoot: () => {
      const b = root.querySelector('#boot') as HTMLElement | null
      if (b) b.hidden = true
    },
  }
}

function shellHtml(): string {
  return `
<canvas id="scene-canvas" aria-label="${t(state.prefs.lang, 'title')}"></canvas>
<div id="labels"></div>
<div class="guides" aria-hidden="true"></div>
<header class="topbar">
  <div class="brand">${t(state.prefs.lang, 'title')}<small>SSO</small></div>
  <div class="tabs" role="tablist">
    <button type="button" data-mode="explore" aria-selected="true">${t(state.prefs.lang, 'explore')}</button>
    <button type="button" data-mode="learn">${t(state.prefs.lang, 'learn')}</button>
    <button type="button" data-mode="tools">${t(state.prefs.lang, 'tools')}</button>
    <button type="button" data-act="settings">${t(state.prefs.lang, 'settings')}</button>
  </div>
  <div class="search">
    <input id="q" type="search" autocomplete="off" placeholder="${t(state.prefs.lang, 'search')}" aria-label="${t(state.prefs.lang, 'search')}" />
    <div id="q-res" class="search-results" hidden role="listbox"></div>
  </div>
  <button type="button" class="icon-btn" data-act="command" aria-label="${t(state.prefs.lang, 'command')}">⌘</button>
  <button type="button" class="icon-btn" data-act="help" aria-label="${t(state.prefs.lang, 'help')}">?</button>
  <button type="button" class="icon-btn" data-act="dfree" aria-label="${t(state.prefs.lang, 'distraction')}">▣</button>
</header>
<nav class="nav" id="nav" aria-label="${t(state.prefs.lang, 'navigator')}"></nav>
<aside class="ins" id="ins" aria-label="${t(state.prefs.lang, 'inspector')}"></aside>
<footer class="timebar">
  <div class="time-btns">
    <button type="button" data-act="play">${t(state.prefs.lang, 'pause')}</button>
    <button type="button" data-act="reverse">${t(state.prefs.lang, 'reverse')}</button>
    <button type="button" data-act="now">${t(state.prefs.lang, 'now')}</button>
    <button type="button" data-act="reset-sim" title="${t(state.prefs.lang, 'resetSim')}">↺ sim</button>
    <button type="button" data-act="reset-view" title="${t(state.prefs.lang, 'resetView')}">↺ view</button>
  </div>
  <div>
    <div class="date" id="date-readout"></div>
    <input id="rate" type="range" min="-12" max="12" step="0.01" aria-label="rate" />
    <div class="rate" id="rate-readout"></div>
  </div>
  <div class="time-btns">
    <button type="button" data-step="60">${t(state.prefs.lang, 'stepMin')}</button>
    <button type="button" data-step="${3600}">${t(state.prefs.lang, 'stepHour')}</button>
    <button type="button" data-step="${DAY_S}">${t(state.prefs.lang, 'stepDay')}</button>
    <button type="button" data-step="${DAY_S * 7}">${t(state.prefs.lang, 'stepWeek')}</button>
    <button type="button" data-act="one-orbit">${t(state.prefs.lang, 'oneOrbit')}</button>
    <label class="muted">${t(state.prefs.lang, 'dateUtc')}
      <input id="date-in" type="datetime-local" />
    </label>
    <button type="button" class="badge" data-act="tool:scale-lab" id="scale-badge"></button>
  </div>
  <div class="time-btns" aria-label="presets">
    <button type="button" data-rate="1">1×</button>
    <button type="button" data-rate="10">10×</button>
    <button type="button" data-rate="100">100×</button>
    <button type="button" data-rate="1000">10³×</button>
    <button type="button" data-rate="3600">1 h/s</button>
    <button type="button" data-rate="86400">1 d/s</button>
    <label class="muted">× <input id="rate-num" type="text" inputmode="decimal" size="8" aria-label="rate custom" /></label>
    <button type="button" data-act="bookmark">${t(state.prefs.lang, 'bookmarkTime')}</button>
    <button type="button" data-act="view-back">${t(state.prefs.lang, 'back')}</button>
  </div>
</footer>
<div id="boot">${t(state.prefs.lang, 'loading')}</div>
<div class="status" id="status"></div>
<div class="minimap" id="minimap"><canvas id="mini" width="120" height="120"></canvas></div>
<div class="welcome" id="welcome"></div>
<div class="hint" id="hint" hidden></div>
<div class="rel-warn" id="rel-warn" hidden></div>
<div class="tour-bar" id="tour" hidden></div>
<div class="photo-bar" id="photo-bar" hidden></div>
<button type="button" class="btn primary dfree-restore" id="show-ui" hidden>${t(state.prefs.lang, 'showUi')}</button>
<div id="overlay-root"></div>
<div class="sr-only" aria-live="polite" id="live"></div>`
}

function bind(root: HTMLElement): void {
  root.querySelectorAll('[data-mode]').forEach((b) => {
    b.addEventListener('click', () => {
      state.mode = (b as HTMLElement).dataset.mode as typeof state.mode
      if (state.mode === 'learn') openLearn()
      else if (state.mode === 'tools') openTools()
      else {
        if (state.tool === 'activities' || state.tool === 'hub') enterTool('none', eng)
        else notify()
      }
    })
  })
  root.addEventListener('click', (ev) => {
    const tbtn = (ev.target as HTMLElement).closest('[data-act]') as HTMLElement | null
    if (!tbtn) return
    runAction(tbtn.dataset.act ?? '', eng)
  })
  root.addEventListener('click', (ev) => {
    const s = (ev.target as HTMLElement).closest('[data-step]') as HTMLElement | null
    if (!s) return
    stepSim(clock, Number(s.dataset.step) * clock.direction)
    notify('clock')
  })
  root.addEventListener('click', (ev) => {
    const r = (ev.target as HTMLElement).closest('[data-rate]') as HTMLElement | null
    if (!r) return
    setRate(clock, Number(r.dataset.rate))
    clock.playing = true
    notify('clock')
  })
  const rateNum = root.querySelector('#rate-num') as HTMLInputElement | null
  rateNum?.addEventListener('change', () => {
    const parsed = Number(String(rateNum.value).replace(',', '.'))
    if (!Number.isFinite(parsed)) {
      state.lastError = 'nonfinite'
      notify('clock')
      return
    }
    const err = setRate(clock, parsed)
    if (err) state.lastError = err
    else clock.playing = parsed !== 0
    notify('clock')
  })
  const q = root.querySelector('#q') as HTMLInputElement
  q.addEventListener('input', () => renderSearch(root, q.value))
  q.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      q.value = ''
      renderSearch(root, '')
      q.blur()
    }
    if (e.key === 'Enter') {
      const first = root.querySelector('#q-res button') as HTMLButtonElement | null
      first?.click()
    }
  })
  const rate = root.querySelector('#rate') as HTMLInputElement
  rate.addEventListener('input', () => {
    const mag = logRate(Number(rate.value))
    setRate(clock, mag)
    notify('rate')
  })
  const dateIn = root.querySelector('#date-in') as HTMLInputElement
  dateIn.addEventListener('change', () => {
    const ms = Date.parse(dateIn.value + 'Z')
    const err = setDateMs(clock, ms)
    if (err) state.lastError = err
    notify('clock')
  })
  document.addEventListener('keydown', (e) => onKey(e, eng, q))
  const canvas = root.querySelector('#scene-canvas') as HTMLCanvasElement
  canvas.addEventListener('sso-pick', (ev) => {
    const ids = (ev as CustomEvent).detail.ids as string[]
    if (!ids.length) return
    if (ids.length > 1) showDisamb(root, ids)
    else applySelect(ids[0])
  })
  const mini = root.querySelector('#mini') as HTMLCanvasElement
  mini.addEventListener('click', (ev) => {
    if (!eng) return
    const r = mini.getBoundingClientRect()
    const nx = (ev.clientX - r.left) / r.width - 0.5
    const ny = (ev.clientY - r.top) / r.height - 0.5
    eng.cameraRig.target.set(-ny * 80, nx * 80, 0)
    eng.cameraRig.spherical.radius = 60
    eng.cameraRig.followId = null
    state.cameraMode = 'overview-system'
    notify()
  })
}

function logRate(slider: number): number {
  if (Math.abs(slider) < 0.08) return 0
  const sign = slider < 0 ? -1 : 1
  const mag = Math.pow(10, Math.abs(slider))
  clock.direction = sign as 1 | -1
  return mag
}

function sliderFromRate(rate: number, dir: number): number {
  if (rate <= 0) return 0
  return dir * Math.log10(rate)
}

function applySelect(id: BodyId): void {
  selectBody(id, true)
  if (state.onboarding.hintStep === 0) state.onboarding.hintStep = 1
  announce(t(state.prefs.lang, 'selected') + ': ' + (getBody(id)?.names[state.prefs.lang] ?? id))
  savePersisted()
  notify('select')
}

function enterTool(tool: ToolId, engine: Engine | null): void {
  if (state.tool === 'none' && tool !== 'none' && engine) {
    const s = engine.captureView()
    state.explorerSnap = { ...s, cameraMode: state.cameraMode }
  }
  if (tool === 'none' && state.explorerSnap && engine) {
    engine.restoreView(state.explorerSnap)
    state.cameraMode = state.explorerSnap.cameraMode
    state.explorerSnap = null
  }
  setTool(tool)
}

function runAction(act: string, engine: Engine | null): void {
  switch (act) {
    case 'play':
      togglePlay(clock)
      notify('clock')
      return
    case 'reverse':
      reverseDirection(clock)
      state.onboarding.checklist.reverse = true
      notify('clock')
      return
    case 'now':
      goToNow(clock)
      notify('clock')
      return
    case 'reset-sim':
      resetSimulation(clock)
      notify('clock')
      return
    case 'reset-view':
      engine?.resetView()
      notify('clock')
      return
    case 'one-orbit': {
      const b = getBody(state.selectedId ?? '')
      if (b?.siderealOrbitDays) stepSim(clock, Math.abs(b.siderealOrbitDays) * DAY_S)
      notify('clock')
      return
    }
    case 'welcome-ex':
      state.onboarding.dismissed = true
      savePersisted()
      notify('select')
      return
    case 'welcome-tour':
      state.onboarding.dismissed = true
      savePersisted()
      startTour('grand', engine)
      return
    case 'welcome-help':
      state.onboarding.dismissed = true
      state.onboarding.hintStep = 0
      savePersisted()
      enterTool('help', engine)
      return
    case 'settings':
      enterTool('settings', engine)
      return
    case 'help':
      enterTool('help', engine)
      return
    case 'command':
      enterTool('command', engine)
      return
    case 'dfree':
      state.prefs.distractionFree = true
      break
    case 'show-ui':
      state.prefs.distractionFree = false
      break
    case 'focus':
      if (state.selectedId) {
        engine?.focusBody(state.selectedId, wantsReducedMotion())
        state.cameraMode = 'free'
      }
      break
    case 'follow':
      if (state.selectedId && engine) {
        engine.cameraRig.followId = state.selectedId
        state.cameraMode = 'follow'
        if (getBody(state.selectedId)?.kind === 'moon') state.onboarding.checklist.moon = true
        engine.focusBody(state.selectedId, true)
      }
      break
    case 'free':
      if (engine) engine.cameraRig.followId = null
      state.cameraMode = 'free'
      break
    case 'moons':
      if (state.selectedId) {
        const kids = childrenOf(state.selectedId).filter((c) => c.kind === 'moon')
        if (kids[0] && engine) {
          engine.cameraRig.followId = state.selectedId
          engine.focusBody(state.selectedId)
          state.cameraMode = 'overview-parent'
        }
      }
      break
    case 'compare':
      if (state.selectedId && !state.compare.ids.includes(state.selectedId)) {
        state.compare.ids = [...state.compare.ids, state.selectedId].slice(0, 4)
      }
      state.onboarding.checklist.compare = true
      enterTool('compare', engine)
      return
    case 'measure':
      enterTool('measure', engine)
      return
    case 'favorite':
      if (state.selectedId) {
        if (state.favorites.includes(state.selectedId)) state.favorites = state.favorites.filter((x) => x !== state.selectedId)
        else state.favorites = [...state.favorites, state.selectedId]
        savePersisted()
      }
      break
    case 'capture':
      state.photo.prevPlaying = clock.playing
      if (state.photo.freeze) clock.playing = false
      enterTool('photo', engine)
      return
    case 'scale-toggle':
      state.prefs.scaleMode = state.prefs.scaleMode === 'exploration' ? 'relative' : 'exploration'
      state.onboarding.checklist.scale = true
      if (state.selectedId) engine?.focusBody(state.selectedId, wantsReducedMotion())
      break
    case 'labels-cycle': {
      const order = ['major', 'system', 'selected', 'favorites', 'none'] as const
      const i = order.indexOf(state.prefs.labels)
      state.prefs.labels = order[(i + 1) % order.length]
      break
    }
    case 'orbits-cycle': {
      const order = ['all', 'selected', 'system', 'none'] as const
      const i = order.indexOf(state.prefs.orbits)
      state.prefs.orbits = order[(i + 1) % order.length]
      break
    }
    case 'bookmark':
      state.bookmarks.unshift({
        id: crypto.randomUUID(),
        title: formatDateUtc(clock.simMs, lang()),
        simMs: clock.simMs,
        bodyId: state.selectedId,
      })
      savePersisted()
      break
    case 'view-back':
      if (state.explorerSnap && engine) {
        engine.restoreView(state.explorerSnap)
        state.cameraMode = state.explorerSnap.cameraMode
      } else engine?.resetView()
      break
    case 'save-view':
      if (engine && state.selectedId) {
        const s = engine.captureView()
        state.viewpoints.unshift({
          id: crypto.randomUUID(),
          title: getBody(state.selectedId)?.names[lang()] ?? state.selectedId,
          targetId: state.selectedId,
          radius: s.radius,
          phi: s.phi,
          theta: s.theta,
          scaleMode: state.prefs.scaleMode,
          restoreDate: false,
        })
        savePersisted()
      }
      break
    case 'pulse':
      state.lightPulse = !state.lightPulse
      break
    case 'panel-nav':
      state.panel = 'nav'
      break
    case 'panel-ins':
      state.panel = 'ins'
      break
    case 'top-down':
      if (engine) {
        engine.cameraRig.spherical.phi = 0.18
        engine.cameraRig.spherical.radius = 70
        state.cameraMode = 'overview-system'
      }
      break
    case 'tour-prev':
      if (state.tour) {
        state.tour.stopIndex = Math.max(0, state.tour.stopIndex - 1)
        goTourStop(engine)
      }
      break
    case 'tour-next': {
      if (!state.tour) break
      const tour = TOURS.find((x) => x.id === state.tour!.tourId)
      if (!tour) break
      if (state.tour.stopIndex >= tour.stops.length - 1) {
        exitTour()
        return
      }
      state.tour.stopIndex += 1
      goTourStop(engine)
      break
    }
    case 'tour-pause':
      if (state.tour) state.tour.paused = !state.tour.paused
      break
    case 'tour-exit':
      exitTour()
      return
    default:
      if (act.startsWith('tool:')) {
        const tool = act.slice(5) as ToolId
        enterTool(tool, engine)
        return
      }
      if (act.startsWith('tour:')) {
        startTour(act.slice(5), engine)
        return
      }
      if (act.startsWith('select:')) {
        applySelect(act.slice(7))
        return
      }
      if (act.startsWith('ins:')) {
        state.inspectorTab = act.slice(4) as typeof state.inspectorTab
      }
      if (act.startsWith('labview:')) {
        state.labView = act.slice(8) as typeof state.labView
      }
      if (act.startsWith('act:')) {
        const id = act.slice(4)
        const a = ACTIVITIES.find((x) => x.id === id)
        if (a) {
          applySelect(a.startId)
          state.activityId = id
        }
        return
      }
      if (act.startsWith('actcheck:')) {
        const id = act.slice(9)
        const a = ACTIVITIES.find((x) => x.id === id)
        const host = document.querySelector('#overlay-root')
        if (a && host) {
          const ok = a.check({
            selectedId: state.selectedId,
            compare: state.compare.ids,
            scaleMode: state.prefs.scaleMode,
            playing: clock.playing,
            direction: clock.direction,
            tool: state.tool,
          })
          const p = host.querySelector('#act-' + id)
          if (p) p.textContent = ok ? a.explain[lang()] : a.hint[lang()]
        }
        return
      }
  }
  notify()
}

function lang(): typeof state.prefs.lang {
  return state.prefs.lang
}

function openLearn(): void {
  enterTool('activities', eng)
}

function openTools(): void {
  enterTool('hub', eng)
}

function startTour(id: string, engine: Engine | null): void {
  const tour = TOURS.find((x) => x.id === id)
  if (!tour) return
  state.tour = {
    tourId: id,
    stopIndex: 0,
    paused: false,
    auto: false,
    saved: {
      scaleMode: state.prefs.scaleMode,
      labelMode: state.prefs.labels,
      orbitVis: state.prefs.orbits,
      rate: clock.rate,
      playing: clock.playing,
    },
  }
  goTourStop(engine)
  setTool('tour')
}

function goTourStop(engine: Engine | null): void {
  const tr = state.tour
  if (!tr) return
  const tour = TOURS.find((x) => x.id === tr.tourId)
  const stop = tour?.stops[tr.stopIndex]
  if (!stop) return
  applySelect(stop.targetId)
  engine?.focusBody(stop.targetId, wantsReducedMotion())
}

function onKey(e: KeyboardEvent, engine: Engine | null, q: HTMLInputElement): void {
  const tag = (e.target as HTMLElement)?.tagName
  const typing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable
  if (e.key === 'Escape') {
    if (state.tool !== 'none' && state.tool !== 'tour') {
      if (state.tour) setTool('tour')
      else setTool('none')
      notify()
      return
    }
    if (popLayer()) return
    if (state.tour) exitTour()
    return
  }
  if (typing) return
  if (e.key === ' ' ) {
    e.preventDefault()
    togglePlay(clock)
    notify()
  }
  if (e.key === 'r' || e.key === 'R') engine?.resetView()
  if (e.key === 'o' || e.key === 'O') runAction('orbits-cycle', engine)
  if (e.key === 'l' || e.key === 'L') runAction('labels-cycle', engine)
  if (e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) {
    e.preventDefault()
    q.focus()
  }
  if (e.key === 'f' && state.selectedId) runAction('follow', engine)
  if (e.key === 'c' && state.selectedId) runAction('compare', engine)
  if (e.key === 'p') runAction('capture', engine)
  if (e.key === 'ArrowLeft') { engine?.cameraRig && (engine.cameraRig.spherical.theta += 0.08); e.preventDefault() }
  if (e.key === 'ArrowRight') { engine?.cameraRig && (engine.cameraRig.spherical.theta -= 0.08); e.preventDefault() }
  if (e.key === 'ArrowUp') { engine?.cameraRig && (engine.cameraRig.spherical.radius *= 0.92); e.preventDefault() }
  if (e.key === 'ArrowDown') { engine?.cameraRig && (engine.cameraRig.spherical.radius *= 1.08); e.preventDefault() }
  if (e.repeat && (e.key === 'p' || e.key === 's')) e.preventDefault()
}

function exitTour(): void {
  const saved = state.tour?.saved
  if (saved) {
    state.prefs.scaleMode = saved.scaleMode
    state.prefs.labels = saved.labelMode
    state.prefs.orbits = saved.orbitVis
    clock.rate = saved.rate
    clock.playing = saved.playing
  }
  state.tour = null
  setTool('none')
  notify()
}

function refresh(root: HTMLElement, hint = 'ui'): void {
  const L = lang()
  document.documentElement.lang = L === 'pt-BR' ? 'pt-BR' : 'en'
  root.classList.toggle('dfree', state.prefs.distractionFree)
  root.classList.toggle('photo', state.tool === 'photo')
  const photoBar = root.querySelector('#photo-bar') as HTMLElement | null
  if (photoBar) photoBar.hidden = state.tool !== 'photo'
  root.classList.toggle('guides-on', state.tool === 'photo' && state.photo.guides)
  root.classList.toggle('hc', state.prefs.highContrast)
  root.classList.toggle('panel-ins', state.panel === 'ins')
  root.classList.toggle('panel-nav', state.panel === 'nav')
  root.classList.toggle('has-sel', Boolean(state.selectedId))
  const showUi = root.querySelector('#show-ui') as HTMLButtonElement
  showUi.hidden = !state.prefs.distractionFree
  const tabs = root.querySelectorAll('[data-mode]')
  tabs.forEach((b) => b.setAttribute('aria-selected', b.getAttribute('data-mode') === state.mode ? 'true' : 'false'))
  renderNav(root)
  renderIns(root)
  renderWelcome(root)
  renderHint(root)
  renderTour(root)
  renderOverlay(root)
  if (hint === 'boot' || hint === 'tool' || hint === 'i18n') renderPhotoBar(root)
  updateLive(root)
  drawMini(root)
}

function renderNav(root: HTMLElement): void {
  const nav = root.querySelector('#nav')!
  const L = lang()
  const y = nav.scrollTop
  const groups = groupNavigator()
  nav.innerHTML = `<h2>${t(L, 'navigator')}</h2>
    <button type="button" class="btn" data-act="panel-ins">${t(L, 'inspector')}</button>` + groups.map((g) => {
    const items = g.ids.map((id) => {
      const b = getBody(id)!
      const cur = state.selectedId === id ? 'true' : 'false'
      const vis = b.simClass === 'full' ? t(L, 'fullSim') : b.simClass === 'schematic' ? t(L, 'schematic') : t(L, 'infoOnly')
      return `<button class="item" data-act="select:${id}" ${cur === 'true' ? 'aria-current="true"' : ''}><span>${b.names[L]}</span><span class="meta">${kindLabel(L, b.kind)} · ${vis}</span></button>`
    }).join('')
    return `<details class="group" open><summary>${t(L, GROUPS[g.id])}</summary>${items}</details>`
  }).join('')
  nav.scrollTop = y
}

function renderIns(root: HTMLElement): void {
  const ins = root.querySelector('#ins')!
  const L = lang()
  const b = getBody(state.selectedId ?? '')
  if (!b) {
    ins.innerHTML = `<h2>${t(L, 'inspector')}</h2><p class="muted">${t(L, 'welcomeBody')}</p>
      <button type="button" class="btn" data-act="panel-nav">${t(L, 'navigator')}</button>`
    return
  }
  const kids = childrenOf(b.id).filter((c) => c.kind === 'moon')
  const tab = state.inspectorTab
  const overview = `<p>${b.overview[L]}</p>
    <div class="row">
      <button class="btn primary" data-act="focus">${t(L, 'focus')}</button>
      <button class="btn" data-act="follow">${t(L, 'follow')}</button>
      <button class="btn" data-act="free">${t(L, 'freeCam')}</button>
      ${kids.length ? `<button class="btn" data-act="moons">${t(L, 'exploreMoons')}</button>` : ''}
      <button class="btn" data-act="compare">${t(L, 'compare')}</button>
      <button class="btn" data-act="measure">${t(L, 'measure')}</button>
      <button class="btn" data-act="favorite">${t(L, 'favorite')}</button>
      <button class="btn" data-act="capture">${t(L, 'capture')}</button>
      <button class="btn" data-act="save-view">${t(L, 'saveViewpoint')}</button>
    </div>
    <ul>${b.facts[L].map((f) => `<li>${f}</li>`).join('')}</ul>`
  const data = `<dl class="kv" id="kv">${dataRows(b)}</dl><p class="muted" id="sidereal-help">${t(L, 'siderealHelp')}</p>
    ${b.id === 'earth' ? `<p class="muted">${t(L, 'nightLights')}</p>` : ''}
    ${b.id === 'venus' ? `<p class="muted">${t(L, 'radarVenus')}</p>` : ''}
    ${b.id === 'edu-comet' ? `<p class="muted">${t(L, 'cometActivity')}</p>` : ''}`
  const moons = (kids.length || b.knownMoons != null)
    ? `<p>${t(L, 'renderedMoons')}: ${b.renderedMoons}${b.knownMoons != null ? ` · ${t(L, 'knownMoons')}: ${b.knownMoons} (${b.knownMoonsAsOf})` : ''}</p>
      ${kids.map((k) => `<button class="item" data-act="select:${k.id}">${k.names[L]}</button>`).join('')}`
    : `<p class="muted">${t(L, 'na')}</p>`
  const sources = `<ul class="muted">${b.sources.map((s) => `<li>${s.field}: ${s.ref}</li>`).join('')}</ul>`
  ins.innerHTML = `
    <div class="row">
      <button type="button" class="btn" data-act="panel-nav">${t(L, 'navigator')}</button>
    </div>
    <h2>${b.names[L]} <span class="badge">${kindLabel(L, b.kind)}</span></h2>
    <div class="ins-tabs" role="tablist">
      <button type="button" data-act="ins:overview" aria-selected="${tab==='overview'}">${t(L, 'overview')}</button>
      <button type="button" data-act="ins:data" aria-selected="${tab==='data'}">${t(L, 'data')}</button>
      ${b.kind !== 'star' && b.kind !== 'region' ? `<button type="button" data-act="ins:moons" aria-selected="${tab==='moons'}">${t(L, 'moons')}</button>` : ''}
      <button type="button" data-act="ins:sources" aria-selected="${tab==='sources'}">${t(L, 'sources')}</button>
    </div>
    ${tab === 'overview' ? overview : tab === 'data' ? data : tab === 'moons' ? moons : sources}`
}

function dataRows(b: ReturnType<typeof getBody> & object): string {
  const L = lang()
  const rows: [string, string][] = []
  const d = b ? diameterKm(b) : null
  if (b && d != null) rows.push([t(L, 'diameter'), formatKm(d, L)])
  if (b && b.massKg != null) rows.push([t(L, 'mass'), formatMassKg(b.massKg, L)])
  else if (b && b.kind !== 'region') rows.push([t(L, 'mass'), t(L, 'unavailable')])
  if (b && b.densityGCm3 != null) rows.push([t(L, 'density'), `${b.densityGCm3} g/cm³`])
  if (b && b.gravityMs2 != null) rows.push([`${t(L, 'gravity')} (${b.gravityDefinition})`, `${b.gravityMs2} m/s²`])
  if (b && b.siderealOrbitDays != null) rows.push([t(L, 'orbitPeriod'), formatDays(b.siderealOrbitDays, L)])
  if (b && b.siderealRotationDays != null) rows.push([t(L, 'rotPeriod'), formatDays(b.siderealRotationDays, L)])
  if (b && b.solarDayDays != null) rows.push([t(L, 'solarDay'), formatDays(b.solarDayDays, L)])
  if (b && b.axialTiltDeg != null) rows.push([t(L, 'tilt'), `${b.axialTiltDeg}°`])
  if (b && b.eccentricity != null) rows.push([t(L, 'ecc'), String(b.eccentricity)])
  if (b && b.semiMajorAxisKm != null) rows.push([t(L, 'sma'), `${formatKm(b.semiMajorAxisKm, L)} (${formatAu(b.semiMajorAxisKm / AU_KM, L)})`])
  if (b && b.temperature) rows.push([t(L, 'temp'), b.temperature.note + (b.temperature.meanK ? ` · ${b.temperature.meanK} K` : '')])
  if (b && b.id === 'sun') {
    /* no year around itself */
  }
  rows.push(['live', '…'])
  return rows.map((r, i) => `<dt>${r[0]}</dt><dd${i === rows.length - 1 ? ' data-live="1"' : ''}>${r[1]}</dd>`).join('')
}

function renderWelcome(root: HTMLElement): void {
  const el = root.querySelector('#welcome') as HTMLElement
  if (state.onboarding.dismissed) {
    el.hidden = true
    el.innerHTML = ''
    delete el.dataset.ready
    return
  }
  const L = lang()
  el.hidden = false
  el.innerHTML = `<h2>${t(L, 'welcomeTitle')}</h2><p>${t(L, 'welcomeBody')}</p>
    <div class="row">
      <button type="button" class="btn primary" data-act="welcome-ex">${t(L, 'exploreFree')}</button>
      <button type="button" class="btn" data-act="welcome-tour">${t(L, 'startTour')}</button>
      <button type="button" class="btn" data-act="welcome-help">${t(L, 'learnControls')}</button>
    </div>
    <ul class="checklist">${['checkPlanet','checkMoon','checkReverse','checkCompare','checkScale'].map((k, i) => {
      const keys = ['planet','moon','reverse','compare','scale'] as const
      return `<li data-done="${state.onboarding.checklist[keys[i]]}">${t(L, k as MsgKey)}</li>`
    }).join('')}</ul>`
}

function renderHint(root: HTMLElement): void {
  const el = root.querySelector('#hint') as HTMLElement
  if (state.onboarding.hintStep > 2) {
    el.hidden = true
    return
  }
  const L = lang()
  const touch = navigator.maxTouchPoints > 0
  const msgs = [touch ? t(L, 'hintTouch') : t(L, 'hintOrbit'), t(L, 'hintSelect'), t(L, 'hintTime')]
  el.textContent = msgs[Math.min(state.onboarding.hintStep, 2)]
  el.hidden = false
}

function renderTour(root: HTMLElement): void {
  const el = root.querySelector('#tour') as HTMLElement
  if (!state.tour) {
    el.hidden = true
    return
  }
  const L = lang()
  const tour = TOURS.find((x) => x.id === state.tour!.tourId)!
  const stop = tour.stops[state.tour.stopIndex]
  const pct = ((state.tour.stopIndex + 1) / tour.stops.length) * 100
  el.hidden = false
  el.innerHTML = `<strong>${tour.title[L]}</strong> · ${state.tour.stopIndex + 1}/${tour.stops.length}
    <div class="progress"><span style="width:${pct}%"></span></div>
    <h3>${stop.title[L]}</h3><p>${stop.body[L]}</p>
    <div class="row">
      <button type="button" class="btn" data-act="tour-prev">${t(L, 'prev')}</button>
      <button type="button" class="btn" data-act="tour-pause">${state.tour.paused ? t(L, 'resume') : t(L, 'pause')}</button>
      <button type="button" class="btn" data-act="tour-next">${t(L, 'next')}</button>
      <button type="button" class="btn" data-act="tour-exit">${t(L, 'exit')}</button>
    </div>`
}

function renderPhotoBar(root: HTMLElement): void {
  const el = root.querySelector('#photo-bar') as HTMLElement
  const L = lang()
  el.innerHTML = `
    <label>${t(L, 'fov')} <input id="fov" type="range" min="20" max="90" value="${state.photo.fov}"></label>
    <label>${t(L, 'exposure')} <input id="exp" type="range" min="0.4" max="2.2" step="0.05" value="${state.photo.exposure}"></label>
    <button type="button" class="btn" data-photo="labels">${t(L, 'labels')}</button>
    <button type="button" class="btn" data-photo="orbits">${t(L, 'orbits')}</button>
    <button type="button" class="btn" data-photo="guides">guides</button>
    <button type="button" class="btn primary" id="shot">${t(L, 'saveShot')}</button>
    <button type="button" class="btn" data-act="tool:none">${t(L, 'photoExit')}</button>
    <p class="muted">${t(L, 'videoUnsupported')}</p>`
  el.querySelector('#fov')?.addEventListener('input', (e) => { state.photo.fov = Number((e.target as HTMLInputElement).value) })
  el.querySelector('#exp')?.addEventListener('input', (e) => { state.photo.exposure = Number((e.target as HTMLInputElement).value) })
  el.querySelectorAll('[data-photo]').forEach((b) => b.addEventListener('click', () => {
    const k = (b as HTMLElement).dataset.photo
    if (k === 'labels') state.photo.labels = !state.photo.labels
    if (k === 'orbits') state.photo.orbits = !state.photo.orbits
    if (k === 'guides') state.photo.guides = !state.photo.guides
    root.classList.toggle('guides-on', state.photo.guides)
  }))
  el.querySelector('#shot')?.addEventListener('click', () => {
    const url = eng?.capturePng()
    if (!url) { state.lastError = 'capture'; return }
    const a = document.createElement('a')
    a.href = url
    a.download = `sso-${state.selectedId ?? 'scene'}.png`
    a.click()
  })
}

function renderOverlay(root: HTMLElement): void {
  const host = root.querySelector('#overlay-root')!
  const tool = state.tool
  if (tool === 'none' || tool === 'photo' || tool === 'tour') {
    host.innerHTML = ''
    return
  }
  const L = lang()
  const body = overlayBody(tool, L)
  host.innerHTML = `<div class="backdrop" data-act="tool:none"></div><section class="sheet" role="dialog" aria-modal="true"><div class="row"><h2>${overlayTitle(tool, L)}</h2><button class="btn" data-act="tool:none">${t(L, 'close')}</button></div>${body}</section>`
  wireOverlay(host)
}

function overlayTitle(tool: ToolId, L: typeof state.prefs.lang): string {
  const map: Partial<Record<ToolId, MsgKey>> = {
    compare: 'compare', measure: 'measure', settings: 'settings', help: 'help', encyclopedia: 'encyclopedia',
    missions: 'missions', activities: 'activities', journal: 'journal', share: 'share', command: 'command',
    'scale-lab': 'sizes', 'seasons-lab': 'tilt', 'moon-lab': 'phase', 'orbit-lab': 'gravity', outer: 'returnPlanets',
    hub: 'tools',
  }
  return t(L, map[tool] ?? 'tools')
}

function overlayBody(tool: ToolId, L: typeof state.prefs.lang): string {
  if (tool === 'hub') {
    return `<p class="muted">${t(L, 'tools')}</p>
    <div class="row">
      <button type="button" class="btn" data-act="tool:compare">${t(L, 'compare')}</button>
      <button type="button" class="btn" data-act="tool:measure">${t(L, 'measure')}</button>
      <button type="button" class="btn" data-act="tool:scale-lab">${t(L, 'sizes')}</button>
      <button type="button" class="btn" data-act="tool:seasons-lab">${t(L, 'tilt')}</button>
      <button type="button" class="btn" data-act="tool:moon-lab">${t(L, 'phase')}</button>
      <button type="button" class="btn" data-act="tool:orbit-lab">${t(L, 'gravity')}</button>
      <button type="button" class="btn" data-act="tool:outer">${t(L, 'returnPlanets')}</button>
      <button type="button" class="btn" data-act="tool:encyclopedia">${t(L, 'encyclopedia')}</button>
      <button type="button" class="btn" data-act="tool:missions">${t(L, 'missions')}</button>
      <button type="button" class="btn" data-act="tool:journal">${t(L, 'journal')}</button>
      <button type="button" class="btn" data-act="tool:share">${t(L, 'share')}</button>
      <button type="button" class="btn" data-act="top-down">${t(L, 'topDown')}</button>
    </div>`
  }
  if (tool === 'help') {
    return `<p>${t(L, 'spacePause')}</p><p>${t(L, 'keyR')}</p><p>${t(L, 'keyO')}</p><p>${t(L, 'keyL')}</p><p>${t(L, 'keyEsc')}</p>
      <button class="btn" id="restart-tut">${t(L, 'restartTutorial')}</button>
      <p class="muted">${t(L, 'presentationNote')}</p>`
  }
  if (tool === 'settings') {
    return `<label>${t(L, 'language')}
      <select id="lang"><option value="pt-BR" ${L==='pt-BR'?'selected':''}>Português (Brasil)</option><option value="en" ${L==='en'?'selected':''}>English</option></select></label>
      <p><button class="btn" data-pres="natural">${t(L, 'natural')}</button> <button class="btn" data-pres="enhanced">${t(L, 'enhanced')}</button></p>
      <p class="muted">${t(L, 'presentationNote')}</p>
      <p>${t(L, 'quality')}:
        ${['cinematic','classroom','study','low-power'].map((q) => `<button class="btn" data-qual="${q}">${t(L, q as MsgKey)}</button>`).join(' ')}</p>
      <label>${t(L, 'bgIntensity')} <input id="bg" type="range" min="0" max="1" step="0.05" value="${state.prefs.backgroundIntensity}"></label>
      <p><label><input id="clean" type="checkbox" ${state.prefs.cleanBackground?'checked':''}> ${t(L, 'cleanBg')}</label></p>
      <p><label><input id="hc" type="checkbox" ${state.prefs.highContrast?'checked':''}> ${t(L, 'highContrast')}</label></p>
      <p><label><input id="sound" type="checkbox" ${state.prefs.soundMaster?'checked':''}> ${t(L, 'sound')}</label></p>
      <p><label>${t(L, 'illumination')} <input id="fill" type="range" min="0" max="0.4" step="0.01" value="${state.prefs.illuminationBoost}"></label></p>
      <p class="muted">${t(L, 'fillNote')}</p>
      <p><button class="btn" data-act="scale-toggle">${t(L, 'scaleBadge')}</button>
         <button class="btn" data-act="labels-cycle">${t(L, 'labels')}</button>
         <button class="btn" data-act="orbits-cycle">${t(L, 'orbits')}</button></p>
      <p><button class="btn" id="export">${t(L, 'exportData')}</button>
         <label class="btn">${t(L, 'importData')}<input id="import" type="file" accept="application/json" hidden></label>
         <button class="btn caution" id="clear">${t(L, 'clearLocal')}</button></p>
      <p class="muted">${t(L, 'speechUnsupported')}</p>`
  }
  if (tool === 'compare') return compareHtml(L)
  if (tool === 'measure') return measureHtml(L)
  if (tool === 'encyclopedia') return ARTICLES.map((a) => `<details><summary>${a.title[L]}</summary><p>${a.short[L]}</p><p>${a.long[L]}</p>${a.link?.tool ? `<button class="btn" data-act="tool:${a.link.tool}">→</button>` : ''}</details>`).join('')
  if (tool === 'missions') return MISSIONS.map((m) => `<article><h3>${m.name}</h3><p class="muted">${m.agency} · ${m.type} · ${m.launch}${m.encounter ? ' · ' + m.encounter : ''}</p><p>${m.blurb[L]}</p><p class="muted">${m.source} · ${m.schematic ? t(L, 'illustrative') : ''}</p><button class="btn" data-act="select:${m.targets[0]}">${t(L, 'focus')}</button></article>`).join('')
  if (tool === 'activities') return ACTIVITIES.map((a) => `<article><h3>${a.title[L]}</h3><p>${a.objective[L]}</p><p class="muted">${a.hint[L]}</p>
      <button type="button" class="btn" data-act="act:${a.id}">${t(L, 'run')}</button>
      <button type="button" class="btn" data-act="actcheck:${a.id}">${t(L, 'ok')}</button>
      <p id="act-${a.id}"></p></article>`).join('') + `<hr/><h3>${t(L, 'tours')}</h3>` + TOURS.map((tr) => `<button class="btn" data-act="tour:${tr.id}">${tr.title[L]}</button>`).join(' ')
  if (tool === 'journal') return journalHtml(L)
  if (tool === 'share') return `<p>${t(L, 'shareHint')}</p><textarea id="share-txt" rows="8" readonly></textarea><button class="btn" id="copy-share">${t(L, 'copy')}</button>`
  if (tool === 'command') return ['focus Saturn|select:saturn','pause|play','compare|compare','labels|labels-cycle','tour|tour:grand'].map((s) => {
    const [lab, a] = s.split('|')
    return `<button class="item" data-act="${a}">${lab}</button>`
  }).join('')
  if (tool === 'scale-lab') return scaleLabHtml(L)
  if (tool === 'seasons-lab') return `<p class="muted">${t(L, 'hypothetical')}</p><canvas class="lab-canvas" id="labc"></canvas><label>${t(L, 'tilt')} <input id="tilt" type="range" min="0" max="90" value="23.44" step="0.1"></label><p id="lab-out"></p>`
  if (tool === 'moon-lab') return `<p>${t(L, 'notEclipse')}</p><canvas class="lab-canvas" id="labc"></canvas><input id="phase" type="range" min="0" max="1" step="0.01" value="0.25">`
  if (tool === 'orbit-lab') return orbitLabHtml(L)
  if (tool === 'outer') return outerHtml(L)
  return `<p class="muted">${t(L, 'tools')}</p>
    <div class="row">
      <button class="btn" data-act="tool:scale-lab">${t(L, 'sizes')}</button>
      <button class="btn" data-act="tool:seasons-lab">${t(L, 'tilt')}</button>
      <button class="btn" data-act="tool:moon-lab">${t(L, 'phase')}</button>
      <button class="btn" data-act="tool:orbit-lab">${t(L, 'gravity')}</button>
      <button class="btn" data-act="tool:outer">${t(L, 'returnPlanets')}</button>
      <button class="btn" data-act="tool:encyclopedia">${t(L, 'encyclopedia')}</button>
      <button class="btn" data-act="tool:missions">${t(L, 'missions')}</button>
      <button class="btn" data-act="tool:journal">${t(L, 'journal')}</button>
    </div>`
}

function compareHtml(L: typeof state.prefs.lang): string {
  const ids = state.compare.ids.length ? state.compare.ids : ['earth', 'mars']
  state.compare.ids = ids
  const fields: [MsgKey, (b: NonNullable<ReturnType<typeof getBody>>) => string][] = [
    ['diameter', (b) => { const d = diameterKm(b); return d == null ? t(L, 'na') : formatKm(d, L) }],
    ['mass', (b) => b.massKg == null ? t(L, 'na') : formatMassKg(b.massKg, L)],
    ['gravity', (b) => b.gravityMs2 == null ? t(L, 'na') : `${b.gravityMs2} m/s²`],
    ['density', (b) => b.densityGCm3 == null ? t(L, 'na') : `${b.densityGCm3}`],
    ['orbitPeriod', (b) => b.siderealOrbitDays == null ? t(L, 'na') : formatDays(b.siderealOrbitDays, L)],
    ['rotPeriod', (b) => b.siderealRotationDays == null ? t(L, 'na') : formatDays(b.siderealRotationDays, L)],
    ['temp', (b) => b.temperature?.meanK ? `${b.temperature.meanK} K` : t(L, 'na')],
  ]
  const ref = getBody(state.compare.referenceId) ?? getBody('earth')!
  const head = `<tr><th></th>${ids.map((id) => `<th>${getBody(id)?.names[L]}</th>`).join('')}</tr>`
  const body = fields.map(([k, fn]) => `<tr><th>${t(L, k)}</th>${ids.map((id) => {
    const b = getBody(id)!
    const extra = k === 'diameter' && diameterKm(b) && diameterKm(ref) ? ` (${(diameterKm(b)! / diameterKm(ref)!).toFixed(2)}×)` : ''
    return `<td>${fn(b)}${extra}</td>`
  }).join('')}</tr>`).join('')
  const maxD = Math.max(...ids.map((id) => diameterKm(getBody(id)!) ?? 1))
  const vis = ids.map((id) => {
    const d = diameterKm(getBody(id)!) ?? 1
    const w = (d / maxD) * 160
    return `<div style="display:inline-block;margin:8px;text-align:center"><div style="width:${w}px;height:${w}px;border-radius:50%;background:#5ec8e8;margin:auto"></div>${getBody(id)?.names[L]}</div>`
  }).join('')
  return `${vis}<table class="table">${head}${body}</table>
    <p class="muted">${t(L, 'diameter')} linear — ${t(L, 'approx')}</p>
    <div class="row">${['earth','mars','venus','jupiter','saturn','moon','pluto','charon'].map((id) => `<button type="button" class="btn" data-add="${id}">${getBody(id)?.names[L]}</button>`).join('')}</div>`
}

function measureHtml(L: typeof state.prefs.lang): string {
  const a = state.measure?.a ?? 'earth'
  const b = state.measure?.b ?? 'sun'
  if (!state.measure) state.measure = { id: 'm1', a, b, live: true }
  const km = distanceKm(state.measure.a, state.measure.b, clock.simMs)
  const lt = km / C_KMS
  const ang = angularSeparationDeg('earth', state.measure.a, state.measure.b, clock.simMs)
  return `<p>${getBody(a)?.names[L]} → ${getBody(b)?.names[L]}</p>
    <p>${formatKm(km, L)} · ${formatAu(km / AU_KM, L)}</p>
    <p>${t(L, 'lightTime')}: ${formatLightTime(lt, L)}</p>
    <p class="muted">${t(L, 'scaleWarn')}</p>
    ${ang != null ? `<p>θ ⊕: ${ang.toFixed(3)}°</p>` : ''}
    <label><input id="live-m" type="checkbox" ${state.measure.live ? 'checked' : ''}> ${t(L, 'live')}</label>
    <p class="muted">${t(L, 'frozen')} ${t(L, 'scaleWarn')}</p>
    <div class="row">
      <button type="button" class="btn" id="m-swap">${t(L, 'swap')}</button>
      <button type="button" class="btn" data-act="pulse">${t(L, 'lightTime')}</button>
      <button type="button" class="btn" data-act="select:${a}">A</button>
      <button type="button" class="btn" data-act="select:${b}">B</button>
    </div>`
}

function journalHtml(L: typeof state.prefs.lang): string {
  const list = state.journal.map((j) => `<li><strong>${j.title}</strong> — ${formatDateUtc(j.simMs, L)}<p>${j.body}</p></li>`).join('') || `<p class="muted">—</p>`
  return `<input id="j-title" placeholder="${t(L, 'note')}" /><textarea id="j-body" rows="4"></textarea>
    <button class="btn primary" id="j-save">${t(L, 'ok')}</button>
    <ul>${list}</ul>`
}

function scaleLabHtml(L: typeof state.prefs.lang): string {
  const view = state.labView
  const ids = ['sun','mercury','venus','earth','mars','jupiter','saturn','uranus','neptune']
  const bodies = ids.map((id) => getBody(id)!).filter((b) => view === 'sizes' && state.experiment?.includeSun === false ? b.id !== 'sun' : true)
  const earthD = diameterKm(getBody('earth')!)!
  const max = Math.max(...bodies.map((b) => diameterKm(b) ?? 1))
  const sizeRows = bodies.map((b) => {
    const d = diameterKm(b)
    if (d == null) return ''
    const w = Math.max(4, (d / max) * 280)
    return `<div>${b.names[L]} <span style="display:inline-block;height:10px;width:${w}px;background:#5ec8e8;vertical-align:middle"></span> ${(d / earthD).toFixed(2)} ⊕</div>`
  }).join('')
  const distIds = ['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune']
  const log = Boolean(state.experiment?.logAxis)
  const distRows = distIds.map((id) => {
    const b = getBody(id)!
    const au = (b.semiMajorAxisKm ?? 0) / AU_KM
    const span = log ? Math.log10(1 + au) / Math.log10(31) : au / 30
    return `<div>${b.names[L]} ${au.toFixed(2)} ua <span style="display:inline-block;height:8px;width:${Math.max(4, span * 280)}px;background:${log ? '#e8b86d' : '#5ec8e8'};vertical-align:middle"></span></div>`
  }).join('')
  return `<p class="muted">${t(L, 'hypothetical')}</p>
    <div class="row">
      <button type="button" class="btn" data-act="labview:sizes">${t(L, 'sizes')}</button>
      <button type="button" class="btn" data-act="labview:distances">${t(L, 'distances')}</button>
      <button type="button" class="btn" data-act="labview:combined">${t(L, 'combined')}</button>
    </div>
    <p>${view === 'sizes' ? SCALE_EXPLAIN.relative.sizes : view === 'distances' ? (log ? t(L, 'logAxis') : t(L, 'linAxis')) + ' — ' + SCALE_EXPLAIN.relative.distances : t(L, 'scaleWarn')}</p>
    ${view === 'sizes' ? sizeRows : view === 'distances' ? distRows : `<p>${t(L, 'combined')}: raios e distâncias na mesma escala física. A maior parte da cena fica vazia.</p>
      <p>Terra ${earthD.toFixed(0)} km · 1 ua = ${(AU_KM / earthD).toFixed(0)} diâmetros terrestres.</p>`}
    <canvas class="lab-canvas" id="labc"></canvas>
    <label>${t(L, 'ifEarth')} (cm) <input id="earth-cm" type="number" value="12" min="0.1" /></label>
    <p id="if-out"></p>
    <p><label><input id="inc-sun" type="checkbox" ${state.experiment?.includeSun !== false ? 'checked' : ''}> ${t(L, 'includeSun')}</label>
       <label><input id="log-ax" type="checkbox" ${log ? 'checked' : ''}> ${t(L, 'logAxis')}</label></p>
    <button type="button" class="btn" id="o-reset">${t(L, 'labReset')}</button>
    <button type="button" class="btn" data-act="tool:none">${t(L, 'returnView')}</button>`
}

function orbitLabHtml(L: typeof state.prefs.lang): string {
  return `<p class="muted">${t(L, 'hypothetical')}</p>
    <label>M (kg) <input id="om" type="number" value="1.989e30" /></label>
    <label>a (m) <input id="oa" type="number" value="1.496e11" /></label>
    <label>e <input id="oe" type="number" value="0.0167" min="0" max="0.99" step="0.001" /></label>
    <canvas class="lab-canvas" id="labc"></canvas>
    <p id="lab-out"></p>
    <button class="btn" id="o-reset">${t(L, 'labReset')}</button>`
}

function outerHtml(L: typeof state.prefs.lang): string {
  return `<ol>
      <li>Planetas: até ~30 ua (Netuno)</li>
      <li>${t(L, 'groupDwarfs')} / Kuiper: ~30–50 ua</li>
      <li>Heliopausa ~80–100 ua (NASA)</li>
      <li>Oort: ~5.000–100.000 ua — esquemático, sem corpos nomeados inventados</li>
    </ol>
    <p class="muted">${ARTICLES.find((a) => a.id === 'about')?.long[L]}</p>
    <button class="btn primary" data-act="tool:none">${t(L, 'returnPlanets')}</button>`
}

function wireOverlay(host: Element): void {
  const L = lang()
  host.querySelector('#lang')?.addEventListener('change', (e) => setLang((e.target as HTMLSelectElement).value as 'pt-BR' | 'en'))
  host.querySelector('#restart-tut')?.addEventListener('click', () => {
    state.onboarding = { dismissed: false, hintStep: 0, checklist: { planet: false, moon: false, reverse: false, compare: false, scale: false } }
    setTool('none'); notify()
  })
  host.querySelectorAll('[data-pres]').forEach((b) => b.addEventListener('click', () => {
    state.prefs.presentation = (b as HTMLElement).dataset.pres as 'natural' | 'enhanced'; notify()
  }))
  host.querySelectorAll('[data-qual]').forEach((b) => b.addEventListener('click', () => {
    state.prefs.quality = (b as HTMLElement).dataset.qual as typeof state.prefs.quality; notify()
  }))
  host.querySelector('#bg')?.addEventListener('input', (e) => { state.prefs.backgroundIntensity = Number((e.target as HTMLInputElement).value) })
  host.querySelector('#clean')?.addEventListener('change', (e) => { state.prefs.cleanBackground = (e.target as HTMLInputElement).checked })
  host.querySelector('#hc')?.addEventListener('change', (e) => { state.prefs.highContrast = (e.target as HTMLInputElement).checked; document.querySelector('#app')?.classList.toggle('hc', state.prefs.highContrast) })
  host.querySelector('#sound')?.addEventListener('change', (e) => { state.prefs.soundMaster = (e.target as HTMLInputElement).checked })
  host.querySelector('#fill')?.addEventListener('input', (e) => { state.prefs.illuminationBoost = Number((e.target as HTMLInputElement).value) })
  host.querySelector('#export')?.addEventListener('click', () => downloadText('observatory.json', exportLocalJson()))
  host.querySelector('#import')?.addEventListener('change', async (e) => {
    const f = (e.target as HTMLInputElement).files?.[0]
    if (!f) return
    const text = await f.text()
    const r = importLocalJson(text)
    state.lastError = r.ok ? null : 'import'
    notify()
  })
  host.querySelector('#clear')?.addEventListener('click', () => {
    if (confirm(t(L, 'confirmClear'))) {
      state.journal = []; state.favorites = []; state.viewpoints = []; state.bookmarks = []
      savePersisted(); notify()
    }
  })
  host.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => {
    const id = (b as HTMLElement).dataset.add!
    if (!state.compare.ids.includes(id)) state.compare.ids = [...state.compare.ids, id].slice(0, 4)
    notify()
  }))
  host.querySelector('#live-m')?.addEventListener('change', (e) => {
    if (state.measure) state.measure.live = (e.target as HTMLInputElement).checked
    notify()
  })
  host.querySelector('#m-swap')?.addEventListener('click', () => {
    if (state.measure) {
      const x = state.measure.a; state.measure.a = state.measure.b; state.measure.b = x
    }
    notify()
  })
  host.querySelector('#j-save')?.addEventListener('click', () => {
    const title = (host.querySelector('#j-title') as HTMLInputElement).value.trim() || t(L, 'note')
    const body = (host.querySelector('#j-body') as HTMLTextAreaElement).value.trim()
    if (!body) return
    state.journal.unshift({ id: crypto.randomUUID(), title, body, bodyId: state.selectedId, simMs: clock.simMs, createdMs: Date.now() })
    savePersisted(); notify()
  })
  host.querySelector('#copy-share')?.addEventListener('click', () => {
    const txt = JSON.stringify({ v: 1, body: state.selectedId, simMs: clock.simMs, scale: state.prefs.scaleMode, cam: eng?.cameraRig.spherical }, null, 2)
    ;(host.querySelector('#share-txt') as HTMLTextAreaElement).value = txt
    navigator.clipboard?.writeText(txt).catch(() => undefined)
  })
  const share = host.querySelector('#share-txt') as HTMLTextAreaElement | null
  if (share) share.value = JSON.stringify({ v: 1, body: state.selectedId, simMs: clock.simMs, scale: state.prefs.scaleMode }, null, 2)
  host.querySelector('#earth-cm')?.addEventListener('input', (e) => {
    const cm = Number((e.target as HTMLInputElement).value)
    const earth = diameterKm(getBody('earth')!)!
    const jup = diameterKm(getBody('jupiter')!)!
    const au = AU_KM
    const out = host.querySelector('#if-out')
    if (out) out.textContent = `Júpiter: ${(cm * jup / earth).toFixed(1)} cm · 1 ua: ${(cm * au / earth / 100000).toFixed(2)} km`
  })
  host.querySelector('#inc-sun')?.addEventListener('change', (e) => {
    state.experiment = { ...(state.experiment ?? {}), includeSun: (e.target as HTMLInputElement).checked }
    notify()
  })
  host.querySelector('#log-ax')?.addEventListener('change', (e) => {
    state.experiment = { ...(state.experiment ?? {}), logAxis: (e.target as HTMLInputElement).checked }
    notify()
  })
  host.querySelectorAll('[data-act^="act:"]').forEach((b) => b.addEventListener('click', () => {
    /* handled by runAction */
  }))
  const lab = host.querySelector('#labc') as HTMLCanvasElement | null
  if (lab && state.tool === 'seasons-lab') drawSeasons(lab, 23.44)
  if (lab && state.tool === 'moon-lab') drawMoonLab(lab, 0.25)
  if (lab && state.tool === 'orbit-lab') drawOrbitLab(lab, 0.0167)
  if (lab && state.tool === 'scale-lab') drawScaleLab(lab)
  host.querySelector('#tilt')?.addEventListener('input', (e) => {
    const v = Number((e.target as HTMLInputElement).value)
    if (lab) drawSeasons(lab, v)
    const out = host.querySelector('#lab-out')
    if (out) out.textContent = v === 0 ? (L === 'pt-BR' ? 'Inclinação 0°: sem estações por latitude.' : 'Tilt 0°: no latitude seasons.') : `${v.toFixed(1)}°`
  })
  host.querySelector('#phase')?.addEventListener('input', (e) => {
    if (lab) drawMoonLab(lab, Number((e.target as HTMLInputElement).value))
  })
  const syncOrbit = () => {
    const M = Number((host.querySelector('#om') as HTMLInputElement)?.value)
    const a = Number((host.querySelector('#oa') as HTMLInputElement)?.value)
    const e = Number((host.querySelector('#oe') as HTMLInputElement)?.value)
    const d = orbitLabDerived({ centralMassKg: M, aM: a, e })
    const out = host.querySelector('#lab-out')
    if (out) out.textContent = d.ok ? `T = ${(d.periodS / DAY_S).toFixed(3)} d · q=${d.periM.toExponential(3)} m` : d.error
    if (lab && d.ok) drawOrbitLab(lab, e)
  }
  host.querySelector('#om')?.addEventListener('input', syncOrbit)
  host.querySelector('#oa')?.addEventListener('input', syncOrbit)
  host.querySelector('#oe')?.addEventListener('input', syncOrbit)
  host.querySelector('#o-reset')?.addEventListener('click', () => {
    ;(host.querySelector('#om') as HTMLInputElement).value = '1.989e30'
    syncOrbit()
  })
}

function drawSeasons(c: HTMLCanvasElement, tilt: number): void {
  const g = c.getContext('2d')
  if (!g) return
  const w = c.width = c.clientWidth * 2
  const h = c.height = 280 * 2
  g.fillStyle = '#0b0d14'
  g.fillRect(0, 0, w, h)
  g.fillStyle = '#ffcc66'
  g.beginPath(); g.arc(w * 0.2, h / 2, 28, 0, Math.PI * 2); g.fill()
  g.save()
  g.translate(w * 0.7, h / 2)
  g.rotate((tilt * Math.PI) / 180)
  g.fillStyle = '#3a7ad6'
  g.beginPath(); g.arc(0, 0, 50, 0, Math.PI * 2); g.fill()
  g.strokeStyle = '#e8b86d'
  g.beginPath(); g.moveTo(0, -70); g.lineTo(0, 70); g.stroke()
  g.restore()
}

function drawMoonLab(c: HTMLCanvasElement, phase: number): void {
  const g = c.getContext('2d')
  if (!g) return
  const w = c.width = c.clientWidth * 2
  const h = c.height = 280 * 2
  g.fillStyle = '#0b0d14'
  g.fillRect(0, 0, w, h)
  g.fillStyle = '#ffcc66'
  g.beginPath(); g.arc(80, h / 2, 22, 0, Math.PI * 2); g.fill()
  g.fillStyle = '#3a7ad6'
  g.beginPath(); g.arc(w * 0.45, h / 2, 36, 0, Math.PI * 2); g.fill()
  const ang = phase * Math.PI * 2
  const mx = w * 0.45 + Math.cos(ang) * 110
  const my = h / 2 + Math.sin(ang) * 40
  g.fillStyle = '#ccc'
  g.beginPath(); g.arc(mx, my, 14, 0, Math.PI * 2); g.fill()
  g.fillStyle = '#111'
  g.beginPath(); g.arc(w * 0.82, h / 2, 50, 0, Math.PI * 2); g.fill()
  g.fillStyle = '#ddd'
  g.beginPath(); g.arc(w * 0.82, h / 2, 50, -Math.PI / 2, Math.PI / 2); g.fill()
  g.fillStyle = '#5ec8e8'
  g.font = '22px sans-serif'
  g.fillText(phase < 0.5 ? 'waxing' : 'waning', 20, 40)
}

function drawOrbitLab(c: HTMLCanvasElement, e: number): void {
  const g = c.getContext('2d')
  if (!g) return
  const w = c.width = c.clientWidth * 2
  const h = c.height = 280 * 2
  g.fillStyle = '#0b0d14'
  g.fillRect(0, 0, w, h)
  const a = Math.min(w, h) * 0.35
  const b = a * Math.sqrt(Math.max(0, 1 - e * e))
  const cx = w / 2 + e * a
  g.strokeStyle = '#5ec8e8'
  g.beginPath()
  g.ellipse(w / 2, h / 2, a, b, 0, 0, Math.PI * 2)
  g.stroke()
  g.fillStyle = '#ffcc66'
  g.beginPath(); g.arc(cx, h / 2, 10, 0, Math.PI * 2); g.fill()
}

function drawScaleLab(c: HTMLCanvasElement): void {
  const g = c.getContext('2d')
  if (!g) return
  const w = c.width = c.clientWidth * 2
  const h = c.height = 280 * 2
  g.fillStyle = '#0b0d14'
  g.fillRect(0, 0, w, h)
  g.fillStyle = '#a8adc0'
  g.font = '22px sans-serif'
  const view = state.labView
  if (view === 'combined') {
    const scale = w / (30 * AU_KM) * 0.92
    const ids = ['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune']
    g.fillText('1 px ≈ ' + (1 / scale / 2).toExponential(2) + ' km', 16, 32)
    g.fillStyle = '#f0b060'
    g.beginPath(); g.arc(24, h / 2, Math.max(1, 695700 * scale * 2), 0, Math.PI * 2); g.fill()
    ids.forEach((id) => {
      const b = getBody(id)!
      const x = 24 + (b.semiMajorAxisKm ?? 0) * scale * 2
      const r = Math.max(1, (diameterKm(b) ?? 1) * scale)
      g.fillStyle = '#5ec8e8'
      g.beginPath(); g.arc(x, h / 2, r, 0, Math.PI * 2); g.fill()
    })
    return
  }
  g.fillStyle = '#5ec8e8'
  g.fillText(view === 'sizes' ? 'Diâmetros lineares' : (state.experiment?.logAxis ? 'log10(1+ua)' : 'ua linear'), 16, 36)
}

function renderSearch(root: HTMLElement, query: string): void {
  const box = root.querySelector('#q-res') as HTMLElement
  const L = lang()
  if (!query.trim()) { box.hidden = true; box.innerHTML = ''; return }
  const hits = searchBodies(query, L).slice(0, 12)
  if (!hits.length) {
    box.hidden = false
    box.innerHTML = `<button type="button">${t(L, 'searchEmpty')}</button>`
    box.querySelector('button')?.addEventListener('click', () => {
      (root.querySelector('#q') as HTMLInputElement).value = ''
      box.hidden = true
    })
    return
  }
  box.hidden = false
  box.innerHTML = hits.map((b) => `<button type="button" data-act="select:${b.id}">${b.names[L]} <span class="meta">${kindLabel(L, b.kind)}</span></button>`).join('')
}

function showDisamb(root: HTMLElement, ids: string[]): void {
  const L = lang()
  const d = document.createElement('div')
  d.className = 'disamb'
  d.innerHTML = `<p>${t(L, 'disambiguate')}</p>` + ids.map((id) => `<button class="item" data-act="select:${id}">${getBody(id)?.names[L]}</button>`).join('')
  root.appendChild(d)
  d.style.left = '40%'
  d.style.top = '40%'
  d.addEventListener('click', () => d.remove())
}

function updateLive(root: HTMLElement): void {
  const L = lang()
  const date = root.querySelector('#date-readout')
  if (date) date.textContent = formatDateUtc(clock.simMs, L)
  const rate = root.querySelector('#rate-readout')
  if (rate) rate.textContent = ratePhrase(clock.rate || DEFAULT_RATE, clock.playing, clock.direction, L) + (clock.atBound ? ' · ' + t(L, 'boundHit') : '')
  const play = root.querySelector('[data-act="play"]')
  if (play) play.textContent = clock.playing ? t(L, 'pause') : t(L, 'play')
  const badge = root.querySelector('#scale-badge')
  if (badge) badge.textContent = clock.atBound ? t(L, 'approx') : (state.prefs.scaleMode === 'exploration' ? t(L, 'scaleExploration') : t(L, 'scaleRelative'))
  const status = root.querySelector('#status')
  if (status) {
    const sel = getBody(state.selectedId ?? '')
    status.textContent = [
      sel ? sel.names[L] : '—',
      state.cameraMode,
      formatDateUtc(clock.simMs, L),
      ratePhrase(clock.rate, clock.playing, clock.direction, L),
      state.prefs.scaleMode,
      t(L, 'approx'),
    ].join(' · ')
  }
  const slider = root.querySelector('#rate') as HTMLInputElement | null
  if (slider && document.activeElement !== slider) slider.value = String(sliderFromRate(clock.rate, clock.direction))
  const rnum = root.querySelector('#rate-num') as HTMLInputElement | null
  if (rnum && document.activeElement !== rnum) rnum.value = String(clock.rate)
  const warn = root.querySelector('#rel-warn') as HTMLElement | null
  if (warn) {
    warn.hidden = state.prefs.scaleMode !== 'relative'
    warn.textContent = t(L, 'scaleWarn')
  }
  const din = root.querySelector('#date-in') as HTMLInputElement | null
  if (din && document.activeElement !== din) din.value = isoToDatetimeLocal(clock.simMs)
  const kv = root.querySelector('#kv')
  const b = getBody(state.selectedId ?? '')
  if (kv && b && b.id !== 'sun' && b.kind !== 'region') {
    const live = kv.querySelector('[data-live]')
    const dist = b.kind === 'moon' && b.parentId
      ? `${t(L, 'distParent')}: ${formatKm(distanceKm(b.id, b.parentId, clock.simMs), L)} · ${t(L, 'distSun')}: ${formatKm(distanceKm(b.id, 'sun', clock.simMs), L)}`
      : `${t(L, 'distSun')} (instantânea, não o semi-eixo): ${formatKm(distanceKm(b.id, 'sun', clock.simMs), L)}`
    if (live) live.textContent = dist
    else {
      const dt = document.createElement('dt'); dt.textContent = 'live'
      const dd = document.createElement('dd'); dd.dataset.live = '1'; dd.textContent = dist
      kv.append(dt, dd)
    }
  }
  if (state.prefs.scaleMode === 'relative' && state.onboarding.checklist.scale === false) {
    /* badge already explains */
  }
}

function updateLabels(root: HTMLElement, engine: Engine | null): void {
  if (!engine) return
  const box = root.querySelector('#labels')!
  if ((state.tool === 'photo' && !state.photo.labels) || state.prefs.labels === 'none') {
    box.innerHTML = ''
    return
  }
  const cam = engine.camera
  const L = lang()
  const w = engine.renderer.domElement.clientWidth
  const h = engine.renderer.domElement.clientHeight
  const wanted = ALL_BODIES.filter((b) => {
    if (b.kind === 'region') return false
    if (state.prefs.labels === 'selected') return b.id === state.selectedId
    if (state.prefs.labels === 'favorites') return state.favorites.includes(b.id) || b.id === state.selectedId
    if (state.prefs.labels === 'system') {
      const sel = getBody(state.selectedId ?? '')
      return b.id === state.selectedId || b.parentId === state.selectedId || b.id === sel?.parentId || b.id === 'sun'
    }
    return b.kind === 'star' || b.kind === 'planet' || b.id === state.selectedId
  })
  const v = { x: 0, y: 0, z: 0 }
  const html: string[] = []
  for (const b of wanted) {
    const p = engine.getDisplayPos(b.id)
    v.x = p.x; v.y = p.y; v.z = p.z
    p.project(cam)
    if (p.z > 1) continue
    const x = (p.x * 0.5 + 0.5) * w
    const y = (-p.y * 0.5 + 0.5) * h
    if (x < 0 || y < 0 || x > w || y > h) continue
    html.push(`<button class="label ${b.id === state.selectedId ? 'sel' : ''}" style="left:${x}px;top:${y}px" data-act="select:${b.id}">${b.names[L]}</button>`)
  }
  box.innerHTML = html.join('')
}

function drawMini(root: HTMLElement): void {
  const c = root.querySelector('#mini') as HTMLCanvasElement | null
  if (!c) return
  const g = c.getContext('2d')
  if (!g) return
  g.fillStyle = '#0b0d14'
  g.fillRect(0, 0, 120, 120)
  g.strokeStyle = '#2a2e3c'
  g.beginPath(); g.arc(60, 60, 50, 0, Math.PI * 2); g.stroke()
  const ids = ['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune']
  for (const id of ids) {
    const p = poseAt(id, clock.simMs).km
    const r = Math.hypot(p.x, p.y) / AU_KM
    const ang = Math.atan2(p.y, p.x)
    const rr = 8 + Math.log10(1 + r) * 18
    const x = 60 + Math.cos(ang) * rr
    const y = 60 + Math.sin(ang) * rr
    g.fillStyle = id === state.selectedId ? '#5ec8e8' : '#a8adc0'
    g.fillRect(x, y, 3, 3)
  }
  g.fillStyle = '#f0b060'
  g.beginPath(); g.arc(60, 60, 3, 0, Math.PI * 2); g.fill()
}

function announce(msg: string): void {
  const el = document.querySelector('#live')
  if (el) el.textContent = msg
}

export { VALID_START_ISO, VALID_END_ISO, SPEED_PRESETS, radiusKm }
