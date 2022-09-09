/**
 * @typedef {Object} Vector
 * @property {number} x
 * @property {number} y
 */

/**
 * Applies the function to the vector's x- and y-coordinates.
 * @param {Function} fun
 * @param {Vector[]} vectors
 */
function vApply(fun, ...vectors) {
    return { x: fun(...vectors.map(v => v.x)), y: fun(...vectors.map(v => v.y)) };
}

/**
 * Distance between two points.
 * @param {Vector} p1 
 * @param {Vector} p2 
 * @returns {number}
 */
function vRelMag(p1, p2) {
    return vMagnitude(vMinus(p1, p2));
}

/**
 * Length of the vector.
 * @param {Vector} d 
 * @returns {number}
 */
function vMagnitude(d) {
    return Math.sqrt((d.x * d.x) + (d.y * d.y));
}

/**
 * p1-p2
 * @param {Vector} p1 
 * @param {Vector} p2 
 * @returns {Vector}
 */
function vMinus(p1, p2) {
    return { x: p1.x - p2.x, y: p1.y - p2.y };
}

/**
* p1+p2
* @param {Vector} p1 
* @param {Vector} p2 
* @returns {Vector}
*/
function vPlus(p1, p2) {
    return { x: p1.x + p2.x, y: p1.y + p2.y };
}

/**
* p1*k
* @param {Vector} p1 
* @param {number} k 
* @returns {Vector}
*/
function vScale(p1, k) {
    return { x: p1.x * k, y: p1.y * k };
}

/**
 * Clone a vector
 * @param {Vector} p1
 * @returns {Vector}
 */
function vClone(p1) {
    return { x: p1.x, y: p1.y };
}