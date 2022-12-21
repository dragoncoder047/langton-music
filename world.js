/**
 * @typedef {Object} BoundingBox
 * @property {Vector} tl Top left corner
 * @property {Vector} br Bottom right corner
 */

/**
 * World that holds a grid of cells.
 */
class World {
    /**
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} cellSize The side length of the cell at zoom=1.
     * @param {array} colors Object of colors to draw each state in.
     */
    constructor(cellSize = 16, colors = {}) {
        this.cells = {};
        this.cellSize = cellSize;
        this.stateColors = colors;
    }
    /**
     * Draws all the cells on the canvas.
     */
    draw(ctx) {
        for (var cell in this.cells) {
            var [x, y] = cell.split(',');
            this.drawCell(ctx, parseInt(x, 16), parseInt(y, 16), this.getColor(this.cells[cell]));
        }
    }
    /**
     * Draws one cell.
     * @param {number} x 
     * @param {number} y 
     * @param {string} color 
     */
    drawCell(ctx, x, y, color) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.translate(x * this.cellSize, y * this.cellSize);
        ctx.fillRect(-this.cellSize / 2, -this.cellSize / 2, this.cellSize, this.cellSize);
        ctx.restore();
    }
    /**
     * Creates or returns the color for this state.
     * @param {number} state 
     * @returns {string}
     */
    getColor(state) {
        if (!(state in this.stateColors))
            this.stateColors[state] = `rgb(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255})`;
        return this.stateColors[state];
    }
    /**
     * Gets the cell state at (x, y).
     * @param {number} x 
     * @param {number} y 
     * @returns {number}
     */
    getCell(x, y) {
        return this.cells[`${x.toString(16)},${y.toString(16)}`] ?? 0;
    }
    /**
     * Sets the cell at (x, y) to state.
     * @param {number} x 
     * @param {number} y 
     * @param {number} state 
     */
    setCell(x, y, state) {
        var coords = `${x.toString(16)},${y.toString(16)}`;
        if (state == 0) delete this.cells[coords];
        else this.cells[coords] = state;
    }
    /**
     * Sets the cell at (x, y) to state, or to 0 if it was already that.
     * @param {number} x 
     * @param {number} y 
     * @param {number} state 
     */
    paint(x, y, state) {
        var s = this.getCell(x, y);
        if (s === state) this.setCell(x, y, 0);
        else this.setCell(x, y, state);
    }
    /**
     * Sets all cells to 0.
     */
    clear() {
        this.cells = {};
    }
    /**
     * @param {Ants[]} ants List of ants to include in the calculations.
     * @returns {BoundingBox}
     */
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
        console.log({ tl: { x: minX, y: minY }, br: { x: maxX, y: maxY } });
        return { tl: { x: minX, y: minY }, br: { x: maxX, y: maxY } };
    }
    /**
     * Serializes the data into an `<rle>` XML tag.
     * @returns {string}
     */
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
    /**
     * Uncompresses and pastes the RLE data at (x, y).
     * @param {string} rle Raw compressed RLE data
     * @param {number} x 
     * @param {number} y 
     */
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

/**
 * Compresses the RLE string.
 * @param {string} text 
 * @returns {string}
 */
function rleCompress(text) {
    return text.replaceAll(/(([p-x]?[A-X]|[$.])+)\1+/g, function (all, one) {
        return (all.length / one.length) + '(' + one + ')';
    }).replaceAll(/([p-x]?[A-X]|\.|\$)\1+/g, function (all, one) {
        return (all.length / one.length) + one;
    }).replaceAll(/(\d)+(?:\(([p-x]?[A-X]|[$.])\))/g, function (all, num, t) {
        return num + t;
    });
}

/**
 * Uncompresses the RLE string.
 * @param {string} text 
 * @returns {string}
 */
function rleUncompress(text) {
    return text.replaceAll(/(\d+)\(([^\)]+)\)/g, function (_, times, what) {
        return what.repeat(parseInt(times));
    }).replaceAll(/(\d+)([p-x]?[A-X]|\.|\$)/g, function (_, times, what) {
        return what.repeat(parseInt(times));
    });
}

/**
 * Turns the string of letters into a number.
 * @param {string} letters 
 * @returns {number}
 */
function lettersToStateNum(letters) {
    if (letters.length == 1) return '.ABCDEFGHIJKLMNOPQRSTUVWX'.indexOf(letters);
    return lettersToStateNum(letters.slice(1)) + (24 * ('pqrstuvwx'.indexOf(letters[0]) + 1));
}

/**
 * Turns the state number into a string of letters.
 * @param {number} state 
 * @returns {string}
 */
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
