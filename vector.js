function vectorDistance(p1, p2) {
    var d = vectorDifference(p1, p2);
    return Math.sqrt((d.x * d.x) + (d.y * d.y));
}

function vectorDifference(p1, p2) {
    return { x: p1.x - p2.x, y: p1.y - p2.y };
}

function vectorSum(p1, p2) {
    return { x: p1.x + p2.x, y: p1.y + p2.y };
}

function vectorScale(p1, k) {
    return { x: p1.x * k, y: p1.y * k };
}