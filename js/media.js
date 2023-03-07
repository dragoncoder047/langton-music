var smallCanvas, hasOffscreen = true;
if ('OffscreenCanvas' in window) smallCanvas = new OffscreenCanvas(128, 128);
else {
    smallCanvas = document.createElement('canvas');
    smallCanvas.width = smallCanvas.height = 128;
    smallCanvas.setAttribute('style', 'width:128;height:128;position:absolute;top:-1000px');
    document.body.appendChild(smallCanvas);
    hasOffscreen = false;
}
var audioElement = new Audio('https://raw.githubusercontent.com/anars/blank-audio/master/45-seconds-of-silence.mp3');
audioElement.loop = true;
var smallTools = new CanvasToolsManager(smallCanvas);
var smallCtx = smallTools.ctx;
var blobURL;
function syncMediaSession() {
    // Center it on the canvas
    var bbox = world.bbox(ants);
    var middle, size;
    if (followSelector.value != '') {
        middle = vScale(vPlus(bbox.tl, bbox.br), 0.5);
        size = bbox.br.x - bbox.tl.x + 1; // +1 to preclude dividing by zero
    } else {
        middle = ants.filter(ant => ant.id = followSelector.value)[0];
        size = 16;
        if (!middle) {
            middle = vScale(vPlus(bbox.tl, bbox.br), 0.5);
            size = bbox.br.x - bbox.tl.x + 1; // +1 to preclude dividing by zero
        }
    }
    smallTools.zoom = smallCanvas.width / size / world.cellSize;
    smallTools.panxy = vPlus(vScale(middle, -1 * world.cellSize * smallTools.zoom), { x: smallCanvas.width / 2, y: smallCanvas.height / 2 });
    // Draw
    smallTools.clear();
    smallTools.drawTransformed(() => {
        world.draw(smallCtx);
        ants.forEach(ant => ant.draw(smallCtx));
    });
    // Create the metadata
    try {
        if (hasOffscreen) smallCanvas.convertToBlob().then(gotCanvasBlob);
        else smallCanvas.toBlob(gotCanvasBlob);
    } catch(e) {
        console.error(e);
    }
}

function gotCanvasBlob(blob) {
    // if (blobURL) URL.revokeObjectURL(blobURL);
    blobURL = URL.createObjectURL(blob);
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
        title: (header.title || 'Langton\'s Ant Music') + ' | ' + header.stepCount,
        artist: header.author || '',
        album: header.series || '',
        artwork: [{
            src: blobURL,
            sizes: '128x128',
            type: 'image/png'
        }],
    });
    if (debug) debug('gotCanvasBlob done ' + blobURL);
}

function mediaPause() {
    if (debug) debug('mediaPause');
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = "paused";
    audioElement.pause();
    if (debug) debug('mediaPause done');
}

function mediaPlay() {
    if (debug) debug('mediaPlay');
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = "playing";
    audioElement.play();
    if (debug) debug('mediaPlay done');
}

function setMediaPlaybackState() {
    if (debug) debug('setMediaPlaybackState');
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setPositionState({
        duration: (header.stepCount ?? 0) + 150,
        playbackRate: 1,
        position: header.stepCount ?? 0,
    });
    if (debug) debug('setMediaPlaybackState done');
}

function forcePlayElement() {
    if (debug) debug('forcePlayElement');
    if (!('mediaSession' in navigator)) return;
    var interval;
    interval = setInterval(() => audioElement.play().then(() => {
        clearInterval(interval);
        audioElement.pause();
        updateActionHandlers();
        if (debug) debug('forcePlayElement done paused');
    }), 100);
}

const handlers = {
    play() {
        if (debug) debug('got play event');
        start();
    },
    pause() {
        if (debug) debug('got pause event');
        stop();
    },
    stop() {
        if (debug) debug('got stop event');
        stop();
        forcePlayElement();
    },
    seekbackward(e) {
        if (debug) debug('got seekbackward event', e);
        updateSpeedInputs(header.bpm - (e.seekOffset || 10));
    },
    seekforward(e) {
        if (debug) debug('got seekforward event', e);
        updateSpeedInputs(header.bpm + (e.seekOffset || 10));
    },
    seekto(e) {
        if (debug) debug('got seekto event', e);
        updateSpeedInputs(e.seekTime);
    },
    previoustrack() {
        if (debug) debug('got previoustrack event');
        updateSpeedInputs(header.bpm - 100);
    },
    nexttrack() {
        if (debug) debug('got nexttrack event');
        updateSpeedInputs(header.bpm + 100);
    },
};

function updateActionHandlers() {
    if (!('mediaSession' in navigator)) return;
    ['play', 'pause', 'stop', 'seekbackward', 'seekforward', 'seekto', 'previoustrack', 'nexttrack'].forEach(ev => {
        try {
            navigator.mediaSession.setActionHandler(ev, handlers[ev]);
        } catch (err) {
            if (debug) debug('handler ' + ev + ' not supported');
        }
    });
    audioElement.addEventListener('pause', () => {
        handlers.pause();
    });
}
updateActionHandlers();
