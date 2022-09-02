function loadWorld(text, antSpecies, world, breeder) {
    throw 'todo';
    text = text.replaceAll(/%%.*?$/gm, '');
    var header = {};
    while (true) {
        text = text.trim();
        match = /^([a-z]+?)\s*:\s*(.+?)(?:;|(?=\[))/ims.exec(text); //jshint ignore:line
        if (!match) break;
        text = text.slice(match[0].length);
        var key = match[1].trim(), value = match[2].trim();
        console.log('header entry: ', key, value);
        header[key] = value;
    }
    breeder.empty();
    var foundAntBreeds = 0;
    var match, i;
    while (true) {
        text = text.trim();
        match = /^\[([a-z]+)\s+([a-z]+)\s+(.+?)\]/ims.exec(text); //jshint ignore:line
        if (!match) break;
        text = text.slice(match[0].length);
        var species = match[1], breed = match[2], commands = match[3];
        console.log('ant breed: ', species, breed);
        if (!(species in antSpecies)) throw `Unknown ant species: ${species}`;
        foundAntBreeds++;
        var commandsParsed = {};
        while (true) {
            commands = commands.trim();
            match = /^\{(\S+)\s*=>\s*(.+?)\}/sm.exec(commands); //jshint ignore:line
            if (!match) break;
            commands = commands.slice(match[0].length);
            var statedesc = match[1], actions = match[2];
            console.log('state tab: ', statedesc, actions);
            commandsParsed[statedesc] = actions;
        }
        if (commands.trim()) throw `Rule parsing failed on: ${commands}`;
        breeder.addBreed(breed, antSpecies[species], commandsParsed);
        console.log(commandsParsed);
    }
    if (foundAntBreeds === 0) throw 'There are no ant breeds.';
    text = text.trim().replaceAll(/\s+/g, '');
    var x = 0, y = 0, ants = [];
    world.clear();
    console.log('rest of text: ', text);
    while (true) {
        text = text.trim();
        match = /^(\d*)([p-y]?[A-X]|[$.])(\[(.+?)\])*/.exec(text);
        if (!match) break;
        text = text.slice(match[0].length);
        console.log('RLE ', match[0]);
        var count = parseInt(match[1] || 1), cellState = match[2], antsString = match[3];
        console.log(antsString);
        if (antsString && cellState === '$') throw "RLE error: Can't put ants after $";
        if (cellState === '$') {
            x = 0;
            y += count;
        } else {
            cellState = lettersToStateNum(cellState);
            console.log('lettersToStateNum() returned', cellState);
            for (i = 0; i < count; i++, x++) world.setCell(x, y, cellState);
        }
        if (antsString) {
            while (true) {
                match = /\[(.+?):(\d+)(?::(\d+))?\]/.exec(antsString);
                if (!match) break;
                antsString = antsString.slice(match[0].length);
                var antBreed = match[1], antDir = match[2], antState = match[3];
                if (/^[0-3]$/.test(antDir)) antDir = parseInt(antDir);
                else throw `RLE error: Bad ant direction ${antDir}`;
                if (/^\d+$/.test(antState)) antState = parseInt(antState);
                else throw `RLE error: Bad ant state ${antState}`;
                ants.push(breeder.createAnt(antBreed, world, x - 1, y, antDir, antState, ants));
            }
        }
    }
    return { ants, header };
}

function lettersToStateNum(letters) {
    if (letters.length == 1) return '.ABCDEFGHIJKLMNOPQRSTUVWX'.indexOf(letters);
    return lettersToStateNum(letters.slice(1)) + (24 * ('pqrstuvwx'.indexOf(letters[0]) + 1));
}

function stateNumToLetters(state) {
    if (state === undefined) return '';
    if (state == 0) return '.';
    var out = '';
    if (state > 24) {
        var hi = (state - 25) / 24;
        out += 'pqrstuvwxy'[hi];
        state -= (hi + 1) * 24;
    }
    return 'ABCDEFGHIJKLMNOPQRSTUVWX'[state - 1] + out;
}
