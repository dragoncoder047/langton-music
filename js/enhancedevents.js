/**
 * Extended EventTarget with a few more features.
 */
class XEventEmitter extends EventTarget {
    constructor() { super(); }

    /**
     * @param {string} event
     * @param {(e: CustomEvent) => void} handler
     */
    on(event, handler) { this.addEventListener(event, handler); }

    /**
     * @param {string} event
     * @param {(e: CustomEvent) => void} handler
     */
    off(event, handler) { this.removeEventListener(event, handler); }

    /**
     * @param {string} event
     * @param {(e: CustomEvent) => void} handler
     */
    once(event, handler) { this.addEventListener(event, handler, { once: true }); }

    /**
     * @param {string} event
     * @param {any} detail
     */
    emit(event, detail) { this.dispatchEvent(new CustomEvent(event, { detail })); }

    /**
     * @param {string} selfEvent
     * @param {XEventEmitter} otherObj
     * @param {string?} [otherEvent]
     */
    pipeTo(selfEvent, otherObj, otherEvent) { this.on(selfEvent, e => otherObj.emit(otherEvent || selfEvent, e.detail)); }

    /**
     * @param {string} event
     * @returns {Promise<any>}
     */
    waitFor(event) { return new Promise(r => this.once(event, e => r(e.detail))); }
};
