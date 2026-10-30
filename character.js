(() => {
  const $ = id => document.getElementById(id);
  const stage = $("character"), bubble = $("speechBubble");
  const eyes = $("pixelEyes"), status = $("characterStatus");

  const FACES = ["normal", "smug", "annoyed", "confused", "shocked", "glitch", "tired", "bored", "sleeping"];
  const FACE_LABEL = {
    normal: "พร้อมทำงาน", smug: "ภูมิใจ", annoyed: "หงุดหงิด", confused: "งง", shocked: "ตกใจ",
    glitch: "ระบบรวน", tired: "เหนื่อย", bored: "เบื่อ", sleeping: "หลับอยู่"
  };
  // ประเภทบทพูด -> หน้าตาที่ใช้
  const FACE_MAP = {
    error: "confused", divzero: "shocked", bignum: "tired", chain: "tired",
    clear: "smug", delete: "annoyed", equals: "smug", secret: "glitch", click: "annoyed",
    nice: "smug", answer42: "smug", notfound: "confused", leet: "glitch", night: "tired",
    sci: "smug", achievement: "shocked",
    gameStart: "smug", gameRight: "shocked", gameWrong: "smug", gameTimeout: "annoyed",
    gameEnd: "smug", gameEndLow: "confused"
  };
  const IDLE_BORED_MS = 30000;
  const IDLE_SLEEP_MS = 42000;

  let lastLine = "", currentFace = "normal";
  let dialogueOn = true, soundOn = true, voiceOn = true, sleepOn = true;
  let faceTimer, boredTimer, sleepTimer, audioContext = null;
  let sleeping = false, holdUntil = 0, nightWarned = false, lastActivity = 0;

  const TH_HOUR = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า"];
  function hourLabel(h) {
    if (h === 0) return "เที่ยงคืน";
    if (h <= 5) return "ตี" + TH_HOUR[h];
    return h + " นาฬิกา";
  }

  function say(type = "idle") {
    if (!dialogueOn) return;
    if (Date.now() < holdUntil && type !== "wake") return;
    const lines = window.ComputerDialogue[type] || window.ComputerDialogue.idle;
    let line = lines[Math.floor(Math.random() * lines.length)];
    if (lines.length > 1 && line === lastLine) line = lines[(lines.indexOf(line) + 1) % lines.length];
    lastLine = line;
    const text = line.replace("{h}", hourLabel(new Date().getHours()));
    bubble.textContent = text;
    voice(text);
  }

  function greet() {
    const h = new Date().getHours();
    const type = h < 6 ? "greetNight" : h < 11 ? "greetMorning" : h < 14 ? "greetNoon" : h < 18 ? "greetAfternoon" : "greetEvening";
    say(type);
  }

  function setFace(face = "normal") {
    FACES.forEach(f => stage.classList.remove(f));
    stage.classList.add(face);
    currentFace = face;
    status.textContent = FACE_LABEL[face] || face;
  }

  // ---------- หลับเมื่อปล่อยทิ้งไว้ ----------
  function resetIdle() {
    clearTimeout(boredTimer);
    clearTimeout(sleepTimer);
    if (!sleepOn) return;
    boredTimer = setTimeout(() => {
      if (sleeping) return;
      setFace("bored");
      say("bored");
    }, IDLE_BORED_MS);
    sleepTimer = setTimeout(() => {
      sleeping = true;
      setFace("sleeping");
      say("sleep");
    }, IDLE_SLEEP_MS);
  }

  function wake(silent = false) {
    if (!sleeping) return;
    sleeping = false;
    setFace("normal");
    if (!silent) {
      say("wake");
      holdUntil = Date.now() + 2500; // กันบทพูดของปุ่มที่กดมาทับคำตื่น
    }
    window.Achievements?.track("wake");
  }

  function react(type) {
    if (sleeping) wake(true);
    const hour = new Date().getHours();
    if (!nightWarned && hour < 5 && (type === "equals" || type === "number")) {
      nightWarned = true;
      type = "night";
    }
    setFace(FACE_MAP[type] || "normal");
    say(type);
    if (type === "secret") window.Achievements?.track("poke");
    clearTimeout(faceTimer);
    faceTimer = setTimeout(() => { if (!sleeping) setFace("normal"); }, 1800);
    resetIdle();
  }

  // ---------- เสียง ----------
  function audio() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    try {
      if (!audioContext) audioContext = new Ctx();
      if (audioContext.state === "suspended") audioContext.resume();
      return audioContext;
    } catch (err) { return null; }
  }

  function clickSound(kind = "key") {
    if (!soundOn) return;
    const ctx = audio();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = { key: [720, 430], op: [540, 360], equals: [520, 880], error: [200, 90], clear: [400, 200] }[kind] || [720, 430];
      osc.type = "square";
      osc.frequency.setValueAtTime(t[0], ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(t[1], ctx.currentTime + 0.045);
      gain.gain.setValueAtTime(0.035, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.055);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.06);
    } catch (err) { /* เสียงเป็นส่วนเสริม เครื่องคิดเลขยังใช้ได้ */ }
  }

  // เสียงบี๊บสั้นๆ ตอนตัวละครพูด โทนเปลี่ยนตามอารมณ์
  const VOICE = {
    normal:   { base: 330, type: "triangle", f: (i, n) => 1 + 0.15 * Math.sin(i * 1.7) },
    smug:     { base: 290, type: "triangle", f: (i, n) => i < n / 2 ? 1 + i * 0.06 : 1.3 - (i - n / 2) * 0.08 },
    annoyed:  { base: 190, type: "square",   f: (i, n) => 1 - i * 0.04 },
    confused: { base: 260, type: "triangle", f: (i, n) => i % 2 ? 1.25 : 0.85 },
    shocked:  { base: 520, type: "square",   f: (i, n) => 1 + i * 0.08 },
    glitch:   { base: 400, type: "square",   f: () => 0.6 + Math.random() * 1.2 },
    tired:    { base: 160, type: "triangle", f: (i, n) => 1 - i * 0.05 },
    bored:    { base: 170, type: "triangle", f: (i, n) => 1 - i * 0.03 },
    sleeping: { base: 120, type: "sine",     f: (i, n) => 1 - i * 0.04 }
  };

  function voice(line) {
    if (!soundOn || !voiceOn || !dialogueOn) return;
    if (!audioContext || audioContext.state !== "running") return;
    try {
      const v = VOICE[currentFace] || VOICE.normal;
      const n = Math.max(4, Math.min(9, Math.floor(line.length / 4)));
      const start = audioContext.currentTime + 0.12;
      for (let i = 0; i < n; i++) {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const at = start + i * (currentFace === "sleeping" || currentFace === "tired" ? 0.11 : 0.075);
        osc.type = v.type;
        osc.frequency.setValueAtTime(Math.max(60, v.base * v.f(i, n)), at);
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.03, at + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.055);
        osc.connect(gain); gain.connect(audioContext.destination);
        osc.start(at); osc.stop(at + 0.06);
      }
    } catch (err) { /* ไม่เป็นไร */ }
  }

  // ---------- การโต้ตอบ ----------
  stage.addEventListener("mousemove", e => {
    const r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width;
    eyes.style.transform = `translateX(${Math.round((x - .5) * 5)}px)`;
  });
  stage.addEventListener("mouseleave", () => { eyes.style.transform = ""; });

  let clickCount = 0, clickReset;
  stage.addEventListener("click", () => {
    clickCount++;
    clearTimeout(clickReset);
    clickReset = setTimeout(() => { clickCount = 0; }, 1800);
    if (clickCount >= 5) { react("secret"); clickCount = 0; }
    else react("click");
  });

  // กิจกรรมของผู้ใช้ = ปลุก/รีเซ็ตเวลาเบื่อ (ฟังตอน capture เพื่อให้คำตื่นขึ้นก่อนบทพูดของปุ่ม)
  const activity = () => { if (sleeping) wake(); resetIdle(); };
  document.addEventListener("pointerdown", activity, true);
  document.addEventListener("keydown", activity, true);
  document.addEventListener("mousemove", () => {
    const now = Date.now();
    if (now - lastActivity < 1500) return;
    lastActivity = now;
    if (sleeping) return;
    if (currentFace === "bored") setFace("normal");
    resetIdle();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !sleeping && Math.random() > .5) say("idle");
  });

  setTimeout(greet, 1300);
  resetIdle();

  window.Computer = {
    react, say, greet, clickSound,
    isSleeping: () => sleeping,
    setDialogueEnabled(v) { dialogueOn = v; if (!v) bubble.textContent = "..."; },
    setSoundEnabled(v) { soundOn = v; },
    setVoiceEnabled(v) { voiceOn = v; },
    setSleepEnabled(v) {
      sleepOn = v;
      if (!v) { wake(true); clearTimeout(boredTimer); clearTimeout(sleepTimer); if (currentFace === "bored") setFace("normal"); }
      else resetIdle();
    }
  };
})();
