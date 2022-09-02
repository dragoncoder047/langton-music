class Breeder {
    constructor() {
        this.breeds = {};
    }
    empty() {
        this.breeds = {};
    }
    _checkNode(node, name, inside) {
        var gotName = node.nodeName.toLowerCase();
        if (!node instanceof Element) throw `No strings allowed inside <${inside}>`;
        if (gotName !== name) throw `Invalid inside <${inside}>: <${gotName}>`;
    }
    addBreed(breedName, klass, commands) {
        if (breedName in this.breeds) throw `Breed ${breedName} is already defined.`;
        var fixedCommands = {};
        for (var cs of commands.childNodes) {
            this._checkNode(cs, 'case', 'breed');
            var state = checkint(cs, 'state', 'case', 1);
            var cell = checkint(cs, 'cell', 'case');
            var fixedTicks = [];
            for (var tick of cs.childNodes) {
                this._checkNode(tick, 'action', 'case');
                var fixedSubticks = [];
                for (var subtick of tick.childNodes) {
                    this._checkNode(tick, 'command', 'action');
                    var commandName = checkattr(subtick, 'name', 'command');
                    var argument = subtick.textContent;
                    if (typeof klass.prototype[`do_${commandName}`] !== 'function') throw `Ant breed ${breedName}: Unknown command '${commandName}' to species ${klass.name}`;
                    fixedSubticks.push([commandName, argument]);
                }
                fixedTicks.push(fixedSubticks);
            }
            fixedCommands[`${state}:${cell}`] = fixedTicks;
        }
        this.breeds[breedName] = [klass, fixedCommands];
    }
    dumpBreeds() {
        return Object.getOwnPropertyNames(this.breeds).map(breed => `\t<breed species="${this.breeds[breed][0].name}" name="${breed}">\n\t\t${Object.getOwnPropertyNames(this.breeds[breed][1]).map(p => [p, this.breeds[breed][1][p].map(sc => sc.map(cd => `\t\t\t\t<command name="${cd[0]}">${cd[1]}</command>`).join('\n')).join('</action>\n\t\t\t<action>')]).map(c => `\t\t<case state="${c[0].split(':')[0]} cell="${c[0].split(':')[1]}"> =>\n\t\t\t<action>${c[1]}\n\t\t\t</action>\n\t\t</case>`).join('\n')}\n\t</breed>`).join('\n');
    }
    createAnt(breed, world, x, y, dir, state, antsList, id) {
        if (!(breed in this.breeds)) throw `Unknown ant breed ${breed}`;
        var klass = this.breeds[breed][0];
        var commands = this.breeds[breed][1];
        return new klass(this, antsList, breed, world, commands, state, x, y, dir, id);
    }
}


class Ant {
    constructor(breeder, antList, breed, world, commands, initialState, x, y, dir, id = null) {
        this.breeder = breeder;
        this.antList = antList;
        this.breed = breed;
        this.ctx = world.ctx;
        this.world = world;
        this.state = initialState;
        this.x = x;
        this.y = y;
        this.dir = dir;
        this.commands = commands;
        this.queue = [];
        this.halted = false;
        this.dead = false;
        this.id = id || `${this.breed}-${randuuid()}`;
    }
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
    tick() {
        this.ensureQueueNotEmpty();
        var commands = this.queue.shift();
        for (var [name, arg] of commands) {
            this.halted = false;
            this[`do_${name}`](this.processInserts(arg || ''));
        }
    }
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

function randuuid() {
    return new Array(4).fill().map(() => Math.floor(Math.random() * (2 ** 32)).toString(16)).join('-');
}
