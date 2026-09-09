import type { BodyId } from '../data/types';

export interface LabelItem {
  id: BodyId | string;
  text: string;
  x: number;
  y: number;
  /** Projected disc radius in CSS px (including rings when relevant). */
  radiusPx: number;
  priority: number;
  inFront: boolean;
  occluded: boolean;
  selected: boolean;
  /** Show a discovery marker because the disc is tiny. */
  marker: boolean;
  color: string;
  kind: 'body' | 'region';
}

interface Box { x0: number; y0: number; x1: number; y1: number }

interface Slot {
  root: HTMLDivElement;
  label: HTMLButtonElement;
  marker: HTMLSpanElement;
  shownFrames: number;
  hiddenFrames: number;
  visible: boolean;
  lastCorner: number;
}

const overlaps = (a: Box, b: Box): boolean => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

/**
 * HTML label layer with priority-aware overlap management and hysteresis.
 * Labels are buttons (clickable) but stay out of the tab order; the object
 * navigator provides keyboard access.
 */
export class LabelLayer {
  readonly el: HTMLDivElement;
  private slots = new Map<string, Slot>();
  private bracket: HTMLDivElement;
  private edge: HTMLDivElement;
  private width = 1;
  private height = 1;
  onSelect: ((id: string, ev: MouseEvent) => void) | null = null;
  labelScale = 1;
  density = 0.8;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'label-layer';
    this.el.setAttribute('aria-hidden', 'true');
    parent.appendChild(this.el);
    this.bracket = document.createElement('div');
    this.bracket.className = 'sel-bracket';
    this.bracket.appendChild(document.createElement('i')); // hosts the two bottom corners (see .sel-bracket i::before/::after)
    this.bracket.hidden = true;
    this.el.appendChild(this.bracket);
    this.edge = document.createElement('div');
    this.edge.className = 'edge-indicator';
    this.edge.hidden = true;
    this.el.appendChild(this.edge);
  }

  resize(w: number, h: number): void { this.width = w; this.height = h; }

  private slot(item: LabelItem): Slot {
    let s = this.slots.get(item.id);
    if (s) return s;
    const root = document.createElement('div');
    root.className = 'label-slot';
    const marker = document.createElement('span');
    marker.className = 'body-marker';
    const label = document.createElement('button');
    label.type = 'button';
    label.className = 'body-label';
    label.tabIndex = -1;
    label.dataset.id = item.id;
    label.addEventListener('click', (ev) => { ev.stopPropagation(); this.onSelect?.(item.id, ev); });
    label.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    root.appendChild(marker);
    root.appendChild(label);
    this.el.appendChild(root);
    s = { root, label, marker, shownFrames: 0, hiddenFrames: 0, visible: false, lastCorner: 0 };
    this.slots.set(item.id, s);
    return s;
  }

  update(items: LabelItem[], showLabels: boolean, showMarkers: boolean): void {
    const placed: Box[] = [];
    const seen = new Set<string>();
    // Reserve the discs of large bodies so labels avoid covering them.
    for (const it of items) if (it.inFront && it.radiusPx > 14) placed.push({ x0: it.x - it.radiusPx, y0: it.y - it.radiusPx, x1: it.x + it.radiusPx, y1: it.y + it.radiusPx });
    const sorted = [...items].sort((a, b) => b.priority - a.priority);
    const fontPx = 12.5 * this.labelScale;
    let selectedItem: LabelItem | null = null;
    for (const it of sorted) {
      seen.add(it.id);
      const s = this.slot(it);
      if (it.selected) selectedItem = it;
      const onScreen = it.inFront && it.x > -40 && it.x < this.width + 40 && it.y > -40 && it.y < this.height + 40;
      const showMarker = showMarkers && it.marker && onScreen && !it.occluded;
      s.marker.hidden = !showMarker;
      s.marker.style.borderColor = it.color;
      s.root.classList.toggle('is-selected', it.selected);
      s.root.classList.toggle('is-region', it.kind === 'region');
      if (!onScreen || (it.occluded && !it.selected)) {
        this.hide(s);
        continue;
      }
      s.root.style.transform = `translate3d(${it.x.toFixed(1)}px, ${it.y.toFixed(1)}px, 0)`;
      if (!showLabels) { this.setLabelVisible(s, false); continue; }
      // Density threshold: low-priority labels are skipped when density is low.
      if (!it.selected && it.priority < (1 - this.density) * 10) { this.setLabelVisible(s, false); continue; }
      const textW = it.text.length * fontPx * 0.58 + 16;
      const textH = fontPx + 10;
      const off = Math.max(it.radiusPx, 4) + 6;
      const corners: [number, number][] = [
        [off, -textH / 2 - 4], [off, 4], [-off - textW, -textH / 2 - 4], [-off - textW, 4], [-textW / 2, -off - textH - 2], [-textW / 2, off + 2],
      ];
      let placedBox: Box | null = null;
      let cornerIdx = s.lastCorner;
      // Prefer the previously used corner to reduce jumping.
      const order = [s.lastCorner, ...corners.map((_, i) => i).filter((i) => i !== s.lastCorner)];
      for (const ci of order) {
        const [dx, dy] = corners[ci];
        const box: Box = { x0: it.x + dx, y0: it.y + dy, x1: it.x + dx + textW, y1: it.y + dy + textH };
        if (box.x0 < 2 || box.y0 < 2 || box.x1 > this.width - 2 || box.y1 > this.height - 2) continue;
        if (placed.some((b) => overlaps(b, box))) continue;
        placedBox = box; cornerIdx = ci; break;
      }
      if (!placedBox && it.selected) {
        const [dx, dy] = corners[0];
        placedBox = { x0: it.x + dx, y0: it.y + dy, x1: it.x + dx + textW, y1: it.y + dy + textH };
        cornerIdx = 0;
      }
      if (placedBox) {
        placed.push(placedBox);
        s.lastCorner = cornerIdx;
        s.label.textContent = it.text;
        s.label.style.transform = `translate(${(placedBox.x0 - it.x).toFixed(1)}px, ${(placedBox.y0 - it.y).toFixed(1)}px)`;
        s.hiddenFrames = 0;
        s.shownFrames++;
        if (s.shownFrames >= 2) this.setLabelVisible(s, true);
      } else {
        s.shownFrames = 0;
        s.hiddenFrames++;
        if (s.hiddenFrames >= 8) this.setLabelVisible(s, false);
      }
    }
    for (const [id, s] of this.slots) if (!seen.has(id)) this.hide(s);
    // Selection bracket and off-screen indicator.
    if (selectedItem && selectedItem.inFront && selectedItem.x >= 0 && selectedItem.x <= this.width && selectedItem.y >= 0 && selectedItem.y <= this.height) {
      const size = Math.max(selectedItem.radiusPx * 2 + 14, 30);
      this.bracket.hidden = false;
      this.bracket.style.width = `${size}px`; this.bracket.style.height = `${size}px`;
      this.bracket.style.transform = `translate3d(${(selectedItem.x - size / 2).toFixed(1)}px, ${(selectedItem.y - size / 2).toFixed(1)}px, 0)`;
      this.edge.hidden = true;
    } else if (selectedItem) {
      this.bracket.hidden = true;
      // Direction toward the selected body from the viewport center.
      let dx = selectedItem.x - this.width / 2, dy = selectedItem.y - this.height / 2;
      if (!selectedItem.inFront) { dx = -dx; dy = -dy; }
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      const m = 26;
      const tx = Math.min(this.width - m, Math.max(m, this.width / 2 + dx * this.width));
      const ty = Math.min(this.height - m, Math.max(m, this.height / 2 + dy * this.height));
      const ang = Math.atan2(dy, dx) * 180 / Math.PI;
      this.edge.hidden = false;
      this.edge.style.transform = `translate3d(${tx - 12}px, ${ty - 12}px, 0) rotate(${ang}deg)`;
      this.edge.title = selectedItem.text;
    } else {
      this.bracket.hidden = true;
      this.edge.hidden = true;
    }
  }

  private setLabelVisible(s: Slot, v: boolean): void {
    if (s.visible === v) return;
    s.visible = v;
    s.label.classList.toggle('is-visible', v);
  }

  private hide(s: Slot): void {
    s.marker.hidden = true;
    s.shownFrames = 0;
    this.setLabelVisible(s, false);
    s.root.style.transform = 'translate3d(-1000px,-1000px,0)';
  }

  dispose(): void { this.el.remove(); }
}
