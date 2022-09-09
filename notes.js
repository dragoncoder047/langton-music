/**
 * Ant that plays drum sounds.
 */
class Beetle extends Ant {
    constructor(...args) {
        super(...args);
        this.panner = new Tone.Panner(0).toDestination();
        this.drum = new Tone.PolySynth(Tone.MembraneSynth).connect(this.panner);
    }
    do_play(arg) {
        if (GLOBAL_MUTE) return;
        var [_, note, pan] = /([^:]+)(?::([-+\d.]+))?/.exec(arg);
        if (!pan) pan = 0;
        this.panner.pan.setValueAtTime(pan, Tone.now());
        this.drum.triggerAttackRelease(note, "0.4n");
    }
}

/**
 * Ant that plays strings sounds.
 */
class Cricket extends Ant {
    constructor(...args) {
        super(...args);
        this.panner = new Tone.Panner(0).toDestination();
        this.synth = new Tone.PolySynth(Tone.AMSynth).connect(this.panner);
    }
    do_play(arg) {
        if (GLOBAL_MUTE) return;
        var [_, note, pan] = /([^:]+)(?::([-+\d.]+))?/.exec(arg);
        if (!pan) pan = 0;
        this.panner.pan.setValueAtTime(pan, Tone.now());
        this.synth.triggerAttackRelease(note, "0.4n");
    }
}