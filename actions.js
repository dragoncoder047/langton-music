/**
 * Save the world state to `localStorage`.
 */
function savelocal() {
    try {
        showStatus('Saving...');
        dump();
        localStorage.setItem('save', textbox.getValue());
        showStatus('Saved to localStorage.', 'green');
    } catch (e) {
        showStatus('Error saving to localStorage: ' + e, 'red');
    }
}

/**
 * Shares the world content useing `navigator.share`.
 */
function share() {
    if (location.protocol.startsWith('file')) {
        showStatus('You must use the Web version to be able to share.', 'red');
        return;
    }
    if (typeof navigator.share !== 'function') {
        showStatus('Sorry, your browser doesn\'t support the Share API. Open the editor and copy/paste.', 'red');
        return;
    }
    try {
        dump();
        var text = textbox.getValue();
        navigator.share({ url: window.location, text, title: 'Langton\'s Ant Music' })
            .catch(e => showStatus('Error sharing: ' + e, 'red'))
            .then(() => showStatus('Shared.'));
    } catch (e) {
        showStatus('Error: ' + e);
    }
}

/**
 * Copies the world content to the clipboard.
 * @param {boolean} bbcode Whether the XML should be wrapped in `[code][/code]` tags.
 */
function copy(bbcode) {
    if (location.protocol.startsWith('file')) {
        showStatus('You must use the Web version to be able to copy.', 'red');
        return;
    }
    if (!('clipboard' in navigator) || typeof navigator.clipboard.writeText !== 'function') {
        showStatus('Sorry, your browser doesn\'t support the Clipboard API. Open the editor and copy it from there.', 'red');
        return;
    }
    try {
        dump();
        var text = textbox.getValue();
        if (bbcode) text = '[code]\n' + text + '\n[/code]\n';
        navigator.clipboard.writeText(text)
            .catch(e => showStatus('Error copying: ' + e, 'red'))
            .then(() => showStatus('Copied.'));
    } catch (e) {
        showStatus('Error: ' + e);
    }
}

/**
 * Reads the contents of the user's clipboard and lods it.
 */
function openclip() {
    if (location.protocol.startsWith('file')) {
        showStatus('You must use the Web version to be able to open from clipboard.', 'red');
        return;
    }
    if (!('clipboard' in navigator) || typeof navigator.clipboard.readText !== 'function') {
        showStatus('Sorry, your browser doesn\'t support the Clipboard API. Open the editor, paste, and click LOAD.', 'red');
        return;
    }
    try {
        navigator.clipboard.readText()
            .then(clip => {
                textbox.setValue(clip);
                load();
                showStatus('Loaded clipboard.', 'green');
            })
            .catch(e => {
                showStatus('Error: ' + e, 'red');
            });
    } catch (e) {
        showStatus('Error: ' + e);
    }
}

/**
 * Takes a screenshot of the canvas and downloads it.
 */
function savescreenshot() {
    var a = document.createElement('a');
    a.setAttribute('href', playfield.toDataURL());
    a.setAttribute('download', 'langton.png');
    a.dispatchEvent(new MouseEvent('click'));
}