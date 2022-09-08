const $ = s => document.querySelector(s);

const playfield = $('#playfield');
const startStopBtn = $('#startstop');
const stepBtn = $('#step');
const stepCounter = $('#stepnum');
const antsCounter = $('#antscount');
const loadBtn = $('#loadbtn');
const dumpBtn = $('#dumpbtn');
const statusBar = $('#statusbar');
const fitBtn = $('#fit');
const autoFit = $('#autofit');
const followSelector = $('#follow');

ace.config.set('basePath', 'https://cdn.jsdelivr.net/npm/ace-builds@1.10.0/src-noconflict/');
const textbox = ace.edit('textbox', { mode: 'ace/mode/xml' });
textbox.on('change', () => {
    try {
        localStorage.setItem('save', textbox.getValue());
        showStatus('Saved to localStorage.', 'green');
    } catch (e) {
        showStatus('Error saving to localStorage', 'red');
    }
});
textbox.setValue(`
<langton><breed species="Beetle" name="langton"><case cell="0"><action><command name="put">1</command><command name="rt"></command><command name="fd"></command><command name="play">C2</command></action></case><case cell="1"><action><command name="put">0</command><command name="lt"></command><command name="fd"></command><command name="play">G2</command></action></case></breed><ant breed="langton" x="0" y="0" dir="1"></ant></langton>
`);
textbox.setTheme('ace/theme/chrome');
textbox.clearSelection();

var ants = [];
var breeder = new Breeder();
var ctx = playfield.getContext('2d');
var world = new World(ctx);
var canvasTools = new CanvasToolsManager(playfield, $('#toolselect'), $('#tooloption'), [
    new DragTool(),
    new DrawCellsTool(world),
    new DrawAntsTool(world, breeder, ants),
]);
var header = { stepCount: 0 };
var interpolations = [];

function showStatus(text, color = 'black') {
    statusBar.value = text;
    statusBar.style.color = color;
}

function runEnable(canRun) {
    if (canRun) {
        startStopBtn.removeAttribute('disabled');
        stepBtn.removeAttribute('disabled');
    } else {
        startStopBtn.setAttribute('disabled', true);
        stepBtn.setAttribute('disabled', true);
    }
}

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

var running = false;

function start() {
    if (!running) {
        running = true;
        tick();
    }
    startStopBtn.textContent = 'Pause';
    showStatus('Running...');
}

function stop() {
    running = false;
    startStopBtn.textContent = 'Resume';
    showStatus('Paused.');
}

function step() {
    stop();
    tick();
}

function togglePlayPause() {
    if (running) stop();
    else start();
}

startStopBtn.addEventListener('click', togglePlayPause);
stepBtn.addEventListener('click', step);

function tick() {
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
    if (running) setTimeout(tick, 60000 / (header.bpm ?? 240));
}

function load() {
    stop();
    header.stepCount = 0;
    showStatus('Loading...');
    try {
        header = loadWorld(textbox.getValue(), { Ant, Beetle, Cricket }, world, breeder, ants);
        interpolations = [];
        for (var prop of Object.getOwnPropertyNames(header)) {
            if (prop.startsWith('#')) interpolations.push([prop.slice(1), header[prop]]);
        }
        header.stepCount = header.stepCount ?? 0;
        Tone.Transport.bpm.setValueAtTime(2 * (parseInt(header.bpm) || 240), Tone.now());
        Tone.Transport.start();
    } catch (e) {
        stop();
        runEnable(false);
        showStatus('Error: ' + e.toString(), 'red');
        throw e;
    }
    startStopBtn.textContent = 'Start';
    showStatus('Press START.');
    runEnable(true);
    fit();

}
loadBtn.addEventListener('click', () => Tone.start(), { once: true });
loadBtn.addEventListener('click', load);
try {
    var saved = localStorage.getItem('save');
    if (saved) {
        textbox.setValue(saved);
        showStatus('Loaded from localStorage.', 'green');
    }
} catch (e) {
    ;
}
load();

function center(cell) {
    canvasTools.panxy = vPlus(vScale(cell, -1 * world.cellSize * canvasTools.zoom), vScale({ x: playfield.width, y: playfield.height }, 0.5));
}

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

function followAnt(antID) {
    if (!antID) {
        return;
    } else {
        var ant = ants.filter(ant => ant.id === antID)[0];
        center(ant);
    }
}

function dump() {
    try {
        stop();
        var h = Object.getOwnPropertyNames(header).map(n => `    <config name="${n}">${header[n]}</config>`).join('\n');
        var b = breeder.dumpBreeds();
        var a = ants.map(ant => `    <ant id="${ant.id}" x="${ant.x}" y="${ant.y}" breed="${ant.breed}" state="${ant.state}" dir="${ant.dir}"></ant>`).join('\n');
        var r = world.dump(ants);
        textbox.setValue(`<langton>\n${h}\n${b}\n${a}\n    ${r}\n</langton>`);
        textbox.clearSelection();
    } catch (e) {
        showStatus('Error: ' + e.toString(), 'red');
        throw e;
    }
}
dumpBtn.addEventListener('click', dump);

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
        dump();
        where = '#dumpstatuswrapper';
    }
    $(where).append(statusBar);
    fitace();
});
if (location.hash === '#editor') window.dispatchEvent(new Event('hashchange'));