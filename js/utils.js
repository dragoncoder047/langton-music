
function clamp(x, a, b) {
    if (x < a) return a;
    if (x > b) return b;
    return x;
}
function map(x, a, b, c, d, k = true) {
    if (k) x = clamp(x, a, b);
    return (x - a) * (d - c) / (b - a) + c;
}

function irange(start, stop, step) {
        var out = [];
    for (var x = start; x <= stop; x += step) out.push(x);
    return x;
}

function camel2words(camel) {
    var words = [...camel.matchAll(/(?:^|_*)([A-Z]?[a-z]+)/g)].map(x => x[1]);
    var first = words[0];
    first = first[0].toUpperCase() + first.slice(1).toLowerCase();
    var rest = words.slice(1).map(x => x.toLowerCase());
    return [first].concat(rest).join(" ");
}

function dedent(strs, vals) {
	var strings = strs.raw ? strs.raw : [strs];
	var indented = "";
	for (var i = 0; i < strings.length; i++) {
		indented += strings[i];
		if (vals && i < vals.length) indented += vals[i].toString();
	}
	var lines = indented.split("\n");
	var min = Infinity;
	for (var line of lines) {
		var m = line.match(/^(\s+)\S+/);
		if (m) min = Math.min(min, m[1].length);
	}
	var result = indented;
	if (min !== Infinity) {
		result = lines.map(l => /\s/.test(l[0]) ? l.slice(min) : l).join("\n");
	}
	return result.trim().replace(/\\n/g, "\n");
}

function todo(foo = "") {
    throw new Error("todo: " + foo);
}
