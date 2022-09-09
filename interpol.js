/**
 * Processes all the interpolations.
 * @param {string} expr 
 * @returns {string}
 */
function processExpressions(expr) {
    // find expressions
    while (true) {
        expr = expr.trim();
        var match = /#(.+?);/.exec(expr);
        if (!match) break;
        expr = expr.replaceAll(match[0], evalExpression(match[1]));
    }
    return expr;
}

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
