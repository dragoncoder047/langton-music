/**
 * @param {string} string
 * @param {string[]} delimiters
 * @param {string[]} singletons
 * @param {string} openers
 * @param {string} closers
 * @param {boolean} includeDelimiters
 * @param {boolean} splitAtParens
 */
function* level1ParseExpression(string, delimiters, singletons = [], openers = "[{(\"'", closers = "]})\"'", splitAtParens = true) {
    var origString = string;
    var currentString = "";
    var stack = [];
    var otc = [].reduce.call(openers, (obj, key, index) => ({ ...obj, [key]: closers[index] }), {});
    delimiters = delimiters.sort((a, b) => b.length - a.length);
    singletons = singletons.sort((a, b) => b.length - a.length);
    var i = 0;
    mainloop:
    while (string) {
        for (var o of openers) {
            if (string.startsWith(o)) {
                if (stack.length > 0 && otc[o] === o && otc[o] === stack[stack.length - 1][0]) {
                    stack.pop();
                    if (stack.length == 0) {
                        yield currentString + o;
                        currentString = "";
                    } else currentString += o;
                } else {
                    if (stack.length == 0 && currentString.length > 0) {
                        yield currentString;
                        currentString = o;
                    } else currentString += o;
                    stack.push([o, i]);
                }
                string = string.slice(o.length);
                i += o.length;
                continue mainloop;
            }
        }
        for (var c of closers) {
            if (string.startsWith(c)) {
                if (stack.length === 0) throw `unopened ${c}\n${origString}\n${" ".repeat(i)}^`;
                var b = otc[stack.pop()[0]];
                if (b !== c) throw `paren mismatch ${b} ${c}\n${origString}\n${" ".repeat(i)}^`;
                if (stack.length == 0 && currentString.length > 0) {
                    yield currentString + c;
                    currentString = "";
                } else currentString += c;
                string = string.slice(c.length);
                i += c.length;
                continue mainloop;
            }
        }
        if (stack.length == 0) {
            for (var d of delimiters) {
                if (string.startsWith(d)) {
                    if (currentString) yield currentString;
                    currentString = "";
                    string = string.slice(d.length);
                    i += d.length;
                    continue mainloop;
                }
            }
            for (var s of singletons) {
                if (string.startsWith(s)) {
                    yield currentString;
                    yield s;
                    currentString = "";
                    string = string.slice(s.length);
                    i += s.length;
                    continue mainloop;
                }
            }
        }
        currentString += string[0];
        string = string.slice(1);
        i++;
    }
    if (stack.length > 0) throw `unclosed ${stack[0][0]}\n${origString}\n${" ".repeat(stack[0][1])}^`
    yield currentString;
}

/**
 * Processes all the interpolations.
 * @param {string} expr 
 * @returns {string}
 */
function processExpressions(expr, vars) {
    var bits = [...level1ParseExpression(expr, [], [], ["[", "{", "$(", "(", "\"", "'"], "]}))\"'")];
    bits = bits.map(bit => {
        var m = /^\$\((.+)\)$/.exec(bit);
        if (!m) return bit;
        return evalExpression(m[1], vars).join(" ");
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
function evalExpression(string, vars) {
    var ss = string.trim();
    var tokens = [...level1ParseExpression(ss, [" "], operators.flatMap(Object.keys))].filter(Boolean);
    for (var i = 0; i < tokens.length; i++) {
        var t = tokens[i];
        if (typeof t !== "string") continue;
        if (t[0] === "(") tokens.splice(i, 1, ...evalExpression(t.slice(1, t.length - 1)));
        else if ("{'\"".includes(t[0])) tokens[i] = t.slice(1, t.length - 1);
        if (typeof tokens[i] === "string" && !isNaN(+tokens[i])) tokens[i] = parseInt(tokens[i]) || parseFloat(tokens[i]) || 0.;
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
                try {
                    if (i !== -1) {
                        var val = precedenceLevel[opName](tokens[i - 1], tokens[i + 1], vars);
                        tokens.splice(i - 1, 3, ...[].concat(val));
                        hasOps = true;
                        break tokenLoop;
                    }
                } finally {
                    if (typeof tokens.shift() !== "undefined") throw "postfix at beginning";
                    if (typeof tokens.pop() !== "undefined") throw "prefix at end";
                }
            }
        }
    } while (hasOps);
    // must return an array because this function is called recursively
    return tokens;
}
