class Dialog extends XEventEmitter {
        constructor(elem, closeButtonMessage = "close") {
        super();
        if (!elem) {
            elem = document.createElement("dialog");
            elem.classList.add("big");
            document.body.append(elem);
        }
                this.elem = elem;
        this.elem.addEventListener("close", () => this.emit("close", this.elem.returnValue));
        this.elem.addEventListener("keydown", e => { if (e.key == "Escape") e.preventDefault(); });
        // move elements to span
                this.inside = document.createElement("div");
        if (this.elem.childNodes.length > 0 && ![].some.call(this.elem.childNodes, e => ["#comment", "#text"].indexOf(e.nodeName) == -1)) {
            // Only a text/comment node!
            if ('marked' in window) {
                try {
                    this.inside.innerHTML = marked.parse(dedent(this.elem.textContent));
                } catch (e) {
                    this.inside.innerHTML = `<pre style="color: red">Markdown Parse Error:\n${e.stack}</pre>${content}`;
                }
            }
            this.elem.childNodes.forEach(e => e.remove());
        } else {
            this.inside.append(...this.elem.childNodes);
        }
        this.elem.append(this.inside);
        if (closeButtonMessage) {
            var form = document.createElement("form");
            form.method = "dialog";
            var button = document.createElement("input");
            button.type = "submit";
            button.value = closeButtonMessage;
            form.append(button);
            this.elem.append(form);
        }
    }
    show() {
        if (!this.open) {
            this.elem.inert = true;
            this.elem.showModal();
            this.elem.inert = false;
        }
    }
    close() {
        if (this.open) this.elem.close();
    }
        setContent(content, parseMD = true) {
        if (typeof content == "string") {
            if (parseMD && 'marked' in window) {
                try {
                    content = marked.parse(dedent(content));
                } catch (e) {
                    content = `<pre style="color: red">Markdown Parse Error:\n${e.stack}</pre>${content}`;
                }
            }
            this.inside.innerHTML = content;
        }
        else {
            this.inside.innerHTML = "";
            this.inside.append(content);
        }
    }
        get open() {
        return this.elem.open;
    }
}
