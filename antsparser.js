/**
 * Gets the attribute off the element.
 * @param {HTMLElement} node The element to be checked.
 * @param {string} attr Name of the attribute required.
 * @param {string} [fallback] Default value
 * @param {boolean} [required=true] Whether the attribute is required.
 * @returns {string|null}
 */
function checkattr(node, attr, fallback = undefined, required = true) {
    if (required && (!node.hasAttribute(attr) || node.getAttribute(attr) === '')) throw `Need attribute ${attr} on <${node.nodeName.toLowerCase()}>`;
    return node.getAttribute(attr) ?? fallback;
}

/**
 * Gets the attribute off the element which must be an integer.
 * @param {HTMLElement} node The node to be checked.
 * @param {string} attr Name of the element.
 * @param {number} fallback Default value if not provided
 * @param {boolean} required Whether the attribute is required.
 * @returns {number}
 */
function checkint(node, attr, fallback = null, required = true) {
    var x = checkattr(node, attr, fallback, required);
    var xn = parseInt(x);
    if (isNaN(x)) throw `Attribute ${attr} on <${node.nodeName.toLowerCase()}> is not an integer: ${x}`;
    return xn ?? fallback;
}

/**
 * Parses the world and creates the ants.
 * @param {string} text Raw unparsed XML.
 * @param {object<string, Function>} antSpecies The breeds of ants available.
 * @param {world} world The world to load the ants into.
 * @param {Breeder} breeder The breeder to register the breeds onto.
 * @param {Ant[]} ants The list of ants.
 * @returns {object} The header metadata.
 */
function loadWorld(text, antSpecies, world, breeder, ants) {
    var xml = (new DOMParser()).parseFromString(text, 'application/xml');
    for (var err of xml.querySelectorAll('parsererror div')) {
        throw err.textContent;
    }
    console.log(xml);
    var header = {};
    for (var c of xml.querySelectorAll('config')) {
        var nn = checkattr(c, 'name'), m;
        if ((m = /^color(\d+)/.exec(nn))) {
            console.log('State color', +m[1], c.textContent);
            world.stateColors[m[1]] = c.textContent;
        } else if (nn == 'color_seed' && 'seedrandom' in Math) {
            console.log('Got random seed', c.textContent);
            world.rng = new Math.seedrandom(c.textContent);
        } else {
            header[nn] = c.textContent;
        }
    }
    console.log('Parsed header:', header);
    breeder.empty();
    var foundAntBreeds = 0;
    for (var b of xml.querySelectorAll('breed')) {
        var species = checkattr(b, 'species');
        var name = checkattr(b, 'name');
        if (!(species in antSpecies)) throw `Unknown ant species: ${species}`;
        foundAntBreeds++;
        console.log('Got breed', b);
        breeder.addBreed(name, antSpecies[species], b);
    }
    if (foundAntBreeds === 0) throw 'There are no ant breeds.';
    ants.length = 0; // Quick clear array hack
    for (var a of xml.querySelectorAll('ant')) {
        var breed = checkattr(a, 'breed');
        var id = checkattr(a, 'id', undefined, false);
        var dir = checkint(a, 'dir');
        var state = checkint(a, 'state', 1, false);
        var x = checkint(a, 'x');
        var y = checkint(a, 'y');
        var ant = breeder.createAnt(breed, world, x, y, dir, state, ants, id);
        console.log('Got ant', a, ant);
        ants.push(ant);
    }
    if (ants.length === 0) throw 'No ants.';
    world.clear();
    for (var rle of xml.querySelectorAll('rle')) {
        var r = rle.textContent;
        var cx = checkint(rle, 'x', 0, false);
        var cy = checkint(rle, 'y', 0, false);
        world.paste(r, cx, cy);
    }
    return header;
}
