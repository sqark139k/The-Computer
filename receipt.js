// บันทึกม้วนใบเสร็จ (ประวัติการคำนวณ) เป็นรูปภาพ PNG
(() => {
  const btn = document.getElementById("saveReceipt");

  function draw(items) {
    const S = 2, W = 420, PAD = 26, LH = 26, HEAD = 128, FOOT = 168;
    const H = HEAD + items.length * LH + FOOT;
    const c = document.createElement("canvas");
    c.width = W * S; c.height = H * S;
    const ctx = c.getContext("2d");
    ctx.scale(S, S);
    const MONO = "'IBM Plex Mono','Courier New',monospace";
    const INK = "#3d382c";

    // กระดาษพร้อมขอบหยัก
    ctx.fillStyle = "#f8f4e8";
    ctx.beginPath();
    const step = 12, teeth = Math.round(W / step);
    ctx.moveTo(0, 8);
    for (let i = 0; i <= teeth; i++) ctx.lineTo(i * step, i % 2 ? 0 : 8);
    ctx.lineTo(W, H - 8);
    for (let i = teeth; i >= 0; i--) ctx.lineTo(i * step, i % 2 ? H : H - 8);
    ctx.closePath();
    ctx.fill();

    const dashed = y => {
      ctx.save();
      ctx.strokeStyle = "#9b917a"; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
      ctx.restore();
    };

    ctx.fillStyle = INK; ctx.textAlign = "center";
    ctx.font = `700 20px ${MONO}`;
    ctx.fillText("THE COMPUTER.EXE", W / 2, 52);
    ctx.font = `13px ${MONO}`;
    ctx.fillText("ใบเสร็จการคำนวณ", W / 2, 76);
    ctx.fillStyle = "#7b705b"; ctx.font = `11px ${MONO}`;
    ctx.fillText(new Date().toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }), W / 2, 96);
    dashed(112);

    ctx.textAlign = "left";
    items.forEach((it, i) => {
      const y = HEAD + i * LH + 8;
      const no = String(it.no).padStart(2, "0");
      ctx.font = `700 13px ${MONO}`;
      const right = it.result;
      const rw = ctx.measureText(right).width;
      ctx.font = `13px ${MONO}`;
      let left = `${no}  ${it.line}`;
      const maxLeft = W - PAD * 2 - rw - 24;
      while (ctx.measureText(left).width > maxLeft && left.length > 6) left = left.slice(0, -2);
      if (left !== `${no}  ${it.line}`) left += "…";
      const lw = ctx.measureText(left).width;
      ctx.fillStyle = "#7b705b"; ctx.fillText(left, PAD, y);
      ctx.save();
      ctx.strokeStyle = "#b5aa90"; ctx.setLineDash([1, 3]);
      ctx.beginPath(); ctx.moveTo(PAD + lw + 6, y - 3); ctx.lineTo(W - PAD - rw - 6, y - 3); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = INK; ctx.font = `700 13px ${MONO}`; ctx.textAlign = "right";
      ctx.fillText(right, W - PAD, y); ctx.textAlign = "left";
    });

    const fy = HEAD + items.length * LH + 6;
    dashed(fy);
    ctx.fillStyle = INK; ctx.font = `700 14px ${MONO}`;
    ctx.fillText("รวมทั้งหมด", PAD, fy + 28);
    ctx.textAlign = "right"; ctx.fillText(`${items.length} รายการ`, W - PAD, fy + 28);
    ctx.textAlign = "center"; ctx.font = `12px ${MONO}`; ctx.fillStyle = "#7b705b";
    ctx.fillText("ขอบคุณที่ใช้บริการ", W / 2, fy + 56);

    // บาร์โค้ดประดับ (คงที่ตามจำนวนรายการ)
    let seed = items.length * 9301 + 49297;
    const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    ctx.fillStyle = INK;
    let x = PAD + 20;
    while (x < W - PAD - 20) { const w = 1 + Math.floor(rand() * 3); ctx.fillRect(x, fy + 70, w, 34); x += w + 1 + Math.floor(rand() * 3); }
    return c;
  }

  btn.addEventListener("click", () => {
    const items = window.Calculator.getHistory().slice().reverse(); // เก่า -> ใหม่ เหมือนม้วนใบเสร็จจริง
    if (!items.length) { window.UI.toast("ยังไม่มีรายการให้พิมพ์"); return; }
    const canvas = draw(items);
    const d = new Date(), p = n => String(n).padStart(2, "0");
    const name = `receipt-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.png`;
    canvas.toBlob(blob => {
      if (!blob) { window.UI.toast("สร้างรูปไม่สำเร็จ"); return; }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      window.UI.toast("บันทึกใบเสร็จเป็นรูปแล้ว");
      window.Achievements?.track("receipt");
    }, "image/png");
  });
})();
