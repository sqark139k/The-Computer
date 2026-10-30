(() => {
  const KEY = "theComputer.settings";
  const DEFAULTS = {
    scanlinesToggle: true, glowToggle: true, dialogueToggle: true, soundToggle: true,
    voiceToggle: true, sleepToggle: true, readingToggle: true
  };
  const el = Object.fromEntries(Object.keys(DEFAULTS).map(id => [id, document.getElementById(id)]));

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
      Object.keys(DEFAULTS).forEach(id => { if (typeof saved[id] === "boolean") el[id].checked = saved[id]; });
    } catch (err) { /* ใช้ค่าเริ่มต้น */ }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(Object.keys(el).map(id => [id, el[id].checked]))));
    } catch (err) { /* ไม่เป็นไร */ }
  }

  function apply() {
    document.body.classList.toggle("scanlines-on", el.scanlinesToggle.checked);
    document.body.classList.toggle("glow-on", el.glowToggle.checked);
    window.Computer?.setDialogueEnabled(el.dialogueToggle.checked);
    window.Computer?.setSoundEnabled(el.soundToggle.checked);
    window.Computer?.setVoiceEnabled(el.voiceToggle.checked);
    window.Computer?.setSleepEnabled(el.sleepToggle.checked);
    window.Calculator?.setReadingEnabled(el.readingToggle.checked);
    save();
  }

  Object.values(el).forEach(input => input.addEventListener("change", apply));
  document.getElementById("resetSettings").addEventListener("click", () => {
    Object.keys(DEFAULTS).forEach(id => { el[id].checked = DEFAULTS[id]; });
    apply();
  });

  load();
  apply();
})();
