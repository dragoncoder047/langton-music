/**
 * Threshold value for bailing because too many ants are spawning.
 * @type {number}
 */
const TOO_MANY_ANTS = 64;

/**
 * Selector
 * @param {string} s Selector
 * @returns {HTMLElement}
 */
const $ = s => document.querySelector(s);

/**
 * @type {HTMLCanvasElement}
 */
const playfield = $('#playfield');
/**
 * @type {HTMLButtonElement}
 */
const startStopBtn = $('#startstop');
/**
 * @type {HTMLButtonElement}
 */
const stepBtn = $('#step');
/**
 * @type {HTMLOutputElement}
 */
const stepCounter = $('#stepnum');
/**
 * @type {HTMLInputElement}
 */
const speedSlider = $('#speedslider');
/**
 * @type {HTMLInputElement}
 */
const speedBox = $('#speedbox');
/**
 * @type {HTMLInputElement}
 */
const muteCheckbox = $('#mutecheck');
/**
 * @type {HTMLOutputElement}
 */
const antsCounter = $('#antscount');
/**
 * @type {HTMLButtonElement}
 */
const loadBtn = $('#loadbtn');
/**
 * @type {HTMLButtonElement}
 */
const dumpBtn = $('#dumpbtn');
/**
 * @type {HTMLOutputElement}
 */
const statusBar = $('#statusbar');
/**
 * @type {HTMLButtonElement}
 */
const fitBtn = $('#fit');
/**
 * @type {HTMLInputElement}
 */
const autoFit = $('#autofit');
/**
 * @type {HTMLSelectElement}
 */
const followSelector = $('#follow');
/**
 * @type {HTMLSelectElement}
 */
const actionsSelector = $('#actions');
/**
 * @type {HTMLDivElement}
 */
const debugBar = $('#debugbar');

ace.config.set('basePath', 'https://cdn.jsdelivr.net/npm/ace-builds@1.10.0/src-noconflict/');
const textbox = ace.edit('textbox', { mode: 'ace/mode/xml' });

function debug(message) {
    return;
    try {
        debugBar.textContent = message || '';
    } catch (e) { }
    console.trace(message);
}

/**
 * @type {Ant[]}
 */
var ants = [];
/**
 * @type {Breeder}
 */
var breeder = new Breeder();
/**
 * @type {CanvasRenderingContext2D}
 */
var mainCtx = playfield.getContext('2d');
/**
 * @type {World}
 */
var world = new World();
/**
 * @type {CanvasToolsManager}
 */
var canvasTools = new CanvasToolsManager(playfield, $('#toolselect'), $('#tooloption'), [
    new DragTool(),
    new DrawCellsTool(world),
    new DrawAntsTool(world, breeder, ants),
]);
/**
 * @type {object}
 */
var header = { stepCount: 0 };
/**
 * @type {string[][]}
 */
var interpolations = [];

/**
 * @type {ActionManager}
 */
var actions = new ActionManager();

/**
 * Shows the text in the status bar.
 * @param {string} text Text to show
 * @param {string} [color='black'] Color; default is black
 */
function showStatus(text, color) {
    statusBar.value = text;
    statusBar.style.color = color || (DARK_MODE ? 'white' : 'black');
}

/**
 * Enables or disable sthe Play/Pause and Step buttons if an error occurred of something changed.
 * @param {boolean} canRun Whether the buttons should be enabled.
 */
function runEnable(canRun) {
    if (canRun) {
        startStopBtn.removeAttribute('disabled');
        stepBtn.removeAttribute('disabled');
    } else {
        startStopBtn.setAttribute('disabled', true);
        stepBtn.setAttribute('disabled', true);
    }
}

/**
 * Render loop function
 */
function render() {
    canvasTools.clear();
    canvasTools.drawTransformed(() => {
        world.draw(mainCtx);
        ants.forEach(ant => ant.draw(mainCtx));
    });
    requestAnimationFrame(render);
}
render();

/**
 * @type {boolean}
 */
var running = false;

/**
 * @type {boolean}
 */
var GLOBAL_MUTE = false;

actions.action('start', () => {
    if (!running) {
        running = true;
        tick();
    }
    startStopBtn.textContent = 'Pause';
    showStatus('Running...');
    mediaPlay();
    syncMediaSession();
});

actions.action('stop', () => {
    running = false;
    startStopBtn.textContent = 'Resume';
    showStatus('Paused.');
    mediaPause();
    syncMediaSession();
});

