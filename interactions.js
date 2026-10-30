(() => {
  document.querySelectorAll(".menu-item").forEach(btn =>
    btn.addEventListener("click", () => {
      window.UI.showPanel(btn.dataset.panel);
      if (btn.dataset.panel === "history") window.Computer?.say("idle");
    }));

  // ความลับเล็กๆ: คลิกแถบชื่อรัวๆ
  let taps = 0, reset;
  document.querySelector(".window-titlebar").addEventListener("click", () => {
    taps++;
    clearTimeout(reset);
    reset = setTimeout(() => { taps = 0; }, 2200);
    if (taps === 4) { window.Computer?.react("secret"); taps = 0; }
  });
})();
