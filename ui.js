// ตัวช่วยกลางของหน้าเว็บ: toast และสลับแผงหน้าจอ
window.UI = (() => {
  const panels = {
    calculator: "calculatorPanel",
    history: "historyPanel",
    memory: "memoryPanel",
    tools: "toolsPanel",
    game: "gamePanel",
    achievements: "achievementsPanel",
    settings: "settingsPanel"
  };
  let toastTimer;

  function toast(message) {
    const el = document.getElementById("toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 1900);
  }

  function showPanel(name) {
    if (!panels[name]) return;
    document.querySelectorAll(".menu-item").forEach(b => b.classList.toggle("active", b.dataset.panel === name));
    Object.entries(panels).forEach(([key, id]) => document.getElementById(id).classList.toggle("active", key === name));
    document.dispatchEvent(new CustomEvent("tc:panel", { detail: name }));
  }

  return { toast, showPanel };
})();
