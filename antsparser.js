function checkattr(node, attr, tag, fallback = null, required = true) {
    if (required && (!node.hasAttribute(attr) || node.getAttribute(attr) === '')) throw `Need attribute ${attr} on <${tag}>`;
    return node.getAttribute(attr) ?? fallback;
}

function checkint(node, attr, tag, fallback = null, required = true) {
    var x = checkattr(node, attr, tag, fallback, required);
    var xn = parseInt(x);
    if (isNaN(x)) throw `Attribute ${attr} on <${tag}> is not an integer: ${x}`;
    return xn ?? fallback;
}

function loadWorld(text, antSpecies, world, breeder) {
    var xml = (new DOMParser()).parseFromString(text, 'application/xml');
    for (var err of xml.querySelectorAll('parsererror div')) {
        throw err.textContent;
    }
    console.log(xml);
    var header = {};
    for (var c of xml.querySelectorAll('config')) {
        header[checkattr(c, 'name', 'config')] = c.textContent;
    }
    console.log('Parsed header:', header);
    breeder.empty();
    var foundAntBreeds = 0;
    for (var b of xml.querySelectorAll('breed')) {
        var species = checkattr(b, 'species', 'breed');
        var name = checkattr(b, 'name', 'breed');
        if (!(species in antSpecies)) throw `Unknown ant species: ${species}`;
        foundAntBreeds++;
        console.log('Got breed', b);
        breeder.addBreed(name, antSpecies[species], b);
    }
    if (foundAntBreeds === 0) throw 'There are no ant breeds.';
    var ants = [];
    for (var a of xml.querySelectorAll('ant')) {
        var breed = checkattr(a, 'breed', 'ant');
        var id = checkattr(a, 'id', 'ant', undefined, false);
        var dir = checkint(a, 'dir', 'ant');
        var state = checkint(a, 'state', 'ant', 1, false);
        var x = checkint(a, 'x', 'ant');
        var y = checkint(a, 'y', 'ant');
        var ant = breeder.createAnt(breed, world, x, y, dir, state, ants, id);
        console.log('Got ant', a, ant);
        ants.push(ant);
    }
    if (ants.length === 0) throw 'No ants.';
    world.clear();
    for (var rle of xml.querySelectorAll('rle')) {
        var r = rle.textContent;
        var cx = checkint(rle, 'x', 'rle', 0, false);
        var cy = checkint(rle, 'y', 'rle', 0, false);
        world.paste(r, cx, cy);
    }
    return { header, ants };
}
