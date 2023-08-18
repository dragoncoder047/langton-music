/**
 * manager for Action callbacks
 */
class ActionManager extends XEventEmitter {
    constructor() {
    }
    /**
     * define what happens for the action
     * @param {string} name
     * @param {(payload: any) => void} callback
     */
    action(name, callback) {
        this.on("action." + name, callback);
    }

    /**
     * @param {string} name
     * @param {any} payload
     * @returns {false}
     */
    trigger(name, payload) {
        console.group(name);
        console.info('payload:', payload);
        try {
            this.emit("action." + name, payload);
        }
        finally {
            console.groupEnd();
        }
        return false;
    }
}
