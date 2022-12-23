var smallCanvas = new OffscreenCanvas(128, 128);
var audioElement = document.createElement('audio');
audioElement.setAttribute('src', 'https://raw.githubusercontent.com/anars/blank-audio/master/45-seconds-of-silence.mp3');
audioElement.setAttribute('style', 'position:absolute;top:150vh');
document.body.append(audioElement);
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
    smallTools.panxy = vPlus(vScale(middle, -1 * world.cellSize * smallTools.zoom), vScale({ x: smallCanvas.width, y: smallCanvas.height }, 0.5));
    // Draw
    smallTools.clear();
    smallTools.drawTransformed(() => {
        world.draw(smallCtx);
        ants.forEach(ant => ant.draw(smallCtx));
    });
    // Create the metadata
    smallCanvas[smallCanvas.convertToBlob ? 'convertToBlob' /* specs */ : 'toBlob' /* current Firefox */]().then(blob => {
        // if (blobURL) URL.revokeObjectURL(blobURL);
        blobURL = URL.createObjectURL(blob);
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
        debug('syncMediaSession done ' + blobURL);
    });
}

function mediaPause() {
    debug('mediaPause');
    navigator.mediaSession.playbackState = "paused";
    debug('mediaPause done');
}

function mediaPlay() {
    debug('mediaPlay');
    navigator.mediaSession.playbackState = "playing";
    debug('mediaPlay done');
}

function setMediaPlaybackState() {
    debug('setMediaPlaybackState');
    navigator.mediaSession.setPositionState({
        duration: (header.stepCount ?? 0) + 150,
        playbackRate: 1,
        position: header.stepCount ?? 0,
    });
    debug('setMediaPlaybackState done');
}

function forcePlayElement() {
    debug('forcePlayElement');
    var interval;
    interval = setInterval(() => audioElement.play().then(() => {
        clearInterval(interval);
        audioElement.pause();
        updateActionHandlers();
        debug('forcePlayElement done paused');
    }), 100);
}

const handlers = {
    play() {
        debug('got play event');
        start();
    },
    pause() {
        debug('got pause event');
        stop();
    },
    stop() {
        debug('got stop event');
        stop();
        forcePlayElement();
    },
    seekbackward(e) {
        debug('got seekbackward event', e);
        updateSpeedInputs(header.bpm - (e.seekOffset || 10));
    },
    seekforward(e) {
        debug('got seekforward event', e);
        updateSpeedInputs(header.bpm + (e.seekOffset || 10));
    },
    seekto(e) {
        debug('got seekto event', e);
        updateSpeedInputs(e.seekTime);
    },
    previoustrack() {
        debug('got previoustrack event');
        updateSpeedInputs(header.bpm - 100);
    },
    nexttrack() {
        debug('got nexttrack event');
        updateSpeedInputs(header.bpm + 100);
    },
};

function updateActionHandlers() {
    ['play', 'pause', 'stop', 'seekbackward', 'seekforward', 'seekto', 'previoustrack', 'nexttrack'].forEach(ev => {
        try {
            navigator.mediaSession.setActionHandler(ev, handlers[ev]);
        } catch (err) {
            debug('handler ' + ev + ' not supported');
        }
    });
}
updateActionHandlers();
