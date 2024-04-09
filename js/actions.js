function savelocal() {
    try {
        showStatus('Saving...');
        actions.trigger('dump');
        localStorage.setItem('save', textbox.getValue());
        showStatus('Saved to localStorage.', 'green');
    } catch (e) {
        showStatus('Error saving to localStorage: ' + e, 'red');
    }
}

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
        actions.trigger('dump');
        var text = textbox.getValue();
        navigator.share({ url: window.location, text, title: 'Langton\'s Ant Music' })
            .catch(e => showStatus('Error sharing: ' + e, 'red'))
            .then(() => showStatus('Shared.'));
    } catch (e) {
        showStatus('Error: ' + e);
    }
}

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
        actions.trigger('dump');
        var text = textbox.getValue();
        if (bbcode) text = '[code]\n' + text + '\n[/code]\n';
        navigator.clipboard.writeText(text)
            .catch(e => showStatus('Error copying: ' + e, 'red'))
            .then(() => showStatus('Copied.'));
    } catch (e) {
        showStatus('Error: ' + e);
    }
}

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
                actions.trigger('load', clip);
                showStatus('Loaded clipboard.', 'green');
            })
            .catch(e => {
                showStatus('Error: ' + e, 'red');
            });
    } catch (e) {
        showStatus('Error: ' + e);
    }
}

function savescreenshot() {
    var a = document.createElement('a');
    a.setAttribute('href', playfield.toDataURL());
    a.setAttribute('download', 'langton.png');
    a.dispatchEvent(new MouseEvent('click'));
}
