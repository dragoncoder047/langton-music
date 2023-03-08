/**
 * manager for Action callbacks
 */
class ActionManager {
    constructor() {
        /**
         * @type {Object<string, Function[]>}
         */
        this.listeners = {};
    }
    action(name, callback) {
        if (!(name in this.listeners)) {
            this.listeners[name] = [callback];
        } else {
            this.listeners[name].push(callback);
        }
    }
    trigger(name, payload) {
        var cbs = this.listeners[name];
        if (!cbs) {
            console.warn("no callbacks for action " + name);
            return;
        }
        console.group(name);
        console.info('payload:', payload);
        for (var callback of cbs) {
            callback(payload);
        }
        console.groupEnd();
    }
}
