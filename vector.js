function vectorDistance(p1, p2) {
    var d = vMinus(p1, p2);
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