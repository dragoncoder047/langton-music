class CanvasMove {
    constructor(canvas, scrollUpDown = true) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.mouseDown = false;
        this.x = 0;
        this.y = 0;
        this.lastX = 0;
        this.lastY = 0;
        this.zoom = 1;
        this.zoomFactor = 1.01;
        this.enabled = true;
        this.scrollUpDown = scrollUpDown;
        canvas.addEventListener('mousedown', e => {
            if (!this.enabled) return;
            e.preventDefault();
            this.mouseDown = true;
            this.lastX = e.offsetX;
            this.lastY = e.offsetY;
        });
        canvas.addEventListener('mouseup', e => {
            if (!this.enabled) return;
            e.preventDefault();
            this.mouseDown = false;
        });
        canvas.addEventListener('touchmove', e => {
            if (!this.enabled) return;
            e.preventDefault();
            if (!this.mouseDown) {
                this.mouseDown = true;
            } else {
                this.x += (e.offsetX - this.lastX);
                this.y += (e.offsetY - this.lastY);
            }
            this.lastX = e.offsetX;
            this.lastY = e.offsetY;
        });
        canvas.addEventListener('mousemove', e => {
            if (!this.enabled) return;
            e.preventDefault();
            if (this.mouseDown) {
                this.x += (e.offsetX - this.lastX);
                this.y += (e.offsetY - this.lastY);
            }
            this.lastX = e.offsetX;
            this.lastY = e.offsetY;
        });
        canvas.addEventListener('wheel', e => {
            if (!this.enabled) return;
            e.preventDefault();
            if (!scrollUpDown) {
                var factor = this.zoomFactor ** (-e.deltaY);
                this.zoom *= factor;
                this.x = (this.x * factor) - (factor * this.lastX) + this.lastX;
                this.y = (this.y * factor) - (factor * this.lastY) + this.lastY;
            }
            else this.y -= e.deltaY;
            this.x += e.deltaX;
        });
        var dpr = window.devicePixelRatio || 1;
        var bsr = this.ctx.webkitBackingStorePixelRatio || this.ctx.mozBackingStorePixelRatio || this.ctx.msBackingStorePixelRatio || this.ctx.oBackingStorePixelRatio || this.ctx.backingStorePixelRatio || 1;
        var ratio = dpr / bsr;
        this.ctx.imageSmoothingEnabled = false;
        window.addEventListener('resize', () => {
            var rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width * ratio;
            canvas.height = rect.height * ratio;
            playfield.style.width = `${rect.width}px`;
            playfield.style.height = `${rect.height}px`;
        });
    }
    enter() {
        this.ctx.save();
        this.ctx.translate(this.x, this.y);
        this.ctx.scale(this.zoom, this.zoom);
    }
    exit() {
        this.ctx.restore();
    }
    clear() {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
    }
}