class XEventEmitter extends EventTarget {
    constructor() { super(); }

        on(event, handler) { this.addEventListener(event, handler); }

        off(event, handler) { this.removeEventListener(event, handler); }

        once(event, handler) { this.addEventListener(event, handler, { once: true }); }

        emit(event, detail) { this.dispatchEvent(new CustomEvent(event, { detail })); }

        pipeTo(selfEvent, otherObj, otherEvent) { this.on(selfEvent, e => otherObj.emit(otherEvent || selfEvent, e.detail)); }

        waitFor(event) { return new Promise(r => this.once(event, e => r(e.detail))); }
};
