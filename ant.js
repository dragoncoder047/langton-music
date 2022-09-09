/**
 * Checks to make sure the node nesting is correct.
 * @param {HTMLElement} node The XML node to be checked for validity.
 * @param {string} name The name of the node that `node` should be.
 * @param {string} inside The name of the elemnt that weaps this one, in case of a mismatch and an error.
 * @returns {boolean} Whether the node is a `#text` node and should be skipped.
 * @throws {string} When `node.nodeName !== name`. 
 */
function checknode(node, name, inside) {
    // returns true if it should be skipped.
    // returns false if it is ok to go.
    // throws if it is bad.
    var gotName = node.nodeName.toLowerCase();
    if (gotName === '#text') return true;
    if (gotName !== name) throw `Invalid inside <${inside}>: <${gotName}>`;
    return false;
}

/**
 * Manager class for creating ants.
 */
class Breeder {
    constructor() {
        this.breeds = {};
    }
    /**
     * Removes all the ant breeds.
     */
    empty() {
        this.breeds = {};
    }
    /**
     * Registers a breed.
     * @param {string} breedName The name of the breed.
     * @param {function} klass The class constructor for the ant.
     * @param {HTMLElement} cases The `<case>` tags that describe the ant's behavior.
     */
    addBreed(breedName, klass, cases) {
        if (breedName in this.breeds) throw `Breed ${breedName} is already defined.`;
        var allCases = {};
        for (var case_ of cases.childNodes) {
            if (checknode(case_, 'case', 'breed')) continue;
            var state = checkint(case_, 'state', 1, false);
            var cell = checkint(case_, 'cell');
            var fixedCase = [];
            for (var action of case_.childNodes) {
                if (checknode(action, 'case')) continue;
                var fixedAction = [];
                for (var command of action.childNodes) {
                    if (checknode(command, 'action')) continue;
                    var commandName = checkattr(command, 'name');
                    var argument = command.textContent;
                    if (typeof klass.prototype[`do_${commandName}`] !== 'function') throw `Ant breed ${breedName}: Unknown command '${commandName}' to species ${klass.name}`;
                    fixedAction.push([commandName, argument]);
                }
                fixedCase.push(fixedAction);
            }
            allCases[`${state}:${cell}`] = fixedCase;
        }
        this.breeds[breedName] = [klass, allCases];
    }
    /**
     * Serializes the stored breeds to XML.
     * @returns {string}
     */
    dumpBreeds() {
        return Object.getOwnPropertyNames(this.breeds).map(breed => `    <breed species="${this.breeds[breed][0].name}" name="${breed}">\n${Object.getOwnPropertyNames(this.breeds[breed][1]).map(p => [p, this.breeds[breed][1][p].map(sc => sc.map(cd => `                <command name="${cd[0]}">${cd[1]}</command>`).join('\n')).join('</action>\n            <action>')]).map(c => `        <case state="${c[0].split(':')[0]}" cell="${c[0].split(':')[1]}">\n            <action>\n${c[1]}\n            </action>\n        </case>`).join('\n')}\n    </breed>`).join('\n');
    }
    /**
     * Creates a new ant.
     * @param {string} breed Name of the breed
     * @param {World} world 
     * @param {number} x 
     * @param {number} y 
     * @param {AntDirection} dir 
     * @param {number} state 
     * @param {Ant[]} antsList Reference to list of ants.
     * @param {string} id Arbitrary ant ID.
     * @returns 
     */
    createAnt(breed, world, x, y, dir, state, antsList, id) {
        if (!(breed in this.breeds)) throw `Unknown ant breed ${breed}`;
        var klass = this.breeds[breed][0];
        var commands = this.breeds[breed][1];
        return new klass(this, antsList, breed, world, commands, state, x, y, dir, id);
    }
}

/**
 * @typedef {0|1|2|3} AntDirection
 */

/**
 * Class for an Ant.
 */
