function vApply(fun, ...vectors) {
    return { x: fun(...vectors.map(v => v.x)), y: fun(...vectors.map(v => v.y)) };
}

function vRelMag(p1, p2) {
    return vMagnitude(vMinus(p1, p2));
}

function vMagnitude(d) {
    return Math.sqrt((d.x * d.x) + (d.y * d.y));
}

function vMinus(p1, p2) {
    return { x: p1.x - p2.x, y: p1.y - p2.y };
}

function vPlus(p1, p2) {
    return { x: p1.x + p2.x, y: p1.y + p2.y };
}

function vScale(p1, k) {
    return { x: p1.x * k, y: p1.y * k };
}