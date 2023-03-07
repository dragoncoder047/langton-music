var DARK_MODE = false;
(function() {
    if (!window.matchMedia) return;
    var mm = window.matchMedia("(prefers-color-scheme: dark)");
    darkMode = mm.matches;
    mm.addEventListener('change', () => darkMode = mm.matches);
})();
