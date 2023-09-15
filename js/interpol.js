/**
 * Processes all the interpolations.
 * @param {string} expr 
 * @returns {string}
 */
function processExpressions(expr) {
    // find expressions
    while (true) {
        expr = expr.trim();
        var match = /\$\{(.+?)\}/.exec(expr);
        if (!match) break;
        expr = expr.replaceAll(match[0], evalExpression(match[1]));
    }
    return expr;
}

/**
 * @param {string} string
 * @param {string[]} delimiters
 * @param {string[]} singletons
 * @param {string} openers
 * @param {string} closers
 * @param {boolean} includeDelimiters
 * @param {boolean} splitAtParens
 */
function* level1ParseExpression(string, delimiters, singletons=[], openers="[{(\"'", closers="]})\"'", includeDelimiters=false, splitAtParens=true) {
    var currentString = "";
    var stack = [];
    var otc = openers.reduce((obj, key, index) => ({ ...obj, [key]: closers[index] }), {});
    delimiters = delimiters.sort((a, b) => a.length - b.length);
    singletons = singletons.sort((a, b) => a.length - b.length);
    while (string) {
        var c = string[0];
        if (openers.includes(c)) {
            if (stack.length > 0 && otc[c] === stack[stack.length-1] && otc[c] === c) {
                stack.pop();
                if (splitAtParens) {
                    yield currentString + c;
                    currentString = "";
                    string = string.slice(1);
                    continue;
                } else {
                    if (splitAtParens && stack.length == 0 && currentString.length > 0) {
                        yield currentString;
                        currentString = "";
                    }
                    stack.push(c);
                }
            }
        }
        else if (closers.includes(c)) {
            if (stack.length == 0) throw "unopened " + c;
            var b = otc[stack.pop()];
            if (b !== c) throw "paren mismatch " + b + c;
            if (splitAtParens && stack.length == 0 && currentString.length > 0) {
                yield currentString + c;
                currentString = c = "";
            }
        }
        var atSplit = false;
        if (stack.length == 0) {
            for (var d of delimiters) {
                if (string.startsWith(d)) {
                    if (currentString) yield currentString;
                    if (includeDelimiters) yield d;
                    currentString = "";
                    string = string.slice(d.length);
                    atSplit = true;
                    break;
                }
            }
        }
        if (!atSplit) {
            if (stack.length > 0) {
                for (var s of singletons) {
                    if (string.startsWith(s)) {
                        yield currentString;
                        yield s;
                        currentString = "";
                        string = string.slice(s.length);
                    }
                }
            } else {
                currentString += c;
                string = string.slice(1);
            }
        }
    }
    if (stack.length > 0) throw "unclosed " + stack.pop();
    yield currentString;
}

var temp;
/**
 * @type {Object<string, (left: any, right: any, vars: Object) => any[]>[]}
 */
const operators = [
    {
        $: (left, right, vars) => [left, vars[right]],
    },
    {
        ["."]: (left, right) => [left[right]],
    },
    {
        ["!"]: (temp = (left, right) => [left, !right]),
        not: temp,
        ["@"]: (left, right) => [left].concat(right),
        ["#"]: (left, right) => [left, right.length],
    },
    {
        // TODO more
    }
];
delete temp;

/**
 * Evaluates the expression.
 * @param {string} expr The stripped expression.
 * @returns {string|number}
 */
function evalExpression(expr) {
    var s = [];
    while (expr) {
        var match = /^(\d+|`(.+?)`|.)/.exec(expr);
        var token = match[0];
        expr = expr.slice(token.length);
        if (/\d+/.test(token)) {
            s.push(parseInt(token));
        }
        else if (match[2]) {
            s.push(match[2]);
        }
        else if (/[\s']/.test(token)); // spaces and ' are noop
        else {
            var a = s.pop();
            var b = s.pop();
            switch (token) {
                case '\\':
                    s.push(a, b);
                    break;
                case '$':
                    s.push(b);
                    break;
                case ':':
                    s.push(b, a, a);
                    break;
                case '?':
                    s.push(b, Math.floor(Math.random() * a));
                    break;
                case '%':
                    s.push(b % a);
                    break;
                case '^':
                    s.push(b ^ a);
                    break;
                case '&':
                    s.push(b & a);
                    break;
                case '*':
                    s.push(b * a);
                    break;
                case '-':
                    s.push(b - a);
                    break;
                case '+':
                    s.push(b + a);
                    break;
                case '/':
                    s.push(b / a);
                    break;
                case '|':
                    s.push(b | a);
                    break;
                case '~':
                    s.push(b, -a);
                    break;
                case '<':
                    s.push(b < a);
                    break;
                case '>':
                    s.push(b > a);
                    break;
                case '=':
                    s.push(b === a);
                    break;
                case '@':
                    var c = s.pop();
                    s.push(a ? b : c);
                    break;
                default:
                    throw `unknown expression command ${token} starting at ${token}${expr}`;
            }
        }
    }
    return s[s.length - 1];
}
