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

ace.config.set('basePath', 'https://cdn.jsdelivr.net/npm/ace-builds@1.10.0/src-noconflict/');
const textbox = ace.edit('textbox', { mode: 'ace/mode/xml' });
textbox.setTheme('ace/theme/chrome');

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
var ctx = playfield.getContext('2d');
/**
 * @type {World}
 */
var world = new World(ctx);
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
 * Shows the text in the status bar.
 * @param {string} text Text to show
 * @param {string} [color='black'] Color; default is black
 */
function showStatus(text, color = 'black') {
    statusBar.value = text;
    statusBar.style.color = color;
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
    canvasTools.drawTransformed(() => {
        canvasTools.clear();
        world.draw();
        ants.forEach(ant => ant.draw());
    });
    // test mouse xy lineup
    ctx.fillStyle = 'red';
    ctx.fillRect(canvasTools.lastxy.x - 4, canvasTools.lastxy.y - 4, 8, 8);
    // END test
    stepCounter.textContent = header.stepCount;
    antsCounter.textContent = ants.length;
    var selectedAnt = followSelector.value;
    followSelector.childNodes.forEach(node => {
        if (node.value === '') return;
        if (!ants.some(ant => ant.id === node.textContent))
            node.remove();
    });
    ants.forEach(ant => {
        if (![].some.call(followSelector.childNodes, node => node.textContent === ant.id)) {
            var n = document.createElement('option');
            n.textContent = ant.id;
            followSelector.append(n);
            runEnable(true);
        }
    });
    followSelector.value = ants.some(ant => ant.id === selectedAnt) ? selectedAnt : '';
    requestAnimationFrame(render)
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

/**
 * Starts running
 */
function start() {
    if (!running) {
        running = true;
        tick();
    }
    startStopBtn.textContent = 'Pause';
    showStatus('Running...');
}

/**
 * Pauses running.
 */
function stop() {
    running = false;
    startStopBtn.textContent = 'Resume';
    showStatus('Paused.');
}

/**
 * Stops, and then runs one tick.
 */
function step() {
    stop();
    tick(true);
}

/**
 * Toggles play/pause.
 */
function togglePlayPause() {
    if (running) stop();
    else start();
}

startStopBtn.addEventListener('click', togglePlayPause);
stepBtn.addEventListener('click', step);

/**
 * Runs the world one tick.
 * @param {boolean} force Force run one tick.
 */
function tick(force = false) {
    if (!running && !force) return;
    try {
        ants.slice().forEach(ant => ant.tick());
        header.stepCount++;
    } catch (e) {
        stop();
        runEnable(false);
        showStatus('Error: ' + e.toString(), 'red');
        throw e;
    }
    if (ants.length > 64) {
        stop();
        showStatus('Too many ants. Select the "Draw Ants" tool, and ctrl+click on an ant to remove it.', 'red');
        return;
    }
    if (ants.every(ant => ant.halted)) {
        stop();
        showStatus('All ants are halted.', 'blue');
        return;
    }
    ants.forEach(ant => { if (ant.dead) ants.splice(ants.indexOf(ant), 1); });
    if (!ants.length) {
        stop();
        showStatus('All ants are dead.', 'blue');
        return;
    }
    if (autoFit.checked && running) fit();
    followAnt(followSelector.value);
    if (!force) setTimeout(tick, 60000 / (header.bpm ?? 240));
}

/**
 * Loads the text from the text box and updates the world.
 */
function load() {
    stop();
    var s = 'Press START.'
    header.stepCount = 0;
    showStatus('Loading...');
    try {
        header = loadWorld(textbox.getValue(), { Ant, Beetle, Cricket }, world, breeder, ants);
        interpolations = [];
        for (var prop of Object.getOwnPropertyNames(header)) {
            if (prop.startsWith('#')) interpolations.push([prop.slice(1), header[prop]]);
        }
        header.stepCount = header.stepCount ?? 0;
        header.bpm = parseInt(header.bpm) || 240;
        if (header.bpm < 1000) {
            Tone.Transport.bpm.setValueAtTime(2 * header.bpm, Tone.now());
            Tone.Transport.start();
            GLOBAL_MUTE = false;
        } else {
            Tone.Transport.stop();
            s = 'BPM too high. Sound is disabled.';
            GLOBAL_MUTE = true;
        }
    } catch (e) {
        stop();
        runEnable(false);
        showStatus('Error: ' + e.toString(), 'red');
        throw e;
    }
    startStopBtn.textContent = 'Start';
    showStatus(s);
    runEnable(true);
    fit();

}
loadBtn.addEventListener('click', () => Tone.start(), { once: true });
loadBtn.addEventListener('click', load);
try {
    var saved = localStorage.getItem('save');
    if (saved) {
        textbox.setValue(saved);
        load();
        showStatus('Loaded from localStorage.', 'green');
    } else {
        textbox.setValue(`
<langton><breed species="Beetle" name="langton"><case cell="0"><action><command name="put">1</command><command name="rt"></command><command name="fd"></command><command name="play">C2:##dir'2*3/1-;</command></action></case><case cell="1"><action><command name="put">0</command><command name="lt"></command><command name="fd"></command><command name="play">G2:##dir'2*3/1-;</command></action></case></breed><ant breed="langton" x="0" y="0" dir="1"></ant></langton>
`);
        load();
    }
    textbox.clearSelection();
} catch (e) {
    /* noop */;
}

/**
 * Centers the cell in the viewport.
 * @param {Vector} cell
 */
function center(cell) {
    canvasTools.panxy = vPlus(vScale(cell, -1 * world.cellSize * canvasTools.zoom), vScale({ x: playfield.width, y: playfield.height }, 0.5));
}

/**
 * Fits the entire world in the viewport.
 */
function fit() {
    var bbox = world.bbox(ants);
    var middle = vScale(vPlus(bbox.tl, bbox.br), 0.5);
    var dimensions = vPlus({ x: 1, y: 1 }, vMinus(bbox.br, bbox.tl)); // +1 to preclude dividing by zero
    var leftRightZoom = playfield.width / dimensions.x / world.cellSize;
    var upDownZoom = playfield.height / dimensions.y / world.cellSize;
    canvasTools.zoom = Math.min(upDownZoom, leftRightZoom);
    center(middle);
}
fitBtn.addEventListener('click', fit);
fit();

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

/**
 * Serializes the entire world state to XML and puts it in the text box.
 */
function dump() {
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
}
dumpBtn.addEventListener('click', dump);

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
    var where = '#statuswrapper'
    if (location.hash === '#editor') {
        stop();
        dump();
        where = '#dumpstatuswrapper';
    }
    $(where).append(statusBar);
    fitace();
});
if (location.hash === '#editor') window.dispatchEvent(new Event('hashchange'));

actionsSelector.addEventListener('change', () => {
    var action = actionsSelector.value;
    actionsSelector.value = '';
    switch (action) {
        case 'save':
            save();
            break;
        case 'share':
            share();
            break;
        case 'copy':
            copy(false);
            break;
        case 'bbcode':
            copy(true);
            break;
        default:
            showStatus('Error: unimplemented', 'red');
    }
})