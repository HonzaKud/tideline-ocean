/** Original restrained tropical / downtempo score. All audio synthesized locally. */
export class OceanScore {
  private ctx?: AudioContext;
  private bus?: GainNode;
  private timer?: number;
  private next = 0;
  private step = 0;
  private generation = 0;
  private readonly beat = 60 / 86;
  private readonly chords = [
    [220, 261.626, 329.628, 391.995],
    [174.614, 220, 261.626, 329.628],
    [130.813, 164.814, 195.998, 246.942],
    [195.998, 246.942, 293.665, 349.228],
  ];
  async start() {
    const ticket = ++this.generation;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      const bus = this.ctx.createGain();
      bus.gain.value = 0;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -20;
      comp.ratio.value = 3;
      bus.connect(comp);
      comp.connect(this.ctx.destination);
      this.bus = bus;
    }
    await this.ctx.resume();
    if (ticket !== this.generation) return;
    this.bus!.gain.cancelScheduledValues(this.ctx.currentTime);
    this.bus!.gain.setTargetAtTime(0.36, this.ctx.currentTime, 1.2);
    if (this.timer !== undefined) return;
    this.next = this.ctx.currentTime + 0.08;
    this.step = 0;
    this.tick();
    this.timer = window.setInterval(() => this.tick(), 100);
  }
  async stop() {
    const ticket = ++this.generation;
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    if (!this.ctx) return;
    this.bus!.gain.cancelScheduledValues(this.ctx.currentTime);
    this.bus!.gain.setTargetAtTime(0, this.ctx.currentTime, 0.18);
    const ctx = this.ctx;
    window.setTimeout(() => {
      if (
        ticket === this.generation &&
        this.timer === undefined &&
        ctx.state === "running"
      )
        void ctx.suspend();
    }, 900);
  }
  private tick() {
    const ctx = this.ctx!;
    while (this.next < ctx.currentTime + 0.22) {
      this.schedule(this.step, this.next);
      this.next += this.beat / 2;
      this.step++;
    }
  }
  private tone(
    freq: number,
    t: number,
    duration: number,
    volume: number,
    type: OscillatorType = "sine",
    cutoff = 1800,
  ) {
    const c = this.ctx!,
      o = c.createOscillator(),
      g = c.createGain(),
      f = c.createBiquadFilter();
    o.type = type;
    o.frequency.value = freq;
    f.type = "lowpass";
    f.frequency.value = cutoff;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + 0.035);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(f);
    f.connect(g);
    g.connect(this.bus!);
    o.start(t);
    o.stop(t + duration + 0.05);
  }
  private schedule(step: number, t: number) {
    const chord = this.chords[Math.floor(step / 32) % 4],
      pos = step % 8;
    if (step % 16 === 0) {
      chord.forEach((n, i) => {
        this.tone(n, t + i * 0.018, this.beat * 7, 0.045, "triangle", 1100);
        this.tone(n * 2, t + i * 0.018, this.beat * 5, 0.012, "sine");
      });
    }
    if (pos === 0 || pos === 5)
      this.tone(chord[0] / 2, t, this.beat * 0.8, 0.09, "sine", 500);
    if (pos === 0 || pos === 4) {
      const o = this.ctx!.createOscillator(),
        g = this.ctx!.createGain();
      o.frequency.setValueAtTime(92, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.connect(g);
      g.connect(this.bus!);
      o.start(t);
      o.stop(t + 0.27);
    }
    if (pos % 2 === 1) this.shaker(t, 0.023);
    if (step % 16 === 10 || step % 16 === 14)
      this.tone(
        chord[((step / 2) | 0) % 4] * 2,
        t,
        this.beat * 1.5,
        0.025,
        "sine",
        2000,
      );
  }
  private shaker(t: number, volume: number) {
    const c = this.ctx!,
      length = Math.floor(c.sampleRate * 0.12),
      b = c.createBuffer(1, length, c.sampleRate),
      data = b.getChannelData(0);
    for (let i = 0; i < length; i++)
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * 0.22));
    const s = c.createBufferSource(),
      f = c.createBiquadFilter(),
      g = c.createGain();
    s.buffer = b;
    f.type = "highpass";
    f.frequency.value = 6500;
    g.gain.value = volume;
    s.connect(f);
    f.connect(g);
    g.connect(this.bus!);
    s.start(t);
    s.stop(t + 0.13);
  }
}