class Ant {
    /**
     * 
     * @param {Breeder} breeder Reverence to the `Breeder` that produced this ant.
     * @param {Ant[]} antList A reference to the list of ants this is a member of.
     * @param {string} breed The name of this breed.
     * @param {World} world A reference to the `World` this ant lives in.
     * @param {object} commands Serialized commands processed by the `breeder`.
     * @param {number} initialState The state of the ant.
     * @param {number} x X-position
     * @param {number} y Y-position
     * @param {AntDirection} dir Direction.
     * @param {string} [id] The arbitrary ID of the ant. 
     */
    constructor(breeder, antList, breed, world, commands, initialState, x, y, dir, id) {
        /**
         * @type {Breeder}
         */
        this.breeder = breeder;
        /**
         * @type {Ant[]}
         */
        this.antList = antList;
        /**
         * @type {string}
         */
        this.breed = breed;
        /**
         * @type {CanvasRenderingContext2D}
         */
        this.ctx = world.ctx;
        /**
         * @type {World}
         */
        this.world = world;
        /**
         * @type {number}
         */
        this.state = initialState;
        /**
         * @type {number}
         */
        this.x = x;
        /**
         * @type {number}
         */
        this.y = y;
        /**
         * @type {AntDirection}
         */
        this.dir = dir;
        /**
         * @type {object}
         */
        this.commands = commands;
        /**
         * @type {any[][]}
         */
        this.queue = [];
        /**
         * @type {boolean}
         */
        this.halted = false;
        /**
         * @type {boolean}
         */
        this.dead = false;
        /**
         * @type {string}
         */
        this.id = id || `${this.breed}-${randuuid()}`;
    }
    /**
     * Processes `#name` substitutions and `#exp;` interpolations for this ant.
     * @param {string} arg Raw, unprocessed argument.
     * @returns {string} Processed string.
     */
    processInserts(arg) {
        var vars = ['dir', 'state'];
        // Do simple inserts
        for (var v of vars) {
            arg = arg.replaceAll('#' + v, this[v]);
        }
        // Do global interpolations
        if (window.interpolations) {
            for (var [f, b] of interpolations) {
                arg = arg.replaceAll('#' + f, b);
            }
        }
        // Do expressions
        arg = processExpressions(arg);
        return arg;
    }
    /**
     * Advances the ant one tick, executing the `<action>`.
     */
    tick() {
        this.ensureQueueNotEmpty();
        var commands = this.queue.shift();
        for (var [name, arg] of commands) {
            this.halted = false;
            this[`do_${name}`](this.processInserts(arg || ''));
        }
    }
    /**
     * If the queue is not empty, fetches more commands from the world and rules.
     */
    ensureQueueNotEmpty() {
        if (this.queue.length === 0) {
            var what = this.commands[`${this.state}:${this.world.getCell(this.x, this.y)}`] ?? [];
            this.queue.push(...what);
        }
        if (this.queue.length === 0) {
            this.halted = true;
            this.queue.push([]);
        }
    }
    /**
     * Draws the ant on the context.
     */
    draw() {
        this.ctx.save();
        this.ctx.translate(this.world.cellSize * this.x, this.world.cellSize * this.y);
        this.ctx.scale(this.world.cellSize / 16, this.world.cellSize / 16);
        this.ctx.rotate(Math.PI * this.dir / 2);
        //antennae
        this.ctx.fillStyle = this.world.getColor(this.state);
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 0.2;
        this.ctx.beginPath();
        this.ctx.moveTo(-4, -7);
        this.ctx.lineTo(0, -3);
        this.ctx.lineTo(4, -7);
        this.ctx.stroke();
        //3 circles
        this.ctx.beginPath(); this.ctx.arc(0, -3, 2, 0, 2 * Math.PI); this.ctx.fill();
        this.ctx.beginPath(); this.ctx.arc(0, 1, 2, 0, 2 * Math.PI); this.ctx.fill();
        this.ctx.beginPath(); this.ctx.arc(0, 5, 2, 0, 2 * Math.PI); this.ctx.fill();
        this.ctx.beginPath(); this.ctx.arc(0, -3, 2, 0, 2 * Math.PI); this.ctx.stroke();
        this.ctx.beginPath(); this.ctx.arc(0, 1, 2, 0, 2 * Math.PI); this.ctx.stroke();
        this.ctx.beginPath(); this.ctx.arc(0, 5, 2, 0, 2 * Math.PI); this.ctx.stroke();
        //eyes
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath(); this.ctx.arc(1, -4, 1, 0, 2 * Math.PI); this.ctx.fill();
        this.ctx.beginPath(); this.ctx.arc(-1, -4, 1, 0, 2 * Math.PI); this.ctx.fill();
        this.ctx.beginPath(); this.ctx.arc(1, -4, 1, 0, 2 * Math.PI); this.ctx.stroke();
        this.ctx.beginPath(); this.ctx.arc(-1, -4, 1, 0, 2 * Math.PI); this.ctx.stroke();
        //pupils
        this.ctx.fillStyle = 'black';
        this.ctx.beginPath(); this.ctx.arc(1, -4.5, 0.5, 0, 2 * Math.PI); this.ctx.fill();
        this.ctx.beginPath(); this.ctx.arc(-1, -4.5, 0.5, 0, 2 * Math.PI); this.ctx.fill();
        this.ctx.restore();
    }
    /**
     * Checks the argument is a number, and returns it.
     * @param {string} arg The argument to be checked.
     * @param {string} methodname The method that requires a number argument.
     * @param {number} default_ The default if the argument is the empty string.
     * @returns {number}
     */
    numarg(arg, methodname, default_ = 1) {
        arg = arg || default_;
        var argNum = parseInt(arg);
        if (isNaN(argNum)) throw `${methodname}: ${arg} is not a number`;
        return argNum;
    }
    do_state(arg) {
        if (!arg) throw 'state: which state?';
        var argNum = this.numarg(arg, 'state');
        this.state = argNum;
    }
    do_fd(arg) {
        var argNum = this.numarg(arg, 'fd');
        switch (this.dir) {
            case 0: // N
                this.y -= argNum;
                break;
            case 1: // E
                this.x += argNum;
                break;
            case 2: // S
                this.y += argNum;
                break;
            case 3: // W
                this.x -= argNum;
                break;
        }
    }
    do_rt(arg) {
        var argNum = this.numarg(arg, 'rt');
        this.dir = (this.dir + argNum) % 4;
    }
    do_lt(arg) {
        var argNum = this.numarg(arg, 'lt');
        this.do_rt(4 - argNum);
    }
    do_dir(arg) {
        var argNum = this.numarg(arg, 'dir');
        if (argNum > 3 || argNum < 0) throw `dir: out of range: ${argNum}`;
        this.dir = argNum;
    }
    do_bk(arg) {
        var argNum = this.numarg(arg, 'bk');
        this.do_rt(2);
        this.do_fd(argNum);
        this.do_rt(2);
    }
    do_put(arg) {
        var argNum = this.numarg(arg, 'put');
        this.world.setCell(this.x, this.y, argNum);
    }
    do_spawn(arg) {
        var [breed, dir, state] = arg.split(':');
        if (!breed) throw `spawn: what breed?`;
        if (!dir) throw `spawn: what direction?`;
        if (!/^[0-3]$/.test(dir)) throw `spawn: invalid direction: ${dir}`;
        if (state && !/^\d+$/.test(state)) throw `spawn: invalid state: ${state}`;
        dir = parseInt(dir);
        state = parseInt(state ?? 1);
        this.antList.push(this.breeder.createAnt(breed, this.world, this.x, this.y, (dir + this.dir) % 4, state, this.antList));
    }
    do_die(arg) {
        if (arg) throw `die takes no argument`;
        this.dead = true;
    }
    do_alert(arg) {
        alert(arg);
    }
    do_status(arg) {
        if (!window.showStatus) throw 'status not available';
        var [s, color] = arg.split(',');
        showStatus(s.trim(), color ? color.trim() : undefined);
    }
}

/**
 * A random 8-character hexadecimal UUID.
 * @returns {string}
 */
function randuuid() {
    return Math.floor(Math.random() * (2 ** 32)).toString(16).padStart(8, '0');
}
