class World {
    constructor(ctx, cellSize = 16, colors = {}) {
        this.cells = {};
        this.cellSize = cellSize;
        this.ctx = ctx;
        this.stateColors = colors;
    }
    draw() {
        for (var cell in this.cells) {
            var [x, y] = cell.split(',');
            this.drawCell(parseInt(x, 16), parseInt(y, 16), this.getColor(this.cells[cell]));
        }
    }
    drawCell(x, y, color) {
        this.ctx.save();
        this.ctx.fillStyle = color;
        this.ctx.translate(x * this.cellSize, y * this.cellSize);
        this.ctx.fillRect(-this.cellSize / 2, -this.cellSize / 2, this.cellSize, this.cellSize);
        this.ctx.restore();
    }
    getColor(state) {
        if (!(state in this.stateColors))
            this.stateColors[state] = `rgb(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255})`;
        return this.stateColors[state];
    }
    getCell(x, y) {
        return this.cells[`${x.toString(16)},${y.toString(16)}`] ?? 0;
    }
    setCell(x, y, state) {
        var coords = `${x.toString(16)},${y.toString(16)}`;
        if (state === 0) delete this.cells[coords];
        else this.cells[coords] = state;
    }
    clear() {
        this.cells = {};
    }
    bbox(ants) {
        var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, got = false;
        for (var cell of Object.getOwnPropertyNames(this.cells)) {
            var [x, y] = cell.split(',');
            x = parseInt(x, 16); y = parseInt(y, 16);
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
            got = true;
        }
        for (var ant of ants) {
            minX = Math.min(minX, ant.x); maxX = Math.max(maxX, ant.x);
            minY = Math.min(minY, ant.y); maxY = Math.max(maxY, ant.y);
            got = true;
        }
        if (!got) return { tl: [0, 0], br: [0, 0] };
        console.log({ tl: [minX, minY], br: [maxX, maxY] });
        return { tl: [minX, minY], br: [maxX, maxY] };
    }

    dump() {
        var { tl: [minX, minY], br: [maxX, maxY] } = this.bbox([]);
        var uncompressed = '';
        for (var y = minY; y <= maxY; y++) {
            var line = '';
            for (var x = minX; x <= maxX; x++) {
                line += stateNumToLetters(this.getCell(x, y));
            }
            uncompressed += '$';
            uncompressed += line.replace(/\.*$/, '');
        }
        return `<rle x="${minX}" y="${minY}">${rleCompress(uncompressed)}</rle>`;
    }
    paste(rle, x, y) {
        var origX = x;
        for (var [c] of rleUncompress(rle).matchAll(/[p-x]?[A-X]|[$.]/g)) {
            if (c === '$') {
                y++;
                x = origX;
            }
            else {
                this.setCell(x, y, lettersToStateNum(c));
                x++;
            }
        }
    }
}

function rleCompress(text) {
    var r1 = text.replaceAll(/(([p-x]?[A-X]|[$.])+)\1+/g, function (all, one) {
        return (all.length / one.length) + '(' + one + ')';
    });
    return r1.replaceAll(/([p-x]?[A-X]|\.|\$)\1+/g, function (all, one) {
        return (all.length / one.length) + one;
    });
}

function rleUncompress(text) {
    var u1 = text.replaceAll(/(\d+)\(([^\)]+)\)/g, function (_, times, what) {
        return what.repeat(parseInt(times));
    });
    return u1.replaceAll(/(\d+)([p-x]?[A-X]|\.|\$)/g, function (_, times, what) {
        return what.repeat(parseInt(times));
    });
}

function lettersToStateNum(letters) {
    if (letters.length == 1) return '.ABCDEFGHIJKLMNOPQRSTUVWX'.indexOf(letters);
    return lettersToStateNum(letters.slice(1)) + (24 * ('pqrstuvwx'.indexOf(letters[0]) + 1));
}

function stateNumToLetters(state) {
    if (state === undefined) return '';
    if (state == 0) return '.';
    var out = '';
    if (state > 24) {
        var hi = (state - 25) / 24;
        out += 'pqrstuvwxy'[hi];
        state -= (hi + 1) * 24;
    }
    return 'ABCDEFGHIJKLMNOPQRSTUVWX'[state - 1] + out;
}