// Runs before the app: paints the page in the colors this browser used last,
// so it doesn't flash teal first. The app takes over once it has loaded.
(function () {
  try {
    var look = JSON.parse(localStorage.getItem("talaan.look") || "null");
    if (!look) return;
    var root = document.documentElement;
    var dark =
      look.mode === "dark" ||
      (look.mode === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    var tokens = dark ? look.dark : look.light;
    for (var name in tokens) {
      root.style.setProperty("--color-" + name, tokens[name]);
    }
    for (var paper in look.light) {
      root.style.setProperty("--paper-" + paper, look.light[paper]);
    }
    root.setAttribute("data-theme", dark ? "dark" : "light");
    root.setAttribute("data-text", look.textSize || "normal");
  } catch (e) {
    // Nothing kept, or storage is off: the usual colors
  }
})();
