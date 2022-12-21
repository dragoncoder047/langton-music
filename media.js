var smallCanvas = new OffscreenCanvas(128, 128)
var audioElement = document.createElement('audio');
audioElement.setAttribute('src', 'https://raw.githubusercontent.com/anars/blank-audio/master/45-seconds-of-silence.mp3');
audioElement.setAttribute('style', 'position:absolute;top:150vh');
document.body.append(audioElement);
var smallTools = new CanvasToolsManager(smallCanvas);
var smallCtx = smallTools.ctx;
var throttle = 30;
var blobURL;
function syncMediaSession() {
    if (throttle > 0) { throttle--; return; }
    throttle = 30;
    // Center it on the canvas
    var bbox = world.bbox(ants);
    var middle = vScale(vPlus(bbox.tl, bbox.br), 0.5);
    var size = bbox.br.x - bbox.tl.x + 1 // +1 to preclude dividing by zero
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
        if (blobURL) URL.revokeObjectURL(blobURL);
        blobURL = URL.createObjectURL(blob);
        navigator.mediaSession.metadata = new MediaMetadata({
            title: (header.title || 'Langton\'s Ant Music') + ' Step ' + header.stepCount,
            artist: header.author || '',
            album: header.series || '',
            artwork: [{
                src: blobURL,
                sizes: '128x128',
                type: 'image/png'
            }],
        });
    });
}

function mediaPause() {
    navigator.mediaSession.playbackState = "paused";
}

function mediaPlay() {
    navigator.mediaSession.playbackState = "playing";
}

function setMediaPlaybackState() {
    navigator.mediaSession.setPositionState({
        duration: (header.stepCount ?? 0) + 150,
        playbackRate: 1,
        position: header.stepCount ?? 0,
    });
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

['play', 'pause', 'stop', 'seekbackward', 'seekforward', 'seekto', 'previoustrack', 'nexttrack'].forEach(ev => {
    try {
        navigator.mediaSession.setActionHandler(ev, handlers[ev]);
    } catch (err) {
        console.log('handler ' + ev + ' not supported');
    }
});