actions.action('step', () => {
    actions.trigger('stop');
    tick(true);
});

actions.action('playpause', () => {
    actions.trigger(running ? 'stop' : 'start');
});

startStopBtn.addEventListener('click', () => actions.trigger('playpause'));
stepBtn.addEventListener('click', () => actions.trigger('step'));

/**
 * Runs the world one tick.
 * @param {boolean} force Force run one tick.
 */
function tick(force = false) {
    if (!running && !force) return;
    syncMediaSession();
    setMediaPlaybackState();
    try {
        ants.slice().forEach(ant => ant.tick());
        header.stepCount++;
    } catch (e) {
        actions.trigger('stop');
        runEnable(false);
        showStatus('Error: ' + e.toString(), 'red');
        throw e;
    }
    if (ants.length > TOO_MANY_ANTS) {
        actions.trigger('stop');
        showStatus('Too many ants. Select the "Draw Ants" tool, and ctrl+click on an ant to remove it.', 'red');
        return;
    }
    if (ants.every(ant => ant.halted)) {
        actions.trigger('stop');
        showStatus('All ants are halted.', 'blue');
        return;
    }
    ants.forEach(ant => { if (ant.dead) ants.splice(ants.indexOf(ant), 1); });
    if (!ants.length) {
        actions.trigger('stop');
        showStatus('All ants are dead.', 'blue');
        return;
    }
    stepCounter.textContent = header.stepCount;
    antsCounter.textContent = ants.length;
    var selectedAntID = followSelector.value;
    [].forEach.call(followSelector.childNodes, node => {
        if (node.id == 'nofollow') return; // Don't nix the NONE node
        if (node.value == '') node.remove(); // Nix it if it is empty
        else if (!ants.some(ant => ant.id == node.textContent))
            node.remove();
    });
    ants.forEach(ant => {
        if (![].some.call(followSelector.childNodes, node => node.textContent == ant.id)) {
            var n = document.createElement('option');
            n.textContent = n.value = ant.id;
            followSelector.append(n);
            runEnable(true);
        }
    });
    followSelector.value = ants.some(ant => ant.id === selectedAntID) ? selectedAntID : "";
    if (autoFit.checked && running) actions.trigger('fit');
    followAnt(followSelector.value);
    if (!force) setTimeout(tick, 60000 / (header.bpm ?? 240));
}

actions.action('autofit', (autofit) => {
    autoFit.checked = autofit;
});

/**
 * Loads the text from the text box and updates the world.
 */
actions.action('load', (value) => {
    actions.trigger('stop');
    header.stepCount = 0;
    showStatus('Loading...');
    if (value) textbox.setValue(value);
    try {
        header = loadWorld(value || textbox.getValue(), { Ant, Beetle, Cricket }, world, breeder, ants);
        interpolations = [];
        for (var prop of Object.getOwnPropertyNames(header)) {
            if (prop.startsWith('#')) interpolations.push([prop.slice(1), header[prop]]);
        }
        header.stepCount = header.stepCount || 0;
        actions.trigger('speedchange', header.bpm);
    } catch (e) {
        runEnable(false);
        showStatus('Error: ' + e.message, 'red');
        if ('line' in e && 'col' in e) {
            var { line, col, message } = e;
            textbox.getSession().setAnnotations([{
                row: line - 1, // Ace uses line 1 as row 0
                column: col,
                text: message,
                type: "error",
            }]);
        }
        throw e;
    }
    startStopBtn.textContent = 'Start';
    showStatus('Press START.');
    runEnable(true);
    actions.trigger('fit');
    syncMediaSession();
    setMediaPlaybackState();

});

loadBtn.addEventListener('click', () => Tone.start(), { once: true });
loadBtn.addEventListener('click', () => actions.trigger('load'));

// For media session api
[loadBtn, startStopBtn, stepBtn].forEach(b => b.addEventListener('click', forcePlayElement, { once: true }));

actions.action('fit', () => {
    var bbox = world.bbox(ants);
    var middle = vScale(vPlus(bbox.tl, bbox.br), 0.5);
    var dimensions = vPlus({ x: 1, y: 1 }, vMinus(bbox.br, bbox.tl)); // +1 to preclude dividing by zero
    var leftRightZoom = playfield.width / dimensions.x / world.cellSize;
    var upDownZoom = playfield.height / dimensions.y / world.cellSize;
    canvasTools.zoom = Math.min(upDownZoom, leftRightZoom);
    center(middle);
});
fitBtn.addEventListener('click', () => actions.trigger('fit'));
actions.trigger('fit');

