(() => {
  const $ = id => document.getElementById(id);
  const display = $("display"), expression = $("expression"), status = $("displayStatus"), reading = $("reading");

  let current = "0", previous = null, operator = null, waiting = false, justCalculated = false;
  let memory = 0, lastOp = null, lastLine = "", chainCount = 0, readingOn = true, entryNo = 0;
  const history = [];

  const OPS = { "/": "÷", "*": "×", "+": "+", "-": "−", "^": "^" };
  const symbol = op => OPS[op] || op;
  const fmt = n => {
    if (!Number.isFinite(n)) return "ERROR";
    return String(Number.parseFloat(n.toPrecision(12)));
  };
  const pad = n => String(n).padStart(2, "0");
  const talk = type => window.Computer?.react(type);
  const track = (event, data) => window.Achievements?.track(event, data);
  const toast = message => window.UI?.toast(message);
  const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function render() {
    display.textContent = current;
    expression.textContent = previous !== null && operator
      ? `${fmt(previous)} ${symbol(operator)}`
      : (justCalculated && lastLine ? lastLine + " =" : "");
    const text = readingOn && window.ThaiNumber ? window.ThaiNumber.read(current) : "";
    reading.textContent = text;
    reading.title = text;
    $("memoryValue").textContent = fmt(memory);
    $("footerMemory").textContent = `หน่วยความจำ: ${fmt(memory)}`;
    $("footerHistory").textContent = `ประวัติ: ${history.length}`;
    $("historyCount").textContent = history.length;
  }

  function reactionFor(value) {
    const v = fmt(value);
    if (v === "42") return "answer42";
    if (v === "69") return "nice";
    if (v === "404") return "notfound";
    if (v === "1337") return "leet";
    if (Math.abs(value) >= 1e9) return "bignum";
    return "equals";
  }

  function fail(message, type = "error") {
    current = "ERROR"; previous = null; operator = null;
    waiting = false; justCalculated = false; lastOp = null; lastLine = ""; chainCount = 0;
    status.textContent = message;
    render();
    talk(type);
  }

  function addHistory(line, result) {
    history.unshift({ no: ++entryNo, line, result, time: Date.now() });
    history.splice(60);
    updateHistory();
  }

  function updateHistory() {
    const list = $("historyList");
    list.innerHTML = history.length
      ? history.map((it, i) => `<div class="history-entry" style="--i:${i}" data-result="${escapeHTML(it.result)}" title="คลิกเพื่อดึงคำตอบนี้มาคิดต่อ"><span class="he-no">${pad(it.no)}</span><span class="he-line">${escapeHTML(it.line)}</span><i class="he-dots"></i><strong>${escapeHTML(it.result)}</strong></div>`).join("")
      : '<p class="empty-state">ยังไม่มีรายการ ลองคำนวณสักครั้งสิ</p>';
    $("receiptCount").textContent = history.length;
    $("receiptTime").textContent = new Date().toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
    render();
  }

  function inputNumber(n) {
    if (current === "ERROR" || waiting || justCalculated) {
      if (justCalculated && operator === null) { chainCount = 0; lastOp = null; }
      current = n; waiting = false; justCalculated = false;
    } else {
      current = current === "0" ? n : (current.length < 15 ? current + n : current);
    }
    status.textContent = "รับตัวเลขแล้ว";
    render();
    talk("number");
  }

  function chooseOperator(op) {
    if (current === "ERROR") current = "0";
    if (operator && !waiting) calculate(true); // ต่อลูกโซ่: คิดผลก่อนหน้าให้เสร็จ แล้วใช้ผลนั้นต่อ
    if (current === "ERROR") return;
    if (justCalculated) chainCount++;
    else if (!waiting) chainCount = 0;
    previous = Number(current); operator = op; waiting = true; justCalculated = false;
    render();
    talk(chainCount >= 3 ? "chain" : "operator");
    if (chainCount > 0) track("chain", { count: chainCount });
  }

  function calculate(quiet = false) {
    // กด = ซ้ำ: ทำการดำเนินการล่าสุดต่อจากคำตอบเดิม
    if ((operator === null || previous === null) && justCalculated && lastOp && current !== "ERROR") {
      previous = Number(current); operator = lastOp.operator; current = String(lastOp.b);
    }
    if (operator === null || previous === null) return;
    const a = previous, b = Number(current);
    if (operator === "/" && b === 0) { fail("หารด้วยศูนย์", "divzero"); track("divzero"); return; }
    let result;
    switch (operator) {
      case "+": result = a + b; break;
      case "-": result = a - b; break;
      case "*": result = a * b; break;
      case "/": result = a / b; break;
      case "^": result = Math.pow(a, b); break;
    }
    if (!Number.isFinite(result)) { fail("คำนวณไม่ได้"); return; }
    const line = `${fmt(a)} ${symbol(operator)} ${fmt(b)}`;
    lastOp = { operator, b }; lastLine = line;
    current = fmt(result);
    previous = null; operator = null; waiting = true; justCalculated = true;
    status.textContent = "คำนวณเสร็จแล้ว";
    addHistory(line, current);
    if (!quiet) talk(reactionFor(Number(current)));
    track("equals", { result: Number(current) });
  }

  // ส่งค่าเข้าจอจากเครื่องมือเสริม (ค่าที่ส่งมาเทียบเท่าผลลัพธ์ พิมพ์ตัวเลขต่อจะเริ่มใหม่)
  function send(value, label) {
    const n = Number(value);
    if (!Number.isFinite(n)) return false;
    current = fmt(n); waiting = false; justCalculated = true;
    status.textContent = "รับค่าจากเครื่องมือ";
    if (label) { lastLine = label; addHistory(label, current); } else render();
    return true;
  }

  function unary(label, fn, unit = "") {
    if (current === "ERROR") { toast("กด AC ล้าง ERROR ก่อนนะ"); return false; }
    const x = Number(current);
    const r = fn(x);
    if (!Number.isFinite(r)) { fail("คำนวณไม่ได้"); return false; }
    send(r, `${label}(${fmt(x)}${unit})`);
    talk("sci");
    track("sci");
    return true;
  }

  function action(name) {
    switch (name) {
      case "clear":
        chainCount = 0; lastOp = null; lastLine = "";
        current = "0"; previous = null; operator = null; waiting = false; justCalculated = false;
        status.textContent = "โหมดปกติ"; talk("clear"); track("clear"); break;
      case "sign":
        if (current !== "0" && current !== "ERROR") { current = fmt(-Number(current)); lastLine = ""; } break;
      case "percent":
        if (current !== "ERROR") { current = fmt(Number(current) / 100); lastLine = ""; } break;
      case "decimal":
        if (current === "ERROR" || waiting || justCalculated) { current = "0."; waiting = false; justCalculated = false; }
        else if (!current.includes(".")) current += ".";
        break;
      case "delete":
        lastLine = "";
        if (current === "ERROR" || current.length === 1 || (current.length === 2 && current.startsWith("-"))) current = "0";
        else current = current.slice(0, -1);
        talk("delete"); break;
      case "equals": calculate(); break;
    }
    render();
  }

  // ---------- เหตุการณ์ ----------
  $("keypad").addEventListener("click", e => {
    const key = e.target.closest("button"); if (!key) return;
    if (key.dataset.number !== undefined) inputNumber(key.dataset.number);
    else if (key.dataset.operator) chooseOperator(key.dataset.operator);
    else if (key.dataset.action) action(key.dataset.action);
    window.Computer?.clickSound(key.dataset.operator ? "op" : key.dataset.action === "equals" ? "equals" : key.dataset.action === "clear" ? "clear" : "key");
  });

  document.addEventListener("keydown", e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return; // พิมพ์ในช่องกรอกของเครื่องมือ/เกมได้โดยไม่กวนเครื่องคิดเลข
    if (!$("calculatorPanel").classList.contains("active")) return;
    if (/^[0-9+\-*/.%=^]$|^(Enter|Backspace|Escape)$/.test(e.key)) {
      window.Computer?.clickSound(e.key === "Enter" || e.key === "=" ? "equals" : "+-*/^".includes(e.key) ? "op" : "key");
    }
    if (/^[0-9]$/.test(e.key)) inputNumber(e.key);
    else if (["+", "-", "*", "/", "^"].includes(e.key)) chooseOperator(e.key);
    else if (e.key === "Enter" || e.key === "=") { e.preventDefault(); calculate(); }
    else if (e.key === ".") action("decimal");
    else if (e.key === "Backspace") action("delete");
    else if (e.key === "Escape") action("clear");
    else if (e.key === "%") action("percent");
  });

  $("copyButton").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(current); toast("คัดลอกผลลัพธ์แล้ว"); track("copy"); }
    catch { toast("เบราว์เซอร์นี้คัดลอกให้ไม่ได้"); }
  });

  $("clearHistory").addEventListener("click", () => { history.length = 0; updateHistory(); toast("ล้างประวัติแล้ว"); });

  // คลิกรายการในใบเสร็จ = ดึงคำตอบมาคิดต่อ
  $("historyList").addEventListener("click", e => {
    const row = e.target.closest(".history-entry"); if (!row) return;
    current = row.dataset.result; previous = null; operator = null;
    waiting = true; justCalculated = true; chainCount = 0; lastLine = "";
    render();
    toast("ดึงคำตอบมาใช้ต่อแล้ว");
    window.UI?.showPanel("calculator");
  });

  document.querySelectorAll("[data-memory]").forEach(btn => btn.addEventListener("click", () => {
    switch (btn.dataset.memory) {
      case "add": memory += Number(current) || 0; track("memory"); break;
      case "subtract": memory -= Number(current) || 0; track("memory"); break;
      case "recall": current = fmt(memory); waiting = true; break;
      case "clear": memory = 0; break;
    }
    render();
    talk("memory");
  }));

  window.Calculator = {
    getValue: () => Number(current) || 0,
    getText: () => current,
    getHistory: () => history,
    setReadingEnabled(v) { readingOn = !!v; render(); },
    operator: chooseOperator,
    send,
    unary
  };

  updateHistory();
})();
