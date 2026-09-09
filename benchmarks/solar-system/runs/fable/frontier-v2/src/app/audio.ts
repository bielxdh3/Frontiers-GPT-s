/**
 * Optional audio: a generative ambient soundscape (WebAudio), tiny UI blips,
 * speech-synthesis narration and an educational sonification of orbital periods.
 * Nothing plays until the user explicitly enables it; every capability degrades
 * to a truthful "unavailable" state.
 */
export interface AudioCaps { webAudio: boolean; speech: boolean }

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambGain: GainNode | null = null;
  private uiGain: GainNode | null = null;
  private ambNodes: AudioNode[] = [];
  private speaking = false;
  enabled = false;
  lastError: string | null = null;

  caps(): AudioCaps {
    return {
      webAudio: typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window),
      speech: typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window,
    };
  }

  /** Must be called from a user gesture. Returns false when the context cannot start. */
  async enable(): Promise<boolean> {
    if (this.enabled && this.ctx) return true;
    try {
      const Ctor = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      if (!Ctor) { this.lastError = 'no-webaudio'; return false; }
      this.ctx = this.ctx ?? new Ctor();
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      if (this.ctx.state !== 'running') { this.lastError = 'suspended'; return false; }
      this.master = this.master ?? this.ctx.createGain();
      this.ambGain = this.ambGain ?? this.ctx.createGain();
      this.uiGain = this.uiGain ?? this.ctx.createGain();
      this.master.gain.value = 0.8;
      this.ambGain.connect(this.master); this.uiGain.connect(this.master); this.master.connect(this.ctx.destination);
      this.enabled = true;
      this.lastError = null;
      return true;
    } catch (e) {
      this.lastError = e instanceof Error ? e.message : String(e);
      return false;
    }
  }

  disable(): void {
    this.stopAmbience();
    this.stopSpeech();
    this.enabled = false;
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  /** Slowly evolving detuned drones through a gentle low-pass: artistic atmosphere, not "space sound". */
  startAmbience(level: number): void {
    if (!this.ctx || !this.ambGain || !this.enabled) return;
    if (this.ambNodes.length) { this.setAmbience(level); return; }
    const ctx = this.ctx;
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 420; filter.Q.value = 0.6;
    filter.connect(this.ambGain);
    const freqs = [55, 82.4, 110.2, 164.8];
    for (let i = 0; i < freqs.length; i++) {
      const osc = ctx.createOscillator(); osc.type = i % 2 ? 'triangle' : 'sine'; osc.frequency.value = freqs[i]; osc.detune.value = (i - 1.5) * 4;
      const g = ctx.createGain(); g.gain.value = 0.09 / (i + 1);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.03 + i * 0.011;
      const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.04 / (i + 1);
      lfo.connect(lfoGain); lfoGain.connect(g.gain);
      osc.connect(g); g.connect(filter);
      osc.start(); lfo.start();
      this.ambNodes.push(osc, g, lfo, lfoGain);
    }
    this.ambNodes.push(filter);
    this.ambGain.gain.setValueAtTime(0, ctx.currentTime);
    this.ambGain.gain.linearRampToValueAtTime(level, ctx.currentTime + 2.5);
  }

  setAmbience(level: number): void {
    if (!this.ctx || !this.ambGain) return;
    this.ambGain.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, level)), this.ctx.currentTime + 0.3);
  }

  stopAmbience(): void {
    if (!this.ctx) return;
    for (const n of this.ambNodes) { try { if ('stop' in n) (n as OscillatorNode).stop(); n.disconnect(); } catch { /* already stopped */ } }
    this.ambNodes = [];
  }

  setUiLevel(level: number): void { if (this.uiGain) this.uiGain.gain.value = Math.max(0, Math.min(1, level)); }

  /** A brief soft blip for interface feedback. */
  click(freq = 880): void {
    if (!this.ctx || !this.uiGain || !this.enabled) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
    osc.connect(g); g.connect(this.uiGain);
    osc.start(); osc.stop(ctx.currentTime + 0.14);
  }

  /**
   * Educational sonification: map orbital periods to pitch (shorter period → higher pitch,
   * one octave per factor of 4 in period) and play them in sequence. Returns the mapping used.
   */
  sonify(items: { periodDays: number }[]): { periodDays: number; hz: number }[] {
    const out = items.map((it) => ({ periodDays: it.periodDays, hz: Math.min(1800, Math.max(60, 440 * Math.pow(0.5, Math.log(it.periodDays / 365.25) / Math.log(4)))) }));
    if (!this.ctx || !this.uiGain || !this.enabled) return out;
    const ctx = this.ctx;
    out.forEach((o, i) => {
      const t0 = ctx.currentTime + i * 0.45;
      const osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.value = o.hz;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.3, t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);
      osc.connect(g); g.connect(this.uiGain!);
      osc.start(t0); osc.stop(t0 + 0.42);
    });
    return out;
  }

  /** Speak text; cancels any previous utterance so rapid Next presses never overlap. */
  speak(text: string, lang: string, onEnd?: () => void): boolean {
    if (!this.caps().speech) return false;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang; u.rate = 1;
      const voices = window.speechSynthesis.getVoices();
      const v = voices.find((vv) => vv.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
      if (v) u.voice = v;
      u.onend = () => { this.speaking = false; onEnd?.(); };
      u.onerror = () => { this.speaking = false; onEnd?.(); };
      this.speaking = true;
      window.speechSynthesis.speak(u);
      return true;
    } catch {
      return false;
    }
  }

  pauseSpeech(): void { if (this.caps().speech && this.speaking) window.speechSynthesis.pause(); }
  resumeSpeech(): void { if (this.caps().speech && this.speaking) window.speechSynthesis.resume(); }
  stopSpeech(): void { if (this.caps().speech) { window.speechSynthesis.cancel(); this.speaking = false; } }
  get isSpeaking(): boolean { return this.speaking; }
}

export const audio = new AudioEngine();
