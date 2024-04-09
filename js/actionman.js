class ActionManager extends XEventEmitter {
    constructor() {
        super();
    }
        action(name, callback) {
        this.on("action." + name, callback);
    }

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
