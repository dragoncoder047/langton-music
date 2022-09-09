function save() {
    try {
        showStatus('Saving...');
        dump();
        localStorage.setItem('save', textbox.getValue());
        showStatus('Saved to localStorage.', 'green');
    } catch (e) {
        showStatus('Error saving to localStorage.', 'red');
    }
}

function share() {
    if (location.protocol.startsWith('file')) {
        showStatus('You must use the Web version to be able to share.', 'red');
        return;
    }
    if (typeof navigator.share !== 'function') {
        showStatus('Your browser doesn\'t support dynamic sharing. Open the editor and copy/paste.', 'red');
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

function copy(bbcode) {
    if (location.protocol.startsWith('file')) {
        showStatus('You must use the Web version to be able to copy.', 'red');
        return;
    }
    if (!('clipboard' in navigator) || typeof navigator.clipboard.writeText !== 'function') {
        showStatus('Your browser doesn\'t support dynamic copying. Open the editor and copy it.', 'red');
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