class CanvasToolsManager {
    constructor(canvas, toolSelector, toolContainer, tools = []) {
        this.canvas = canvas;
        this.toolContainer = toolContainer;
        this.toolSelector = toolSelector;
        this.ctx = canvas.getContext('2d');
        this.mouseDown = false;
        this.panxy = { x: 0, y: 0 };
        this.downxy = { x: 0, y: 0 };
        this.lastxy = { x: 0, y: 0 };
        this.zoom = 1;
        this.enabled = true;
        this.tools = tools;
        this.activeToolIndex = 0;
        // attach event listeners
        canvas.addEventListener('mousedown', e => {
            if (!this.enabled) return;
            this.mouseDown = true;
            this.lastxy = { x: e.offsetX, y: e.offsetY };
            this.downxy = { x: e.offsetX, y: e.offsetY };
            this.event(e, 'onMouseDown', this.downxy);
        });
        canvas.addEventListener('mouseup', e => {
            if (!this.enabled) return;
            this.mouseDown = false;
            this.event(e, 'onMouseUp', this.lastxy);
            if (vectorDistance(this.lastxy, this.downxy) < 16) this.event(e, 'onClick', this.downxy);
        });
        canvas.addEventListener('touchmove', e => {
            if (!this.enabled) return;
            if (!this.mouseDown) {
                this.mouseDown = true;
                this.downxy = { x: e.offsetX, y: e.offsetY };
                this.event(e, 'onMouseDown', this.downxy);
            } else {
                this.event(e, 'onDrag', vectorDifference({ x: e.offsetX, y: e.offsetY }, this.lastxy));
            }
            this.lastxy = { x: e.offsetX, y: e.offsetY };
        });
        canvas.addEventListener('mousemove', e => {
            if (!this.enabled) return;
            if (!this.mouseDown) {
                this.event(e, 'onMouseOver', { x: e.offsetX, y: e.offsetY });
            }
            else {
                this.event(e, 'onDrag', vectorDifference({ x: e.offsetX, y: e.offsetY }, this.lastxy));
            }
            this.lastxy = { x: e.offsetX, y: e.offsetY };
        });
        canvas.addEventListener('wheel', e => {
            if (!this.enabled) return;
            this.event(e, 'onScroll', { x: e.deltaX, y: e.deltaY });
        });
        canvas.addEventListener('keydown', e => {
            this.event(e, 'onKey', e.key);
        });
        canvas.addEventListener('keyup', e => {
            this.event(e, 'onKeyUp', e.key);
        });
        // setup canbas resizing
        var dpr = window.devicePixelRatio || 1;
        var bsr = this.ctx.webkitBackingStorePixelRatio || this.ctx.mozBackingStorePixelRatio || this.ctx.msBackingStorePixelRatio || this.ctx.oBackingStorePixelRatio || this.ctx.backingStorePixelRatio || 1;
        var ratio = dpr / bsr;
        this.ctx.imageSmoothingEnabled = false;
        window.addEventListener('resize', () => {
            var rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width * ratio;
            canvas.height = rect.height * ratio;
            canvas.style.width = `${rect.width - 10}px`;
            canvas.style.height = `${rect.height - 10}px`;
        });
        window.dispatchEvent(new Event('resize'));
        // setup tool selector
        this.toolSelector.innerHTML = '';
        for (var i = 0; i < this.tools.length; i++) {
            var t = this.tools[i];
            var e = document.createElement('option');
            e.setAttribute('value', i);
            e.textContent = t.displayName;
            this.toolSelector.append(e);
        }
        this.toolSelector.addEventListener('change', () => {
            this.changeTool(this.toolSelector.value);
        });
    }
    enter() {
        this.ctx.save();
        this.ctx.setTransform(this.zoom, 0, 0, this.zoom, this.panxy.x, this.panxy.y);
    }
    exit() {
        this.ctx.restore();
    }
    drawTransformed(fun) {
        this.enter();
        fun();
        this.exit();
    }
    clear() {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
    }
    event(e, name, point) {
        var tool = this.tools[this.activeToolIndex];
        var fun = tool[name];
        if (typeof fun !== 'function') return;
        var cancel = fun.call(tool, this, point, makeModifiers(e), e);
        if (cancel) e.preventDefault();
    }
    transformMousePoint(pt) {
        return { x: (pt.x - this.panxy.x) / this.zoomFactor, y: (pt.y - this.panxy.y) / this.zoomFactor };
    }
    changeTool(toolIndex) {
        if (toolIndex === this.activeToolIndex) return;
        this.tools[this.activeToolIndex].deactivate();
        this.tools[toolIndex].activate(this.toolContainer);
        this.activeToolIndex = toolIndex;
    }
}

const M_LEFT = 0b000000000001;
const M_RIGHT = 0b00000000010;
const M_WHEEL = 0b00000000100;
const M_BACK = 0b000000001000;
const M_FORWARD = 0b000010000;
const K_ALT = 0b0000000100000;
const K_CTRL = 0b000001000000;
const K_META = 0b000010000000;
const K_SHIFT = 0b00100000000;
function makeModifiers(e) {
    var out = e.buttons || 0;
    if (e.altKey) out |= K_ALT;
    if (e.ctrlKey) out |= K_CTRL;
    if (e.metaKey) out |= K_META;
    if (e.shiftKey) out |= K_SHIFT;
    return out;
}