actions.action('speedchange', (value) => {
    value = parseInt(value);
    if (!value || value === 0) value = 240;
    header.bpm = value;
    if (header.bpm < 1000) {
        Tone.Transport.bpm.setValueAtTime(2 * header.bpm, Tone.now());
        Tone.Transport.start();
        enableMute(true);
    } else {
        Tone.Transport.stop();
        enableMute(false);
        showStatus('BPM too high. Sound is disabled.');
    }
    speedBox.value = value;
    speedSlider.value = value;
    setMediaPlaybackState(); // Media session api
    syncMediaSession();
});
speedBox.addEventListener('input', () => actions.trigger('speedchange', speedBox.value));
speedSlider.addEventListener('input', () => actions.trigger('speedchange', speedSlider.value));

try {
    var saved = localStorage.getItem('save');
    if (saved) {
        actions.trigger('load', saved);
        showStatus('Loaded from localStorage.', DARK_MODE ? 'lime' : 'green');
    } else {
        actions.trigger('load', `
<langton><config name="author">Christopher Langton</config><config name="title">Langton Drums</config><config name="series">Default Drums</config><breed species="Beetle" name="langton"><case cell="0"><action><command name="put">1</command><command name="rt"></command><command name="fd"></command><command name="play">C2:##dir'2*3/1-;</command></action></case><case cell="1"><action><command name="put">0</command><command name="lt"></command><command name="fd"></command><command name="play">G2:##dir'2*3/1-;</command></action></case></breed><ant breed="langton" x="0" y="0" dir="1"></ant></langton>
`);
    }
    textbox.clearSelection();
} catch (e) {
    console.error(e);
}

/**
 * Centers the cell in the viewport.
 * @param {Vector} cell
 */
function center(cell) {
    canvasTools.panxy = vPlus(vScale(cell, -1 * world.cellSize * canvasTools.zoom), vScale({ x: playfield.width, y: playfield.height }, 0.5));
}

/**
 * Centers the requested ant in the viewport, if it exists.
 * @param {string} antID
 */
function followAnt(antID) {
    if (!antID) {
        return;
    } else {
        var ant = ants.filter(ant => ant.id === antID)[0];
        center(ant);
    }
}

actions.action('dump', () => {
    try {
        var oldRunning = running;
        stop();
        var h = Object.getOwnPropertyNames(header).map(n => `    <config name="${n}">${header[n]}</config>`).join('\n');
        var b = breeder.dumpBreeds();
        var a = ants.map(ant => `    <ant id="${ant.id}" x="${ant.x}" y="${ant.y}" breed="${ant.breed}" state="${ant.state}" dir="${ant.dir}"></ant>`).join('\n');
        var r = world.dump(ants);
        textbox.setValue(`<langton>\n${h}\n${b}\n${a}\n    ${r}\n</langton>`);
        textbox.clearSelection();
        if (oldRunning) start();
    } catch (e) {
        showStatus('Error: ' + e.toString(), 'red');
        throw e;
    }
})
dumpBtn.addEventListener('click', () => actions.trigger('dump'));

/**
 * Fits the ace code editor to the box it's in when the box changes size.
 */
function fitace() {
    setTimeout(() => {
        var rect = $('#textbox').parentElement.getBoundingClientRect();
        $('#textbox').setAttribute('style', `width:${rect.width}px;height:${rect.height}px`);
        textbox.resize(true);
    }, 0);
}

window.addEventListener('resize', fitace);

window.addEventListener('hashchange', () => {
    var where = '#statuswrapper';
    if (location.hash === '#editor') {
        actions.trigger('stop');
        actions.trigger('dump');
        where = '#dumpstatuswrapper';
        textbox.setTheme(DARK_MODE ? 'ace/theme/pastel_on_dark' : 'ace/theme/chrome');
    }
    $(where).append(statusBar);
    fitace();
});
location.hash = "#"; // Don't have editor open by default

// Mute/unmute
function enableMute(enabled) {
    if (enabled) muteCheckbox.removeAttribute("disabled");
    else {
        muteCheckbox.setAttribute("disabled", true);
        muteCheckbox.checked = true;
        GLOBAL_MUTE = true;
    }
}

