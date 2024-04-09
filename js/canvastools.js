function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    var reportedXY;
    if (evt.touches) {
        reportedXY = vScale([].map.call(evt.touches, t => ({ x: t.clientX, y: t.clientY })).reduce(vPlus), 1 / evt.touches.length);
    }
    else {
        reportedXY = { x: evt.clientX, y: evt.clientY };
    }
    return {
        x: (reportedXY.x - rect.left) / (rect.right - rect.left) * canvas.width,
        y: (reportedXY.y - rect.top) / (rect.bottom - rect.top) * canvas.height
    };
}

class CanvasToolsManager {
        constructor(canvas, toolSelector, toolContainer, tools = []) {
                this.canvas = canvas;
                this.ctx = canvas.getContext('2d');
                this.zoom = 1;
                this.enabled = true;
        if (toolSelector) {
                        this.toolContainer = toolContainer;
                        this.toolSelector = toolSelector;

                        this.mouseDown = false;
                        this.timeDown = 0;
                        this.panxy = { x: 0, y: 0 };
                        this.downxy = { x: 0, y: 0 };
                        this.lastxy = { x: 0, y: 0 };
                        this.tools = tools;
                        this.activeToolIndex = 0;
            // attach event listeners
            canvas.addEventListener('mousedown', e => {
                this.mouseDown = true;
                this.timeDown = +new Date();
                this.downxy = getMousePos(canvas, e);
                this.lastxy = vClone(this.downxy);
                this.event(e, 'onMouseDown', this.downxy);
            });
            canvas.addEventListener('touchstart', e => {
                this.mouseDown = true;
                this.timeDown = +new Date();
                this.downxy = getMousePos(canvas, e);
                this.lastxy = vClone(this.downxy);
                this.event(e, 'onMouseDown', this.downxy);
            });
            canvas.addEventListener('mouseup', e => {
                this.mouseDown = false;
                this.event(e, 'onMouseUp', this.lastxy);
                if (vRelMag(this.lastxy, this.downxy) < 16 && +new Date() - this.timeDown < 250) this.event(e, 'onClick', this.downxy);
            });
            canvas.addEventListener('touchend', e => {
                this.mouseDown = false;
                this.event(e, 'onMouseUp', this.lastxy);
                if (vRelMag(this.lastxy, this.downxy) < 16 && +new Date() - this.timeDown < 250) this.event(e, 'onClick', this.downxy);
            });
            canvas.addEventListener('touchmove', e => {
                var xy = getMousePos(canvas, e);
                if (!this.mouseDown) {
                    this.mouseDown = true;
                    this.downxy = vClone(xy);
                    this.event(e, 'onMouseDown', this.downxy);
                } else {
                    this.event(e, 'onDrag', vMinus(xy, this.lastxy));
                }
                this.lastxy = vClone(xy);
            });
            canvas.addEventListener('mousemove', e => {
                var xy = getMousePos(canvas, e);
                if (!this.mouseDown) {
                    this.event(e, 'onMouseOver', xy);
                }
                else {
                    this.event(e, 'onDrag', vMinus(xy, this.lastxy));
                }
                this.lastxy = vClone(xy);
            });
            canvas.addEventListener('wheel', e => {
                this.event(e, 'onScroll', { x: e.deltaX, y: e.deltaY });
            });
            canvas.addEventListener('keydown', e => this.event(e, 'onKey', e.key));
            canvas.addEventListener('keyup', e => this.event(e, 'onKeyUp', e.key));
            // setup canvas resizing
            var dpr = window.devicePixelRatio || 1;
            var bsr = this.ctx.webkitBackingStorePixelRatio || this.ctx.mozBackingStorePixelRatio || this.ctx.msBackingStorePixelRatio || this.ctx.oBackingStorePixelRatio || this.ctx.backingStorePixelRatio || 1;
            var ratio = dpr / bsr;
            this.ctx.imageSmoothingEnabled = false;
            window.addEventListener('resize', () => {
                canvas.width = (canvas.parentElement.clientWidth - 10) * ratio;
                canvas.height = (canvas.parentElement.clientHeight - 10) * ratio;
            });
            window.dispatchEvent(new UIEvent('resize'));
            // autofocus
            canvas.addEventListener('mouseover', () => canvas.focus());
            canvas.addEventListener('mouseout', () => canvas.blur());
            // setup tool selector
            this.toolSelector.innerHTML = '';
            for (var i = 0; i < this.tools.length; i++) {
                var t = this.tools[i];
                var e = document.createElement('option');
                e.setAttribute('value', i);
                e.textContent = t.constructor.displayName;
                this.toolSelector.append(e);
            }
            this.toolSelector.addEventListener('change', () => {
                this.changeTool(this.toolSelector.value);
            });
        }
    }
        zoomBy(factor, center) {
        if (!center) center = vScale({ x: this.canvas.width, y: this.canvas.height }, 0.5);
        this.zoom *= factor;
        this.panxy = vPlus(vMinus(vScale(this.panxy, factor), vScale(center, factor)), center);
    }
        panBy(xy) {
        this.panxy = vPlus(this.panxy, xy);
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
        if (!this.enabled || !this.toolSelector) return;
        var tool = this.tools[this.activeToolIndex];
        var fun = tool[name];
        var unhandled = fun.call(tool, this, point, makeModifiers(e), e);
        if (unhandled) {
            tool = this.tools[0];
            fun = tool[name];
            unhandled = fun.call(tool, this, point, makeModifiers(e), e);
        }
        if (!unhandled) e.preventDefault();
    }
        transformMousePoint(pt) {
        return vScale(vMinus(pt, this.panxy), 1/this.zoom);
    }
        changeTool(toolIndex) {
        if (toolIndex === this.activeToolIndex) return;
        this.tools[this.activeToolIndex].deactivate();
        this.tools[toolIndex].activate(this.toolContainer);
        this.activeToolIndex = toolIndex;
        window.dispatchEvent(new UIEvent('resize')); // changing a tool usually triggers a layout reflow
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

class Tool {
    static displayName = "Nothing";
    constructor() {
                this.element = document.createElement('span');
        this.element.classList.add('flex-row');
    }
        onMouseDown(tm, xy, mod, e) { return true; }
        onMouseUp(tm, xy, mod, e) { return true; }
        onMouseOver(tm, xy, mod, e) { return true; }
        onClick(tm, xy, mod, e) { return true; }
        onDrag(tm, xy, mod, e) { return true; }
        onScroll(tm, xy, mod, e) { return true; }
        onKey(tm, xy, mod, e) { return true; }
        onKeyUp(tm, xy, mod, e) { return true; }
        activate(container) {
        container.appendChild(this.element);
    }
        deactivate() {
        this.element.remove();
    }
}

class DragTool extends Tool {
    static displayName = "Drag";
        constructor(zoomFactor = 1.01) {
        super();
        this.zoomFactor = zoomFactor;
    }
    onDrag(tm, xy, mod) {
        tm.panBy(xy);
    }
    onScroll(tm, xy, mod) {
        if (mod & K_SHIFT) tm.panBy(vScale(xy, -1));
        else tm.zoomBy(this.zoomFactor ** (-xy.y), tm.lastxy);
    }
}

class WorldEditTool extends Tool {
        constructor(world) {
        super();
        this.world = world;
    }
        toCellCoords(tm, xy) {
        return vApply(Math.round, vScale(tm.transformMousePoint(xy), 1 / this.world.cellSize));
    }
}

class DrawCellsTool extends WorldEditTool {
    static displayName = "Draw Cells";
    constructor(world) {
        super(world);
        this.element.innerHTML = '<label>Cell State: <input type="number" min="0" step="1" value ="1"></input></label>';
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
    static displayName = "Draw Ants";
        constructor(world, breeder, antsList) {
        super(world);
                this.breeder = breeder;
                this.antsList = antsList;
        this.element.innerHTML = '<label>Breed: <select class="bsel"></select></label> <label>State: <input type="number" min="0" step="1" value="1"></input></label> <label>Direction: <select class="dirsel"><option value="0">North</option><option value="1" selected>East</option><option value="2">South</option><option value="3">West</option></select></label>';
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
        };
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
        var i = this.antsList.findIndex(ant => ant.x === c.x && ant.y === c.y);
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
