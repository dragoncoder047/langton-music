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
        showStatus('You must use the Web version to share.', 'red');
        return;
    }
    try {
        dump();
        var text = textbox.getValue();
        navigator.share({
            url: window.location,
            text,
            title: 'Langton\'s Ant Music',
        }).catch(() => showStatus('Error sharing', 'red'));
    } catch (e) {
        showStatus('Error sharing', 'red');
    }
}