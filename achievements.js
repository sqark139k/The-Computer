// ระบบผลงาน (แบดจ์) เก็บในเครื่องด้วย localStorage
window.Achievements = (() => {
  const KEY = "theComputer.achievements.v1";
  const DEFS = [
    { id: "first_calc", title: "บทเรียนแรก", desc: "กด = เป็นครั้งแรก" },
    { id: "calc50", title: "สายคำนวณ", desc: "คำนวณครบ 50 ครั้ง" },
    { id: "calc200", title: "นักบัญชีตัวจริง", desc: "คำนวณครบ 200 ครั้ง" },
    { id: "div0", title: "ทำลายล้างจักรวาล", desc: "หารด้วยศูนย์เป็นครั้งแรก" },
    { id: "chain10", title: "ลูกโซ่ไม่รู้จบ", desc: "ต่อคำตอบเป็นลูกโซ่ 10 ครั้งติด" },
    { id: "n42", title: "คำตอบของทุกสิ่ง", desc: "ได้ผลลัพธ์เป็น 42" },
    { id: "n69", title: "เนอะ", desc: "ได้ผลลัพธ์เป็น 69" },
    { id: "n404", title: "ไม่พบหน้านี้", desc: "ได้ผลลัพธ์เป็น 404" },
    { id: "n1337", title: "ชาว 1337", desc: "ได้ผลลัพธ์เป็น 1337" },
    { id: "big", title: "เลขหลักพันล้าน", desc: "ได้ผลลัพธ์ตั้งแต่ 1,000,000,000 ขึ้นไป" },
    { id: "night", title: "นกฮูกยามดึก", desc: "คิดเลขช่วงเที่ยงคืนถึงตีสี่" },
    { id: "ac10", title: "ใจร้อน", desc: "กด AC สะสมครบ 10 ครั้ง" },
    { id: "mem", title: "ผู้จัดเก็บ", desc: "ใช้หน่วยความจำ M+ หรือ M−" },
    { id: "sci", title: "นักวิทย์", desc: "ใช้ฟังก์ชันวิทยาศาสตร์" },
    { id: "convert", title: "นักแปลงหน่วย", desc: "ใช้เครื่องมือแปลงหน่วย" },
    { id: "money", title: "นักการเงิน", desc: "คิดภาษีหรือหารบิล" },
    { id: "read", title: "คนอ่านเลข", desc: "ใช้เครื่องมืออ่านเลขเป็นภาษาไทย" },
    { id: "copy", title: "ก็อปปี้เปสต์", desc: "คัดลอกผลลัพธ์" },
    { id: "poke", title: "จิ้มไม่เลิก", desc: "เจอความลับของตัวละคร" },
    { id: "wake", title: "ปลุกคนหลับ", desc: "ปลุกตัวละครที่หลับอยู่" },
    { id: "game1", title: "ผู้ท้าชิง", desc: "เล่นเกมท้าทายจนจบหนึ่งรอบ" },
    { id: "game_perfect", title: "เป๊ะทุกข้อ", desc: "ตอบถูกครบ 10 ข้อในเกม" },
    { id: "game150", title: "มือไวแสง", desc: "ทำคะแนนในเกมตั้งแต่ 150" },
    { id: "receipt", title: "นักสะสมใบเสร็จ", desc: "บันทึกใบเสร็จเป็นรูปภาพ" }
  ];
  const SIMPLE = { memory: "mem", sci: "sci", convert: "convert", money: "money", read: "read", copy: "copy", poke: "poke", wake: "wake", receipt: "receipt", divzero: "div0" };
  const SPECIAL = { 42: "n42", 69: "n69", 404: "n404", 1337: "n1337" };

  let data = { unlocked: {}, stats: { calcs: 0, clears: 0 } };
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || "{}");
    data.unlocked = p.unlocked || {};
    data.stats = Object.assign(data.stats, p.stats || {});
  } catch (err) { /* เริ่มใหม่ */ }

  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (err) { /* ไม่เป็นไร */ } };
  const count = () => DEFS.filter(d => data.unlocked[d.id]).length;

  function render() {
    const grid = document.getElementById("achGrid");
    if (!grid) return;
    grid.innerHTML = DEFS.map(d => data.unlocked[d.id]
      ? `<div class="ach-card unlocked"><b>■ ${d.title}</b><span>${d.desc}</span></div>`
      : `<div class="ach-card"><b>□ ???</b><span>${d.desc}</span></div>`).join("");
    document.getElementById("achProgress").textContent = `${count()}/${DEFS.length}`;
    document.getElementById("achCount").textContent = count();
  }

  function unlock(id) {
    if (data.unlocked[id]) return;
    const def = DEFS.find(d => d.id === id);
    if (!def) return;
    data.unlocked[id] = Date.now();
    save();
    render();
    window.UI?.toast(`ปลดล็อกผลงาน: ${def.title}`);
    setTimeout(() => { if (!window.Computer?.isSleeping()) window.Computer?.say("achievement"); }, 1600);
  }

  function track(event, d = {}) {
    const s = data.stats;
    if (SIMPLE[event]) unlock(SIMPLE[event]);
    switch (event) {
      case "equals": {
        s.calcs++;
        unlock("first_calc");
        if (s.calcs >= 50) unlock("calc50");
        if (s.calcs >= 200) unlock("calc200");
        if (SPECIAL[d.result]) unlock(SPECIAL[d.result]);
        if (Math.abs(d.result) >= 1e9) unlock("big");
        if (new Date().getHours() < 5) unlock("night");
        break;
      }
      case "chain": if (d.count >= 10) unlock("chain10"); break;
      case "clear": s.clears++; if (s.clears >= 10) unlock("ac10"); break;
      case "gameEnd":
        unlock("game1");
        if (d.correct >= 10) unlock("game_perfect");
        if (d.score >= 150) unlock("game150");
        break;
    }
    save();
  }

  document.getElementById("resetAch")?.addEventListener("click", () => {
    if (!window.confirm("ล้างผลงานทั้งหมดและเริ่มสะสมใหม่?")) return;
    data = { unlocked: {}, stats: { calcs: 0, clears: 0 } };
    save();
    render();
    window.UI?.toast("ล้างผลงานแล้ว");
  });

  render();
  return { track, list: () => DEFS, isUnlocked: id => !!data.unlocked[id] };
})();
