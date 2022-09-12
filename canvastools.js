/**
 * Finds the mouse position from the event on the canvas.
 * @param {HTMLCanvasElement} canvas The canvas
 * @param {MouseEvent|TouchEvent} evt The mouse event to get the coordinates on.
 * @returns {Vector}
 */
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

/**
 * Manager for tools to interact with the canvas.
 */
class CanvasToolsManager {
    /**
     * @param {HTMLCanvasElement} canvas Canvas to control.
     * @param {HTMLSelectElement} toolSelector Dropdown to add tools select options to.
     * @param {HTMLElement} toolContainer Container element to add the tools' control panels to.
     * @param {Tool[]} [tools] List of tools to choose between. The first is the default tool.
     */
    constructor(canvas, toolSelector, toolContainer, tools = []) {
        /**
         * @type {HTMLCanvasElement}
         */
        this.canvas = canvas;
        /**
         * @type {HTMLElement}
         */
        this.toolContainer = toolContainer;
        /**
         * @type {HTMLSelectElement}
         */
        this.toolSelector = toolSelector;
        /**
         * @type {CanvasRenderingContext2D}
         */
        this.ctx = canvas.getContext('2d');
        /**
         * @type {boolean}
         */
        this.mouseDown = false;
        /**
         * @type {number}
         */
        this.timeDown = 0;
        /**
         * @type {Vector}
         */
        this.panxy = { x: 0, y: 0 };
        /**
         * @type {Vector}
         */
        this.downxy = { x: 0, y: 0 };
        /**
         * @type {Vector}
         */
        this.lastxy = { x: 0, y: 0 };
        /**
         * @type {number}
         */
        this.zoom = 1;
        /**
         * @type {boolean}
         */
        this.enabled = true;
        /**
         * @type {Tool[]}
         */
        this.tools = tools;
        /**
         * @type {number}
         */
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
    /**
     * Saves the current canvas state and translates by x and y and zooms.
     */
    enter() {
        this.ctx.save();
        this.ctx.setTransform(this.zoom, 0, 0, this.zoom, this.panxy.x, this.panxy.y);
    }
    /**
     * Converse of `enter()` it restores the old canvas state.
     */
    exit() {
        this.ctx.restore();
    }
    /**
     * Draws the function within an `enter()` / `exit()` pair.
     * @param {Function} fun Draw function
     */
    drawTransformed(fun) {
        this.enter();
        fun();
        this.exit();
    }
    /**
     * Erases the canvas.
     */
    clear() {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
    }
    /**
     * Fires the event to the active tool, and if the tool didn't (or couldn't) handle it, defaults to tool #0.
     * @param {Event} e event
     * @param {string} name Function name
     * @param {Vector} point The detail point for the event.
     */
    event(e, name, point) {
        if (!this.enabled) return;
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
    /**
     * Applies the current transformation to the point to yield the real X/Y.
     * @param {Vector} pt Raw point
     * @returns {Vector} Trasformed point
     */
    transformMousePoint(pt) {
        return { x: (pt.x - this.panxy.x) / this.zoom, y: (pt.y - this.panxy.y) / this.zoom };
    }
    /**
     * Switches the currently active tool.
     * @param {number} toolIndex The index of the tool.
     */
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
/**
 * Turns the event into a bit field that stores mouse buttons and modifier keys (alt, ctrl, etc.)
 * @param {UIEvent} e
 * @returns {number}
 */
function makeModifiers(e) {
    var out = e.buttons || 0;
    if (e.altKey) out |= K_ALT;
    if (e.ctrlKey) out |= K_CTRL;
    if (e.metaKey) out |= K_META;
    if (e.shiftKey) out |= K_SHIFT;
    return out;
}

/**
 * Base class for a tool.
 */
class Tool {
    constructor() {
        /**
         * @type {HTMLElement}
         */
        this.element = document.createElement('span');
        this.element.classList.add('flex-row');
    }
    /**
     * Handle mouse down events.
     * @abstract
     * @param {CanvasToolsManager} tm 
     * @param {Vector} xy 
     * @param {number} mod 
     * @param {MouseEvent} e 
     */
    onMouseDown(tm, xy, mod, e) { return true; }
    /**
     * Handle mouse up events.
     * @abstract
     * @param {CanvasToolsManager} tm 
     * @param {Vector} xy 
     * @param {number} mod 
     * @param {MouseEvent} e 
     */
    onMouseUp(tm, xy, mod, e) { return true; }
    /**
     * Handle mouse move events when not clicking.
     * @abstract
     * @param {CanvasToolsManager} tm 
     * @param {Vector} xy 
     * @param {number} mod 
     * @param {MouseEvent} e 
     */
    onMouseOver(tm, xy, mod, e) { return true; }
    /**
     * Handle mouse click.
     * @abstract
     * @param {CanvasToolsManager} tm 
     * @param {Vector} xy 
     * @param {number} mod 
     * @param {MouseEvent} e 
     */
    onClick(tm, xy, mod, e) { return true; }
    /**
     * Handle mouse drag events.
     * @abstract
     * @param {CanvasToolsManager} tm 
     * @param {Vector} xy 
     * @param {number} mod 
     * @param {MouseEvent} e 
     */
    onDrag(tm, xy, mod, e) { return true; }
    /**
     * Handle mouse scroll events.
     * @abstract
     * @param {CanvasToolsManager} tm 
     * @param {Vector} xy 
     * @param {number} mod 
     * @param {WheelEvent} e 
     */
    onScroll(tm, xy, mod, e) { return true; }
    /**
     * Handle keypress events.
     * @abstract
     * @param {CanvasToolsManager} tm 
     * @param {Vector} xy 
     * @param {number} mod 
     * @param {KeyboardEvent} e 
     */
    onKey(tm, xy, mod, e) { return true; }
    /**
     * Handle key release events.
     * @abstract
     * @param {CanvasToolsManager} tm 
     * @param {Vector} xy 
     * @param {number} mod 
     * @param {KeyboardEvent} e 
     */
    onKeyUp(tm, xy, mod, e) { return true; }
    /**
     * Callback to set up this tool's functionality when it is selected.
     * @param {HTMLElement} container The container to append to.
     */
    activate(container) {
        container.appendChild(this.element);
    }
    /**
     * Callback to clean this tool's functionality when it is deselected.
     */
    deactivate() {
        this.element.remove();
    }
}
Tool.displayName = 'Nothing';

/**
 * Drag, pan, nd zoom tool.
 */
class DragTool extends Tool {
    /**
     * @param {number} zoomFactor Factor to change zoom by when scrolling.
     */
    constructor(zoomFactor = 1.01) {
        super();
        this.zoomFactor = zoomFactor;
    }
    onDrag(tm, xy, mod) {
        tm.panxy = vPlus(tm.panxy, xy);
    }
    onScroll(tm, xy, mod) {
        if (mod & K_SHIFT) {
            tm.panxy = vMinus(tm.panxy, xy);
        }
        else {
            var factor = this.zoomFactor ** (-xy.y);
            tm.zoom *= factor;
            tm.panxy = vPlus(vMinus(vScale(tm.panxy, factor), vScale(tm.lastxy, factor)), tm.lastxy);
        }
    }
}
DragTool.displayName = 'Drag';

/**
 * Base class for tools that edit the world.
 */
class WorldEditTool extends Tool {
    /**
     * @param {World} world 
     */
    constructor(world) {
        super();
        this.world = world;
    }
    /**
     * Turns the vector into cell coordinates.
     * @param {CanvasToolsManager} tm 
     * @param {Vector} xy 
     * @returns {Vector}
     */
    toCellCoords(tm, xy) {
        return vApply(Math.round, vScale(tm.transformMousePoint(xy), 1 / this.world.cellSize));
    }
}

/**
 * Tool to draw cells into the world.
 */
class DrawCellsTool extends WorldEditTool {
    constructor(world) {
        super(world);
        this.element.innerHTML = '<label>Cell State: <input type="number" min="0" step="1" value ="1"></input></label>';
        /**
         * @type {HTMLInputElement}
         */
        this.input = this.element.querySelector('input');
        /**
         * @type {boolean}
         */
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
DrawCellsTool.displayName = 'Draw Cells';

/**
 * Tool to draw ants into the world.
 */
class DrawAntsTool extends WorldEditTool {
    /**
     * 
     * @param {World} world 
     * @param {Breeder} breeder 
     * @param {Ant[]} antsList 
     */
    constructor(world, breeder, antsList) {
        super(world);
        /**
         * @type {Breeder}
         */
        this.breeder = breeder;
        /**
         * @type {Ant[]}
         */
        this.antsList = antsList;
        this.element.innerHTML = '<label>Breed: <select class="bsel"></select></label> <label>State: <input type="number" min="0" step="1" value="1"></input></label> <label>Direction: <select class="dirsel"><option value="0">North</option><option value="1" selected>East</option><option value="2">South</option><option value="3">West</option></select></label>';
        /**
         * @type {HTMLSelectElement}
         */
        this.breedSelect = this.element.querySelector('.bsel');
        /**
         * @type {HTMLInputElement}
         */
        this.stateSelect = this.element.querySelector('input');
        /**
         * @type {HTMLSelectElement}
         */
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
    /**
     * Mirrors this breeder's breeds to the select element.
     */
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
DrawAntsTool.displayName = 'Draw Ants';