// base class
class Tool {
    displayName = 'Nothing'
    constructor() {
        this.element = document.createElement('span');
        this.element.classList.add('flex-row');
    }
    onMouseDown(tm, xy, mod, e) { return false; }
    onMouseUp(tm, xy, mod, e) { return false; }
    onClick(tm, xy, mod, e) { return false; }
    onDrag(tm, xy, mod, e) { return false; }
    onScroll(tm, xy, mod, e) { return false; }
    onKey(tm, xy, mod, e) { return false; }
    onKeyUp(tm, xy, mod, e) { return false; }
    activate(container) {
        container.appendChild(this.element);
    }
    deactivate() {
        this.element.remove();
    }
}

class DragTool extends Tool {
    displayName = 'Drag'
    constructor(zoomFactor = 1.01) {
        super();
        this.zoomFactor = zoomFactor;
    }
    onDrag(tm, xy, mod) {
        tm.panxy = vectorSum(tm.panxy, xy);
    }
    onScroll(tm, xy, mod) {
        if (!(mod & K_SHIFT)) {
            var factor = this.zoomFactor ** (-xy.y);
            tm.zoom *= factor;
            tm.panxy.x = (tm.panxy.x * factor) - (factor * tm.lastxy.x) + tm.lastxy.x;
            tm.panxy.y = (tm.panxy.y * factor) - (factor * tm.lastxy.y) + tm.lastxy.y;
        }
        else {
            tm.panxy.y -= xy.y;
            tm.panxy.x -= xy.x;
        }
    }
}

class WorldEditTool extends Tool {
    displayName = '_edit'
    constructor(world) {
        super();
        this.world = world;
    }
    toCellCoords(tm, xy) {
        var c = vectorScale(tm.transformMousePoint(xy), 1 / this.world.cellSize);
        return { x: Math.round(c.x), y: Math.round(c.y) };
    }
}

class DrawCellsTool extends WorldEditTool {
    displayName = 'Draw Cells'
    constructor(world) {
        super(world);
        this.element.innerHTML = '<label>Cell State: <input type="number" min="0" step="1"></input></label>';
        this.input = this.element.querySelector('input');
        this.isErasing = false;
    }
    onClick(tm, xy, mod) {
        var c = this.toCellCoords(tm, xy);
        if (mod & K_SHIFT)
            this.input.value = this.world.getCell(c.x, c.y);
        else
            this.world.paint(c.x, c.y, this.input.value);
    }
    onMouseDown(tm, xy) {
        var c = this.toCellCoords(tm, xy);
        this.erasing = this.input.value === this.world.getCell(c.x, c.y);
    }
    onDrag(tm) {
        var c = this.toCellCoords(tm, tm.lastxy);
        if (this.erasing) this.world.setCell(c.x, c.y, 0);
        else this.world.setCell(c.x, c.y, this.input.value);
    }
}

class DrawAntsTool extends WorldEditTool {
    displayName = 'Draw Ants';
    constructor(world, breeder, antsList) {
        super(world);
        this.breeder = breeder;
        this.antsList = antsList;
        this.element.innerHTML = '<label>Breed: <select class="bsel"></select></label> <label>State: <input type="number" min="0" step="1"></input></label> <label>Direction: <select class="dirsel"><option value="0">North</option><option value="1">East</option><option value="2">South</option><option value="3">West</option></select></label>';
        this.breedSelect = this.element.querySelector('.bsel');
        this.stateSelect = this.element.querySelector('input');
        this.direcSelect = this.element.querySelector('.dirsel');
        // do some monkey patching
        var oldBreederEmpty = breeder.empty.bind(breeder);
        var oldBreederAddBreed = breeder.addBreed.bind(breeder);
        breeder.empty = () => {
            oldBreederEmpty();
            this.updateBreedSelector();
        };
        breeder.addBreed = (...args) => {
            oldBreederAddBreed(...args);
            this.updateBreedSelector();
        }
    }
    updateBreedSelector() {
        var sb = this.breedSelect.value;
        var breedNames = Object.getOwnPropertyNames(this.breeder.breeds);
        this.breedSelect.childNodes.forEach(node => {
            if (node.value === '') return;
            if (!breedNames.some(b => b === node.textContent))
                node.remove();
        });
        breedNames.forEach(b => {
            if (![].some.call(this.breedSelect.childNodes, node => node.textContent === b)) {
                var n = document.createElement('option');
                n.textContent = b;
                this.breedSelect.append(n);
            }
        });
        this.breedSelect.value = breedNames.some(b => b === sb) ? sb : (breedNames[0] || '');
    }
    onClick(tm, xy, mod) {
        var c = this.toCellCoords(tm, xy);
        var i = this.antsList.find(ant => ant.x === c.x && ant.y === c.y);
        if (mod & K_SHIFT) {
            if (i !== -1) {
                var ant = this.antsList[i];
                this.breedSelect.value = ant.breed;
                this.stateSelect.value = ant.state;
                this.direcSelect.value = ant.dir;
            }
        } else {
            if (mod & K_CTRL) {
                if (i !== -1) this.antsList.splice(i, 1);
                else /* noop */;
            } else {
                this.antsList.push(this.breeder.createAnt(this.breedSelect.value, this.world, c.x, c.y, this.direcSelect.value, this.stateSelect.value, undefined));
            }
        }
    }
}