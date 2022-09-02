const $ = s => document.querySelector(s);

const playfield = $('#playfield');
const startStopBtn = $('#startstop');
const stepBtn = $('#step');
const stepCounter = $('#stepnum');
const antsCounter = $('#antscount');
const textbox = $('#textbox');
const loadBtn = $('#loadbtn');
const dumpBtn = $('#dumpbtn');
const statusBar = $('#statusbar');
const fitBtn = $('#fit');
const autoFit = $('#autofit');
const followSelector = $('#follow');

textbox.value = `<langton>
\t<breed species="Beetle" name="langton">
\t\t<case cell="0">
\t\t\t<action>
\t\t\t\t<command name="put">1</command>
\t\t\t\t<command name="rt"></command>
\t\t\t\t<command name="fd"></command>
\t\t\t\t<command name="play">C2</command>
\t\t\t</action>
\t\t</case>
\t\t<case cell="1">
\t\t\t<action>
\t\t\t\t<command name="put">0</command>
\t\t\t\t<command name="lt"></command>
\t\t\t\t<command name="fd"></command>
\t\t\t\t<command name="play">G2</command>
\t\t\t</action>
\t\t</case>
\t</breed>
\t<ant id="langton1" breed="langton" x="0" y="0" dir="1">
</langton>`;

var dragController = new CanvasMove(playfield, false);
var ctx = dragController.ctx;
var world = new World(ctx);
var header = { stepCount: 0 };
var interpolations = [];
var ants = [];
var breeder = new Breeder();

var ratio = (function () {
    var dpr = window.devicePixelRatio || 1;
    var bsr = ctx.webkitBackingStorePixelRatio || ctx.mozBackingStorePixelRatio || ctx.msBackingStorePixelRatio || ctx.oBackingStorePixelRatio || ctx.backingStorePixelRatio || 1;
    return dpr / bsr;
})();

playfield.width = 1280 * ratio;
playfield.height = 640 * ratio;
playfield.style.width = "1280px";
playfield.style.height = "640px";
ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
ctx.imageSmoothingEnabled = false;

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

function fitEnable(canFit) {
    if (canFit) {
        fitBtn.removeAttribute('disabled');
        autoFit.removeAttribute('disabled');
    } else {
        fitBtn.setAttribute('disabled', true);
        autoFit.setAttribute('disabled', true);
        autoFit.removeAttribute('checked');
    }
}

function render() {
    dragController.enter();
    dragController.clear();
    world.draw();
    ants.forEach(ant => ant.draw());
    dragController.exit();
    stepCounter.textContent = header.stepCount;
    antsCounter.textContent = ants.length;
    setTimeout(render, 50); // 20 fps
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
        runEnable(false);
        showStatus('Too many ants.', 'red');
        return;
    }
    if (ants.every(ant => ant.halted)) {
        stop();
        runEnable(false);
        showStatus('All ants are halted.', 'blue');
        return;
    }
    ants.forEach(ant => { if (ant.dead) ants.splice(ants.indexOf(ant), 1); });
    if (!ants.length) {
        stop();
        runEnable(false);
        showStatus('All ants are dead.', 'blue');
        return;
    }
    if (autoFit.checked && running) fit();
    if (running) setTimeout(tick, 60000 / (header.bpm ?? 240));
}

function load() {
    stop();
    header.stepCount = 0;
    showStatus('Loading...');
    try {
        ({ ants, header } = loadWorld(textbox.value, { Ant, Beetle, Cricket }, world, breeder));
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
load();

function fit() {
    var bbox = world.bbox(ants);
    var middle = [(bbox.tl[0] + bbox.br[0]) / 2, (bbox.tl[1] + bbox.br[1]) / 2];
    var dimensions = [bbox.br[0] - bbox.tl[0] + 1, bbox.br[1] - bbox.tl[1] + 1]; // +1 to preclude dividing by zero
    var leftRightZoom = playfield.width / dimensions[0] / world.cellSize;
    var upDownZoom = playfield.height / dimensions[1] / world.cellSize;
    dragController.zoom = Math.min(upDownZoom, leftRightZoom);
    dragController.x = -middle[0] * world.cellSize * dragController.zoom + playfield.width / 2;
    dragController.y = -middle[1] * world.cellSize * dragController.zoom + playfield.height / 2;
    dragController.zoom *= 5 / 6;
    dragController.x += playfield.width / 6;
    dragController.y += playfield.height / 6;
}
fitBtn.addEventListener('click', fit);
fit();

function dump() {
    try {
        stop();
        var h = Object.getOwnPropertyNames(header).map(n => `${n}: ${header[n]}`).join(';\n');
        var b = breeder.dumpBreeds();
        var r = world.dump(ants);
        textbox.value = `${h}\n${b}\n${r}`;
    } catch (e) {
        showStatus(e, 'red');
        throw e;
    }
}
dumpBtn.addEventListener('click', dump);