function save() {
    try {
        showStatus('Saving...');
        dump();
        localStorage.setItem('save', textbox.getValue());
        showStatus('Saved to localStorage.', 'green');
    } catch (e) {
        showStatus('Error saving to localStorage', 'red');
    }
}

function share() {
    if (location.protocol.startsWith('file')) {
        showStatus('You must use the Web version to be able to share.', 'red');
        return;
    }
    dump();
    var text = textbox.getValue();
    navigator.share({ url: window.location, text, title: 'Langton\'s Ant Music' })
        .catch(() => showStatus('Error sharing', 'red'))
        .then(() => showStatus('Shared.'));
}

function copy(bbcode) {
    if (location.protocol.startsWith('file')) {
        showStatus('You must use the Web version to be able to copy.', 'red');
        return;
    }
    dump();
    var text = textbox.getValue();
    if (bbcode) text = '[code]\n' + text + '\n[/code]\n';
    navigator.clipboard.writeText(text)
        .catch(() => showStatus('Error copying', 'red'))
        .then(() => showStatus('Copied.'));
}