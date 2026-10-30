// เกมท้าทายคิดเลขเร็ว: 10 ข้อ จับเวลาต่อข้อ
(() => {
  const $ = id => document.getElementById(id);
  const TOTAL = 10;
  const BEST_KEY = "theComputer.bestScore";
  let round = 0, score = 0, streak = 0, correct = 0, answer = 0, limit = 15, startedAt = 0;
  let ticker = null, nextTimer = null, active = false, locked = false, best = 0;
  try { best = Number(localStorage.getItem(BEST_KEY)) || 0; } catch (err) { /* ไม่เป็นไร */ }
  const react = type => window.Computer?.react(type);
  const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

  function makeQuestion(r) {
    if (r <= 3) {
      let a = rnd(8, 60), b = rnd(5, 45);
      if (Math.random() < 0.5) return { text: `${a} + ${b}`, ans: a + b };
      if (a < b) [a, b] = [b, a];
      return { text: `${a} − ${b}`, ans: a - b };
    }
    if (r <= 6) { const a = rnd(3, 12), b = rnd(3, 12); return { text: `${a} × ${b}`, ans: a * b }; }
    if (r <= 8) { const b = rnd(3, 12), q = rnd(3, 15); return { text: `${b * q} ÷ ${b}`, ans: q }; }
    const a = rnd(6, 15), b = rnd(3, 12), p = a * b;
    if (Math.random() < 0.5) { const c = rnd(5, 50); return { text: `${a} × ${b} + ${c}`, ans: p + c }; }
    const c = rnd(1, p - 1);
    return { text: `${a} × ${b} − ${c}`, ans: p - c };
  }

  function feedback(text, kind) {
    const el = $("gFeedback");
    el.textContent = text;
    el.className = "game-feedback " + (kind || "");
  }
  function stopTimers() { clearInterval(ticker); clearTimeout(nextTimer); ticker = null; nextTimer = null; }
  function setInput(enabled) {
    $("gInput").disabled = !enabled;
    $("gSubmit").disabled = !enabled;
    if (enabled) { $("gInput").value = ""; $("gInput").focus(); }
  }
  const timeLeft = () => Math.max(0, limit - (performance.now() - startedAt) / 1000);

  function tick() {
    const left = timeLeft();
    $("gBar").style.width = (left / limit * 100) + "%";
    if (left <= 0) resolve(null);
  }

  function nextQuestion() {
    round++;
    if (round > TOTAL) { finish(); return; }
    const q = makeQuestion(round);
    answer = q.ans;
    limit = round <= 3 ? 15 : round <= 8 ? 12 : 10;
    $("gQuestion").textContent = q.text;
    $("gRound").textContent = round;
    feedback("", "");
    locked = false;
    setInput(true);
    startedAt = performance.now();
    $("gBar").style.width = "100%";
    ticker = setInterval(tick, 100);
  }

  function resolve(value) {
    if (!active || locked) return;
    locked = true;
    clearInterval(ticker);
    setInput(false);
    const left = timeLeft();
    if (value !== null && Math.abs(value - answer) < 1e-9) {
      streak++; correct++;
      let pts = 10 + Math.ceil(left);
      if (streak >= 3) pts += 5;
      score += pts;
      feedback(`ถูกต้อง! +${pts}` + (streak >= 3 ? ` (ถูกติดกัน ${streak} ข้อ)` : ""), "ok");
      react("gameRight");
    } else {
      streak = 0;
      feedback(value === null ? `หมดเวลา! คำตอบคือ ${answer}` : `ผิด... คำตอบคือ ${answer}`, "bad");
      react(value === null ? "gameTimeout" : "gameWrong");
    }
    $("gScore").textContent = score;
    nextTimer = setTimeout(nextQuestion, 1400);
  }

  function finish() {
    active = false;
    stopTimers();
    setInput(false);
    const isBest = score > best;
    if (isBest) {
      best = score;
      try { localStorage.setItem(BEST_KEY, String(best)); } catch (err) { /* ไม่เป็นไร */ }
    }
    const rank = score >= 200 ? "ระดับมืออาชีพ" : score >= 140 ? "ฝีมือดี" : score >= 80 ? "พอใช้ได้" : "ลองใหม่อีกรอบนะ";
    $("gQuestion").textContent = "จบเกม!";
    $("gBest").textContent = best;
    $("gBar").style.width = "0%";
    feedback(`ได้ ${score} แต้ม · ถูก ${correct}/${TOTAL} · ${rank}` + (isBest ? " · สถิติใหม่!" : ""), "ok");
    $("gStart").textContent = "เล่นอีกครั้ง";
    react(score >= 140 ? "gameEnd" : "gameEndLow");
    window.Achievements?.track("gameEnd", { score, correct });
  }

  function start() {
    stopTimers();
    round = 0; score = 0; streak = 0; correct = 0; active = true; locked = false;
    $("gScore").textContent = 0;
    $("gStart").textContent = "เริ่มใหม่";
    react("gameStart");
    nextQuestion();
  }

  function abort() {
    if (!active) return;
    active = false;
    stopTimers();
    setInput(false);
    $("gQuestion").textContent = "ยกเลิกเกมแล้ว";
    $("gBar").style.width = "0%";
    feedback("", "");
    $("gStart").textContent = "เริ่มเกม";
  }

  $("gStart").addEventListener("click", start);
  $("gForm").addEventListener("submit", e => {
    e.preventDefault();
    const v = $("gInput").value;
    if (v === "" || !active || locked) return;
    resolve(Number(v));
  });
  document.addEventListener("tc:panel", e => { if (e.detail !== "game") abort(); });
  $("gBest").textContent = best;
})();
