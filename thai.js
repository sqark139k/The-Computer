// แปลงตัวเลขเป็นคำอ่านภาษาไทย
window.ThaiNumber = (() => {
  const D = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  const U = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

  // อ่านเลขไม่เกิน 6 หลัก (หลักสิบ-แสน)
  function chunk(s, hasHigher) {
    const len = s.length;
    let out = "";
    for (let i = 0; i < len; i++) {
      const d = Number(s[i]);
      const pos = len - 1 - i;
      if (d === 0) continue;
      if (pos === 0) out += d === 1 && (len > 1 || hasHigher) ? "เอ็ด" : D[d];
      else if (pos === 1) out += d === 1 ? "สิบ" : d === 2 ? "ยี่สิบ" : D[d] + "สิบ";
      else out += D[d] + U[pos];
    }
    return out;
  }

  // อ่านจำนวนเต็มทุกขนาด (แบ่งทีละ 6 หลักต่อ "ล้าน")
  function readInt(str) {
    str = str.replace(/^0+(?=\d)/, "");
    if (/^0+$/.test(str)) return D[0];
    const parts = [];
    for (let end = str.length; end > 0; end -= 6) parts.unshift(str.slice(Math.max(0, end - 6), end));
    return parts.map((p, i) => {
      const isTop = i === 0;
      const isLast = i === parts.length - 1;
      const text = /[1-9]/.test(p) ? chunk(p, !isTop) : "";
      return text + (isLast ? "" : "ล้าน");
    }).join("");
  }

  function read(str) {
    str = String(str).replace(/\.$/, "");
    if (!/^-?\d+(\.\d+)?$/.test(str)) return "";
    const neg = str[0] === "-";
    const [i, f] = str.replace("-", "").split(".");
    const ip = i.replace(/^0+(?=\d)/, "");
    if (ip.length > 15) return "";
    let out = readInt(ip);
    if (f) out += "จุด" + f.slice(0, 12).split("").map(c => D[Number(c)]).join("");
    if (neg && /[1-9]/.test(ip + (f || ""))) out = "ลบ" + out;
    return out;
  }

  // อ่านจำนวนเงิน เช่น 1250.5 -> หนึ่งพันสองร้อยห้าสิบบาทห้าสิบสตางค์
  function bahtText(num) {
    const x = Number(num);
    if (!Number.isFinite(x)) return "";
    const total = Math.round(Math.abs(x) * 100);
    const baht = Math.floor(total / 100);
    const satang = total % 100;
    if (baht >= 1e15) return "";
    let out = "";
    if (baht > 0 || satang === 0) out += readInt(String(baht)) + "บาท";
    out += satang === 0 ? "ถ้วน" : readInt(String(satang)) + "สตางค์";
    return (x < 0 && total > 0 ? "ลบ" : "") + out;
  }

  return { read, bahtText, readInt };
})();