actions.action('mute', (mute) => {
    if (muteCheckbox.hasAttribute("disabled")) {
        showStatus("BPM is too high. Sound is disabled.");
        GLOBAL_MUTE = true;
        return;
    }
    else GLOBAL_MUTE = mute;
    showStatus("Sound is " + (GLOBAL_MUTE ? "disabled" : "enabled") + ".");
    muteCheckbox.checked = GLOBAL_MUTE;
});
muteCheckbox.addEventListener('change', () => actions.trigger('mute', muteCheckbox.checked));

actionsSelector.addEventListener('change', () => {
    var action = actionsSelector.value;
    actionsSelector.value = '';
    actions.trigger(action);
});

actions.action('openclip', openclip);
actions.action('savelocal', savelocal);
actions.action('share', share);
actions.action('copy', () => copy(false));
actions.action('bbcode', () => copy(true));
actions.action('scrot', savescreenshot);


// Register service worker
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("serviceWorker.js").then(e => console.log("Service worker registered", e));
}

// Dev version indicator
if (location.host.indexOf('localhost') != -1) {
    document.title += ' - localhost version';
    $('main .heading').textContent += ' - localhost version';
}
else if (location.protocol.indexOf('file') != -1) {
    document.title += ' - file:// version';
    $('main .heading').textContent += ' - file:// version (some features unavailable)';
}
else {
    // we are in the full web version
    // alert user that they can install LAM
    var installPrompt = null;
    var installOption = null;
    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        installPrompt = e;
        if (installOption) return; // beforeinstallprompt event fires if user clicks cancel on the install box... weird...
        installOption = document.createElement('option');
        installOption.value = 'install';
        installOption.textContent = 'Install Web App';
        actionsSelector.append(installOption);
        showStatus("You can now install Langton's Ant music as a web app on your device! Go to the Actions menu to install.", "blue");
        actions.action('install', () => {
            if (installPrompt) installPrompt.prompt();
            else showStatus('Oops! You should not see that option!', 'red');
        });
    });

    // hide alert when app is actually installed
    window.addEventListener('appinstalled', () => {
        showStatus("Web app installed successfully.");
        installOption.remove();
    });
}

// ------------------------------ Keyboard shortcuts -----------------------------------

actions.action('zoom', (factor) =>  canvasTools.zoomBy(factor));
actions.action('pan', (xy) => canvasTools.panBy(vScale(xy, 1 / (canvasTools.zoom * world.cellSize))));

if (window.Mousetrap) {
    Mousetrap.bind('enter', () => actions.trigger('playpause'));
    Mousetrap.bind('tab', () => actions.trigger('step'));
    Mousetrap.bind('=', () => actions.trigger('speedchange', header.bpm + 10));
    Mousetrap.bind('-', () => actions.trigger('speedchange', header.bpm - 10));
    Mousetrap.bind('+', () => actions.trigger('speedchange', header.bpm + 100));
    Mousetrap.bind('shift+-', () => actions.trigger('speedchange', header.bpm - 10));
    Mousetrap.bind('f', () => actions.trigger('fit'));
    Mousetrap.bind('m', () => actions.trigger('mute', !GLOBAL_MUTE));
    Mousetrap.bind('M', () => actions.trigger('mute', true));
    Mousetrap.bind('U', () => actions.trigger('mute', false));
    Mousetrap.bind('[', () => actions.trigger('zoom', 0.5));
    Mousetrap.bind(']', () => actions.trigger('zoom', 2));
    Mousetrap.bind('up', () => actions.trigger('pan', { x: 0, y: -1 }));
    Mousetrap.bind('down', () => actions.trigger('pan', { x: 0, y: 1 }));
    Mousetrap.bind('left', () => actions.trigger('pan', { x: -1, y: 0 }));
    Mousetrap.bind('right', () => actions.trigger('pan', { x: 1, y: 0 }));
    Mousetrap.bind('a', () => actions.trigger('autofit', !autoFit.checked));
    Mousetrap.bind('d', () => { window.location.hash = '#xml'; return false; });
    Mousetrap.bind('?', () => { window.location.hash = '#help'; return false; });
    Mousetrap.bind('/', () => { window.location.hash = '#kbd'; return false; });
    Mousetrap.bind('e', () => { window.location.hash = '#editor'; return false; });
    Mousetrap.bind('esc', () => { window.location.hash = '#'; return false; });
    Mousetrap.bind('s', () => actions.trigger('savelocal'));
    Mousetrap.bind('o', () => actions.trigger('openclip'));
    Mousetrap.bind('c', () => actions.trigger('copy'));
}
