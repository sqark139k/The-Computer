(() => {
  const $ = id => document.getElementById(id);
  const calc = () => window.Calculator;
  const track = name => window.Achievements?.track(name);
  const money = n => n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const clean = n => Number(n.toPrecision(10));
  const numOf = id => ($(id).value === "" ? NaN : Number($(id).value));
  const isNum = v => typeof v === "number" && Number.isFinite(v);

  // ---------- แท็บย่อย ----------
  document.querySelectorAll(".tool-tab").forEach(tab => tab.addEventListener("click", () => {
    document.querySelectorAll(".tool-tab").forEach(t => t.classList.toggle("active", t === tab));
    document.querySelectorAll(".tool-section").forEach(s => s.classList.toggle("active", s.id === "tool-" + tab.dataset.tool));
  }));

  // ---------- วิทยาศาสตร์ ----------
  let degrees = true;
  const toRad = x => (degrees ? x * Math.PI / 180 : x);
  const trig = r => (Math.abs(r) < 1e-12 ? 0 : r);
  const fact = x => {
    if (!Number.isInteger(x) || x < 0 || x > 170) return NaN;
    let r = 1;
    for (let i = 2; i <= x; i++) r *= i;
    return r;
  };
  // [ป้าย, ชื่อในประวัติ, ฟังก์ชัน หรือ ชนิดพิเศษ]
  const SCI = [
    ["√", "√", x => Math.sqrt(x)], ["∛", "∛", x => Math.cbrt(x)], ["x²", "sqr", x => x * x], ["x³", "cube", x => x * x * x],
    ["xʸ", "", "pow"], ["1/x", "1/x", x => (x === 0 ? NaN : 1 / x)], ["|x|", "abs", x => Math.abs(x)], ["n!", "fact", fact],
    ["sin", "sin", x => trig(Math.sin(toRad(x))), "trig"], ["cos", "cos", x => trig(Math.cos(toRad(x))), "trig"],
    ["tan", "tan", x => (degrees && (x - 90) % 180 === 0 ? NaN : trig(Math.tan(toRad(x)))), "trig"], ["log", "log", x => Math.log10(x)],
    ["ln", "ln", x => Math.log(x)], ["eˣ", "exp", x => Math.exp(x)], ["10ˣ", "10^", x => Math.pow(10, x)], ["π", "π", "const"],
    ["e", "e", "const"], ["สุ่ม", "สุ่ม", "rand"]
  ];

  const sciGrid = $("sciGrid");
  SCI.forEach(([label, name, fn, kind]) => {
    const b = document.createElement("button");
    b.className = "sci-btn" + (fn === "const" || fn === "rand" ? " const" : "");
    b.textContent = label;
    b.addEventListener("click", () => {
      const c = calc();
      if (fn === "pow") {
        c.operator("^");
        window.UI.showPanel("calculator");
        window.UI.toast("พิมพ์เลขชี้กำลัง แล้วกด =");
        track("sci");
      } else if (fn === "const") {
        c.send(label === "π" ? Math.PI : Math.E, label);
        window.Computer?.react("sci"); track("sci");
      } else if (fn === "rand") {
        c.send(Number(Math.random().toFixed(6)), "สุ่ม");
        window.Computer?.react("sci"); track("sci");
      } else {
        c.unary(name, fn, kind === "trig" && degrees ? "°" : "");
      }
      updateSciValue();
      window.Computer?.clickSound("key");
    });
    sciGrid.appendChild(b);
  });

  function updateSciValue() { $("sciValue").textContent = calc().getText(); }
  $("degToggle").addEventListener("click", () => {
    degrees = !degrees;
    $("degToggle").textContent = degrees ? "DEG" : "RAD";
  });

  // ---------- แปลงหน่วย ----------
  const CATS = {
    money: {
      label: "สกุลเงิน", def: ["USD", "THB"],
      units: { THB: ["บาท (THB)", 1], USD: ["ดอลลาร์ สรอ. (USD)", 33], EUR: ["ยูโร (EUR)", 38], JPY: ["เยน (JPY)", 0.22], CNY: ["หยวน (CNY)", 4.6], GBP: ["ปอนด์ (GBP)", 44] }
    },
    area: {
      label: "พื้นที่", def: ["rai", "sqw"],
      units: { sqm: ["ตารางเมตร", 1], sqw: ["ตารางวา", 4], ngan: ["งาน", 400], rai: ["ไร่", 1600], ha: ["เฮกตาร์", 10000], sqkm: ["ตารางกิโลเมตร", 1e6], acre: ["เอเคอร์", 4046.8564224] }
    },
    length: {
      label: "ความยาว", def: ["m", "ft"],
      units: { m: ["เมตร", 1], km: ["กิโลเมตร", 1000], cm: ["เซนติเมตร", 0.01], wa: ["วา", 2], sen: ["เส้น", 40], ft: ["ฟุต", 0.3048], in: ["นิ้ว", 0.0254], mi: ["ไมล์", 1609.344] }
    },
    weight: {
      label: "น้ำหนัก", def: ["kg", "lb"],
      units: { kg: ["กิโลกรัม", 1], g: ["กรัม", 0.001], ton: ["ตัน", 1000], lb: ["ปอนด์", 0.45359237], oz: ["ออนซ์", 0.028349523125], gold: ["บาท (ทองคำแท่ง)", 0.015244] }
    },
    temp: {
      label: "อุณหภูมิ", def: ["C", "F"],
      units: { C: ["องศาเซลเซียส (°C)"], F: ["องศาฟาเรนไฮต์ (°F)"], K: ["เคลวิน (K)"] }
    }
  };
  const RATE_KEY = "theComputer.rates";
  try {
    const saved = JSON.parse(localStorage.getItem(RATE_KEY) || "{}");
    Object.keys(saved).forEach(k => { if (CATS.money.units[k] && saved[k] > 0) CATS.money.units[k][1] = saved[k]; });
  } catch (err) { /* ใช้ค่าตั้งต้น */ }

  let lastConv = NaN;
  const shortName = text => text.split(" (")[0];

  function toBase(cat, unit, x) {
    if (cat !== "temp") return x * CATS[cat].units[unit][1];
    return unit === "C" ? x : unit === "F" ? (x - 32) * 5 / 9 : x - 273.15;
  }
  function fromBase(cat, unit, x) {
    if (cat !== "temp") return x / CATS[cat].units[unit][1];
    return unit === "C" ? x : unit === "F" ? x * 9 / 5 + 32 : x + 273.15;
  }

  function fillUnits(select, cat, value) {
    select.innerHTML = Object.entries(CATS[cat].units).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join("");
    select.value = value;
  }

  function renderRates(cat) {
    const box = $("rateBox");
    if (cat !== "money") { box.style.display = "none"; box.innerHTML = ""; return; }
    box.style.display = "block";
    box.innerHTML = '<p class="panel-note">อัตราแลกเปลี่ยนเป็นค่าตัวอย่าง ไม่ใช่อัตราจริง แก้ให้ตรงกับวันนี้ได้ (1 หน่วย = กี่บาท)</p><div class="rate-grid">' +
      Object.entries(CATS.money.units).filter(([k]) => k !== "THB").map(([k, v]) =>
        `<label class="rate-item"><span>1 ${k} =</span><input type="number" step="any" min="0" data-rate="${k}" value="${v[1]}"><span>บาท</span></label>`).join("") + "</div>";
  }

  function setCategory(cat) {
    $("convCat").value = cat;
    fillUnits($("convFrom"), cat, CATS[cat].def[0]);
    fillUnits($("convTo"), cat, CATS[cat].def[1]);
    renderRates(cat);
    convert();
  }

  function convert() {
    const cat = $("convCat").value;
    const x = numOf("convIn");
    if (!isNum(x)) { $("convOut").textContent = "—"; lastConv = NaN; return; }
    lastConv = fromBase(cat, $("convTo").value, toBase(cat, $("convFrom").value, x));
    $("convOut").textContent = isNum(lastConv) ? clean(lastConv).toLocaleString("th-TH", { maximumFractionDigits: 6 }) : "—";
  }

  $("convCat").innerHTML = Object.entries(CATS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("");
  $("convCat").addEventListener("change", () => setCategory($("convCat").value));
  ["convFrom", "convTo"].forEach(id => $(id).addEventListener("change", convert));
  $("convIn").addEventListener("input", () => { convert(); track("convert"); });
  $("convSwap").addEventListener("click", () => {
    const f = $("convFrom").value;
    $("convFrom").value = $("convTo").value;
    $("convTo").value = f;
    convert();
  });
  $("convSend").addEventListener("click", () => {
    if (!isNum(lastConv)) { window.UI.toast("ยังไม่มีผลลัพธ์ให้ส่ง"); return; }
    const label = `${$("convIn").value} ${shortName(CATS[$("convCat").value].units[$("convFrom").value][0])} → ${shortName(CATS[$("convCat").value].units[$("convTo").value][0])}`;
    calc().send(clean(lastConv), label);
    track("convert");
    window.UI.showPanel("calculator");
  });
  $("rateBox").addEventListener("input", e => {
    const k = e.target.dataset.rate;
    const v = Number(e.target.value);
    if (!k || !(v > 0)) return;
    CATS.money.units[k][1] = v;
    try {
      const saved = JSON.parse(localStorage.getItem(RATE_KEY) || "{}");
      saved[k] = v;
      localStorage.setItem(RATE_KEY, JSON.stringify(saved));
    } catch (err) { /* ไม่เป็นไร */ }
    convert();
  });

  // ---------- เงิน: VAT / หารบิล ----------
  const sendBtn = (value, label) => `<button class="chip send" data-val="${value}" data-label="${label}">ส่งไปจอ</button>`;
  const row = (label, value, send) => `<div class="res-row"><span>${label}</span><b>${money(value)}</b>${send ? sendBtn(value, send) : "<i></i>"}</div>`;
  const hint = '<p class="panel-note">ใส่ตัวเลขเพื่อคำนวณ</p>';

  function renderVat() {
    const a = numOf("vatAmount"), r = numOf("vatRate") / 100;
    if (!isNum(a) || !isNum(r)) { $("vatResult").innerHTML = hint; return; }
    const vatAdd = a * r, totalAdd = a + vatAdd;
    const base = a / (1 + r), vatIn = a - base;
    $("vatResult").innerHTML =
      '<div class="res-title">ถ้าเป็นราคาก่อน VAT</div>' +
      row("VAT", vatAdd, "VAT") + row("ราคารวม VAT", totalAdd, "ราคารวม VAT") +
      '<div class="res-title">ถ้าเป็นราคารวม VAT แล้ว</div>' +
      row("ราคาก่อน VAT", base, "ราคาก่อน VAT") + row("VAT ที่แฝงอยู่", vatIn, "VAT ที่แฝงอยู่");
  }

  function renderBill() {
    const bill = numOf("billAmount"), svc = numOf("svcRate") / 100, vr = numOf("vatRate") / 100;
    const people = Math.max(1, Math.floor(numOf("people")) || 1);
    if (!isNum(bill) || !isNum(svc)) { $("billResult").innerHTML = hint; return; }
    const service = bill * svc, sub = bill + service;
    const vat = $("billVat").checked && isNum(vr) ? sub * vr : 0;
    const total = sub + vat;
    const per = Math.ceil(total / people * 100) / 100;
    $("billResult").innerHTML =
      row("ค่าอาหาร", bill) + row("ค่าบริการ", service) + (vat ? row("VAT (ตามอัตราด้านบน)", vat) : "") +
      row("รวมทั้งหมด", total, "ยอดรวมบิล") + row(`ต่อคน (หาร ${people})`, per, `บิลต่อคน ÷${people}`);
  }

  [["vatAmount", renderVat], ["vatRate", () => { renderVat(); renderBill(); }]].forEach(([id, fn]) =>
    $(id).addEventListener("input", () => { fn(); if (isNum(numOf("vatAmount"))) track("money"); }));
  ["billAmount", "svcRate", "people", "billVat"].forEach(id =>
    $(id).addEventListener("input", () => { renderBill(); if (isNum(numOf("billAmount"))) track("money"); }));
  $("billVat").addEventListener("change", renderBill);

  // ---------- อ่านเลข ----------
  function renderRead() {
    const str = $("readIn").value.trim();
    const text = window.ThaiNumber.read(str);
    $("readText").textContent = text || "—";
    $("readBaht").textContent = str && isNum(Number(str)) ? (window.ThaiNumber.bahtText(Number(str)) || "—") : "—";
  }
  $("readIn").addEventListener("input", () => { renderRead(); if ($("readIn").value) track("read"); });

  // ---------- ปุ่มร่วม ----------
  $("toolsPanel").addEventListener("click", async e => {
    const send = e.target.closest(".send");
    if (send) {
      calc().send(Number(send.dataset.val), send.dataset.label);
      window.UI.showPanel("calculator");
      return;
    }
    const fill = e.target.closest(".fill");
    if (fill) {
      const text = calc().getText();
      const target = $(fill.dataset.target);
      target.value = text === "ERROR" ? "" : text;
      target.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    const copy = e.target.closest(".copy");
    if (copy) {
      const text = $(copy.dataset.from).textContent;
      if (!text || text === "—") return;
      try { await navigator.clipboard.writeText(text); window.UI.toast("คัดลอกแล้ว"); }
      catch { window.UI.toast("เบราว์เซอร์นี้คัดลอกให้ไม่ได้"); }
    }
  });

  document.addEventListener("tc:panel", e => { if (e.detail === "tools") updateSciValue(); });

  setCategory("money");
  renderVat();
  renderBill();
  renderRead();
})();
