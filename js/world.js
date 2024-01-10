
class World {
        constructor(cellSize = 16, colors = {}) {
        this.cells = {};
        this.cellSize = cellSize;
        this.stateColors = colors;
        this.rng = 'seedrandom' in Math ? new Math.seedrandom('yes') : Math.random;
    }
        draw(ctx) {
        for (var cell in this.cells) {
            var [x, y] = cell.split(',');
            this.drawCell(ctx, parseInt(x, 16), parseInt(y, 16), this.getColor(this.cells[cell]));
        }
    }
        drawCell(ctx, x, y, color) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.translate(x * this.cellSize, y * this.cellSize);
        ctx.fillRect(-this.cellSize / 2, -this.cellSize / 2, this.cellSize, this.cellSize);
        ctx.restore();
    }
        getColor(state) {
        if (!(state in this.stateColors))
            this.stateColors[state] = `rgb(${this.rng() * 255},${this.rng() * 255},${this.rng() * 255})`;
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
        paint(x, y, state) {
        var s = this.getCell(x, y);
        if (s === state) this.setCell(x, y, 0);
        else this.setCell(x, y, state);
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
        if (!got) return { tl: { x: 0, y: 0 }, br: { x: 0, y: 0 } };
        return { tl: { x: minX, y: minY }, br: { x: maxX, y: maxY } };
    }
        dump() {
        var { tl: { x: minX, y: minY }, br: { x: maxX, y: maxY } } = this.bbox([]);
        var uncompressed = '';
        for (var y = minY; y <= maxY; y++) {
            var line = '';
            for (var x = minX; x <= maxX; x++) {
                line += stateNumToLetters(this.getCell(x, y));
            }
            uncompressed += '$';
            uncompressed += line.replace(/\.*$/, '');
        }
        return `<rle x="${minX}" y="${minY - 1}">${rleCompress(uncompressed)}</rle>`;
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
    var out = text.replaceAll(/(([p-x]?[A-X]|[$.])+)\1+/g, function (all, one) {
        return (all.length / one.length) + '(' + one + ')';
    }).replaceAll(/([p-x]?[A-X]|\.|\$)\1+/g, function (all, one) {
        return (all.length / one.length) + one;
    }).replaceAll(/(\d)+(?:\(([p-x]?[A-X]|[$.])\))/g, function (all, num, t) {
        return num + t;
    });
    var out2 = "";
    while (out) {
        out2 += out.slice(0, 70);
        out = out.slice(70);
        out2 += "\n";
    }
    return out2;
}

function rleUncompress(text) {
    return text.replaceAll(/\s+/g, "").replaceAll(/(\d+)\(([^\)]+)\)/g, function (_, times, what) {
        return what.repeat(parseInt(times));
    }).replaceAll(/(\d+)([p-x]?[A-X]|\.|\$)/g, function (_, times, what) {
        return what.repeat(parseInt(times));
    });
}

function lettersToStateNum(letters) {
    if (letters.length === 1) return '.ABCDEFGHIJKLMNOPQRSTUVWX'.indexOf(letters);
    return lettersToStateNum(letters.slice(1)) + (24 * ('pqrstuvwx'.indexOf(letters[0]) + 1));
}

function stateNumToLetters(state) {
    if (state === undefined) return '';
    if (state === 0) return '.';
    var out = '';
    if (state > 24) {
        var hi = (state - 25) / 24;
        out += 'pqrstuvwxy'[hi];
        state -= (hi + 1) * 24;
    }
    return 'ABCDEFGHIJKLMNOPQRSTUVWX'[state - 1] + out;
}
