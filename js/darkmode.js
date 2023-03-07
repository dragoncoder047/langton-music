var DARK_MODE = false;
(function () {
    if (window.matchMedia) {
        var mm = window.matchMedia("(prefers-color-scheme: dark)");
        darkMode = mm.matches;
        mm.addEventListener('change', () => {
            darkMode = mm.matches;
        });
    } else {
        var h1 = document.querySelector('h1');
        setInterval(() => {
            var s = window.getComputedStyle(h1);
            DARK_MODE = s.getPropertyValue('color') == 'white';
        }, 200);
    }
})();
