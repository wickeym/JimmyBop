// Tiny synthesized soundtrack. No samples, so the game stays self-contained.

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  let timer = 0;
  let step = 0;
  let rumble = null;
  const last = {};

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.045;
    musicGain.connect(master);
    rumble = ctx.createOscillator();
    const rg = ctx.createGain();
    rg.gain.value = 0;
    rumble.frequency.value = 46;
    rumble.type = "sawtooth";
    rumble.connect(rg);
    rg.connect(master);
    rumble.start();
    rumble._gain = rg;
  }

  function tone(freq, dur, type, gain, slideTo) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, gain) {
    if (!ctx || muted) return;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start();
  }

  function play(name) {
    const now = ctx ? ctx.currentTime : 0;
    if (last[name] && now - last[name] < 0.07) return;
    last[name] = now;
    if (name === "jump") tone(620, 0.12, "square", 0.05, 280);
    else if (name === "boing") tone(420, 0.16, "triangle", 0.07, 760);
    else if (name === "land") noise(0.08, 0.04);
    else if (name === "splash") {
      noise(0.18, 0.06);
      tone(880, 0.1, "sine", 0.04, 440);
    }
    else if (name === "coin") {
      tone(880, 0.08, "square", 0.05);
      tone(1320, 0.1, "square", 0.04);
    }
    else if (name === "bonk") tone(140, 0.08, "square", 0.05, 70);
    else if (name === "close") tone(520, 0.12, "square", 0.05, 780);
    else if (name === "clutch") {
      tone(660, 0.1, "square", 0.06, 990);
      tone(990, 0.14, "triangle", 0.05);
    }
    else if (name === "melt") tone(392, 0.45, "sawtooth", 0.06, 70);
    else if (name === "phin") {
      tone(392, 0.08, "triangle", 0.07);
      tone(523, 0.1, "triangle", 0.06);
      tone(784, 0.16, "triangle", 0.06);
    }
    else if (name === "level") {
      tone(523, 0.09, "triangle", 0.06);
      tone(659, 0.12, "triangle", 0.06);
      tone(880, 0.18, "triangle", 0.06);
    }
    else if (name === "respawn") {
      tone(523, 0.08, "triangle", 0.05);
      tone(659, 0.1, "triangle", 0.05);
      tone(784, 0.14, "triangle", 0.05);
    }
  }

  const melody = [0, 2, 4, 7, 4, 2, 0, -5];

  function music(dt, playing) {
    if (!ctx || muted) return;
    musicGain.gain.value = playing ? 0.05 : 0.02;
    timer += dt;
    const tempo = 0.2;
    if (timer < tempo) return;
    timer -= tempo;
    const semi = melody[step % melody.length];
    const freq = 523.25 * 2 ** (semi / 12);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + tempo * 0.9);
    osc.connect(g);
    g.connect(musicGain);
    osc.start(t);
    osc.stop(t + tempo);
    if (step % 4 === 0) {
      const b = ctx.createOscillator();
      const bg = ctx.createGain();
      b.type = "sine";
      b.frequency.value = freq / 2;
      bg.gain.setValueAtTime(0.8, t);
      bg.gain.exponentialRampToValueAtTime(0.0001, t + tempo * 1.6);
      b.connect(bg);
      bg.connect(musicGain);
      b.start(t);
      b.stop(t + tempo * 1.6);
    }
    step += 1;
  }

  return {
    resume() {
      ensure();
      if (ctx && ctx.state === "suspended") ctx.resume();
    },
    setMuted(v) {
      muted = v;
      if (master) master.gain.value = v ? 0 : 0.9;
    },
    toggle() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.9;
      return muted;
    },
    get muted() {
      return muted;
    },
    sync(g, dt) {
      if (!ctx) return;
      const playing = g.mode === "run" && (g.state === "play" || g.state === "title");
      if (g.state !== "melt") music(dt, playing);
      if (rumble) {
        const lead = g.player.x - g.lavaX;
        const amount = g.state === "play" ? Math.max(0, (180 - lead) / 180) * 0.03 : 0;
        rumble._gain.gain.value = muted ? 0 : amount;
      }
    },
    playList(names) {
      if (!ctx) return;
      for (const n of names) play(n);
    },
  };
}
