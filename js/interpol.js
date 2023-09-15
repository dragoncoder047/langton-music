/**
 * @param {string} string
 * @param {string[]} delimiters
 * @param {string[]} singletons
 * @param {string} openers
 * @param {string} closers
 * @param {boolean} includeDelimiters
 * @param {boolean} splitAtParens
 */
function* level1ParseExpression(string, delimiters, singletons = [], openers = "[{(\"'", closers = "]})\"'", includeDelimiters = false, splitAtParens = true) {
    var origString = string;
    var currentString = "";
    var stack = [];
    var otc = [].reduce.call(openers, (obj, key, index) => ({ ...obj, [key]: closers[index] }), {});
    delimiters = delimiters.sort((a, b) => b.length - a.length);
    singletons = singletons.sort((a, b) => b.length - a.length);
    var i = 0;
    while (string) {
        var c = string[0];
        console.log(c);
        if (openers.includes(c)) {
            if (stack.length > 0 && otc[c] === stack[stack.length - 1] && otc[c] === c) {
                stack.pop();
                if (splitAtParens) {
                    yield currentString + c;
                    currentString = "";
                    string = string.slice(1);
                    continue;
                }
            } else {
                if (splitAtParens && stack.length == 0 && currentString.length > 0) {
                    yield currentString;
                    currentString = "";
                }
                stack.push(c);
            }
        }
        else if (closers.includes(c)) {
            if (stack.length === 0) throw `unopened ${c}\n${origString}\n${" ".repeat(i)}^`;
            var b = otc[stack.pop()];
            if (b !== c) throw `paren mismatch ${b}${c}\n${origString}\n${" ".repeat(i)}^`;
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
                    i += d.length;
                    atSplit = true;
                    break;
                }
            }
        }
        if (!atSplit) {
            if (stack.length == 0) {
                for (var s of singletons) {
                    if (string.startsWith(s)) {
                        yield currentString;
                        yield s;
                        currentString = "";
                        string = string.slice(s.length);
                        i += s.length;
                    }
                }
            } else {
                currentString += c;
                string = string.slice(1);
                i++;
            }
        }
    }
    if (stack.length > 0) throw "unclosed " + stack.pop();
    yield currentString;
}

/**
 * Processes all the interpolations.
 * @param {string} expr 
 * @returns {string}
 */
function processExpressions(expr) {
    var bits = [...level1ParseExpression(expr, [], [])];
    console.log(bits);
    bits = bits.map(bit => {
        var m = /^\$\((.+)\)$/.exec(bit);
        if (!m) return bit;
        return evalExpression(m[1]);
    });
    return bits.join("");
}

var temp;
/**
 * @type {Object<string, (left: any, right: any, vars: Object) => any[]>[]}
 */
const operators = [
    // Unary
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
    // Math
    {
        ["**"]: (left, right) => [left ** right],
    },
    {
        ["*"]: (left, right) => [typeof left === "string" ? left.repeat(right) : (left * right)],
        ["/"]: (left, right) => [left / right],
        ["%"]: (left, right) => [left % right],
    },
    {
        ["+"]: (left, right) => [left + right],
        ["-"]: (left, right) => [left - right],
    },
    // Bitwise
    {
        ["&"]: (left, right) => [left & right],
        ["|"]: (left, right) => [left | right],
        ["^"]: (left, right) => [left ^ right],
        ["~"]: (left, right) => [left, ~right],
        ["<<"]: (left, right) => [left << right],
        [">>"]: (left, right) => [left >> right],
    },
    // Comparison
    {
        ["<"]: (left, right) => [left < right],
        [">"]: (left, right) => [left < right],
        ["<="]: (left, right) => [left < right],
        [">="]: (left, right) => [left < right],
        ["=="]: (left, right) => [left < right],
        ["!="]: (left, right) => [left < right],
    },
    // Boolean
    {
        ["&&"]: (temp = (left, right) => [left && right]),
        and: temp,
        ["||"]: (temp = (left, right) => [left || right]),
        or: temp,
    },
    // Containment
    {
        in: (left, right) => [Array.isArray(left) || typeof left === "string" ? left.includes(right) : (() => { throw "not a container" })()],
    },
];
delete temp;

/**
 * @param {string} string
 * @returns {any[]}
 */
function evalExpression(string) {
    var ss = string.trim();
    tokens = [...level1ParseExpression(ss, [" "], operators.flatMap(Object.keys))].filter(Boolean);
    for (var i = 0; i < tokens.length; i++) {
        var t = tokens[i];
        if (typeof t !== "string") continue;
        if (t[0] === "(") {
            var val = evalExpression(t.slice(1, t.length - 1));
            tokens.splice(i, 1, val);
        }
        else if ("{'\"".includes(t[0])) {
            tokens[i] = t.slice(1, t.length - 1);
        }
        if (typeof tokens[i] === "string" && !isNaN(+tokens[i])) {
            tokens[i] = parseInt(tokens[i]) || parseFloat(tokens[i]) || 0.;
        }
    }
    var hasOps;
    do {
        hasOps = false;
        tokenLoop:
        for (var precedenceLevel of operators) {
            for (var opName of Object.keys(precedenceLevel)) {
                tokens.unshift(undefined);
                tokens.push(undefined);
                var i = tokens.indexOf(opName);
                if (i !== -1) {
                    var val = precedenceLevel[opName](tokens[i - 1], tokens[i + 1]);
                    tokens.splice(i - 1, 3, ...[].concat(val));
                    hasOps = true;
                    break tokenLoop;
                }
                if (typeof tokens.shift() !== "undefined") throw "postfix at beginning";
                if (typeof tokens.pop() !== "undefined") throw "prefix at end";
            }
        }
    } while (hasOps);
    // must return an array because this function is called recursively
    return tokens;
}
