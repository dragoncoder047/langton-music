var smallCanvas = document.createElement('canvas');
var nullElement = document.createElement('span');
var audioElement = document.createElement('audio');
audioElement.setAttribute('src', 'https://raw.githubusercontent.com/anars/blank-audio/master/45-seconds-of-silence.mp3');
smallCanvas.setAttribute('width', 128);
smallCanvas.setAttribute('height', 128);
smallCanvas.setAttribute('style', 'position:absolute;top:150vh');
nullElement.setAttribute('style', 'position:absolute;top:150vh');
audioElement.setAttribute('style', 'position:absolute;top:150vh');
smallCanvas.width = 128;
smallCanvas.height = 128;
document.body.append(smallCanvas, nullElement, audioElement);
var smallTools = new CanvasToolsManager(smallCanvas, nullElement, nullElement, []);
var smallCtx = smallCanvas.getContext('2d');
var throttle = 30;
function syncMediaSession() {
    if (throttle > 0) { throttle--; return; }
    throttle = 30;
    // Center it on the canvas
    var bbox = world.bbox(ants);
    var middle = vScale(vPlus(bbox.tl, bbox.br), 0.5);
    var size = bbox.br.x - bbox.tl.x + 1 // +1 to preclude dividing by zero
    smallTools.zoom = smallCanvas.width / size / world.cellSize;
    smallTools.panxy = vPlus(vScale(cell, -1 * world.cellSize * smallTools.zoom), vScale({ x: smallCanvas.width, y: smallCanvas.height }, 0.5));
    // Draw
    smallTools.clear();
    smallTools.drawTransformed(() => {
        world.draw(smallCtx);
        ants.forEach(ant => ant.draw(smallCtx));
    });
    // Create the metadata
    setTimeout(() => {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: (header.title || 'Langton\'s Ant Music') + ' Step ' + header.stepCount,
            artist: header.author || '',
            album: header.series || '',
            artwork: [{
                src: smallCanvas.toDataURL(),
                sizes: '128x128',
                type: 'image/png'
            }],
        });
    }, 0);
}

function mediaPause() {
    setTimeout(() => navigator.mediaSession.playbackState = "paused", 0);
}

function mediaPlay() {
    setTimeout(() => navigator.mediaSession.playbackState = "playing", 0);
}

function setMediaPlaybackState() {
    setTimeout(() => navigator.mediaSession.setPositionState({
        duration: (header.stepCount ?? 0) + 150,
        playbackRate: header.bpm / 240,
        position: header.stepCount ?? 0,
    }), 0);
}

function forcePlayElement() {
    var interval;
    interval = setInterval(() => audioElement.play().then(() => {
        clearInterval(interval);
        audioElement.pause();
    }), 100);
}

const handlers = {
    play() { start(); }, pause() { stop(); },
    stop() { stop(); forcePlayElement(); },
    seekbackward(e) {
        updateSpeedInputs(header.bpm - e.seekOffset);
    },
    seekforward(e) {
        updateSpeedInputs(header.bpm + e.seekOffset);
    },
    seekto(e) {
        updateSpeedInputs(e.seekTime);
    },
    previoustrack() {
        updateSpeedInputs(header.bpm - 100);
    },
    nexttrack() {
        updateSpeedInputs(header.bpm + 100);
    },
};

['play', 'pause', 'stop', 'seekbackward', 'seekforward', 'seekto', 'previoustrack', 'nexttrack'].forEach(e => {
    navigator.mediaSession.setActionHandler(e, handlers[e]);
});
