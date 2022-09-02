# Langton-Music Format

## Overview

The format is based on 3 sections:

* A header, of key-value pairs
* A bunch of ant "breeds"
* Some RLE data to specify the cells on the grid and the placement of the ants

Addidtionally, you can put sigle line comments anywhere in the text by preceding the coment with `%%`.

## Header

This is pretty simple. They syntax is simply `key: value;` repeated as many times as necessary, with whitespace completely ignored, and the last semicolon optional.

There is one rule: `key` must be all letters (no numbers, symbols, or whitespace), whereas `value` can be anything that isn't a semicolon (which would trip up the parser).

### Supported Header Options

| Option | Function |
|:------:|:---------|
| `bpm` | COntrold maximum beats per minute of playback. |
| `stepCount` | Doesn't really do anything, it just changes the initial step number from the default zero when you press LOAD. Useful for restoring from a dump. |
| `#blah` | An arbitrary interpolation value (see below). |

## Ant Breeds

This is significantly more complicated than the header, and uses a double loop in the parser.

Each "breed" of ant is enclosed in square brackets. Within the brackets lie 3 pieces of data, separated by spaces:

1. The species of the ant
2. The name of the ant breed
3. The rules for moving around, changing the world, etc.

**Ant Species**: This determines what "type" of ant it is; namely; what features are available to it.

**Ant Name**: This is arbitrary, all it is for is to be able to reference it in the pattern.

**Rules**: There can be any number of these, separated by spaces. The rules define what the ant does when it gets onto a specific square color, is in a particular state, etc.

They are formatted like this: `{thisState:cellState => actions}` (with the space around the => optional).

`thisState` is the *internal* state that the ant is in, and `cellState` is the *external* state of the cell the ant is sitting on. Both must be numbers.

If there is no rule for an antState:cellState pair, the ant will halt and do nothing until another ant comes and changes the cell. (Multiple ants can occupy the same cell, and must if an ant is to be re-started in this manner, but if two "active" ants run into each other, the behavior is not defined.)

The actions are a comma-or-space-separated list of individual commands the ant takes. The string is first split by commas, and each comma-separated section is queued. The ant only looks up in the rules table when the queue is empty, and executes only one comma-separated section at a time, so commas means that the ant will not always look at the cell it is on every tick.

Afterwards, it is split by spaces, and each sub-command between commas runs all at once, in one tick. Each sub-command is simply a string of letters, optionally followed by an argument enclosed in parenthesis.

As an example, here is classic Langton's Ant:

```txt
[Ant langton
  {1:0 => put(1) rt fd}
  {1:1 => put(0) lt fd}
]
```

Scroll to the bottom for the list of supported commands and species of ants.

## RLE World Data

This is almost like Golly's RLE format, but it has some differeces. First, there is no `x = N, y = N, rule = N` header line. Second, after a run of non-"$" cells, there can be one or more ants.

An ant looks like `[breed:dir:state]` where `breed` is a breed from the ant breeds section, `dir` is 0, 1, 2, or 3 corresponding to N, E, S, or W, and `state` (which is optional) is the initial state the ant is in. It deaults to 1 if both the state and colon are left out. If the colon is not left out that is an error.

Otherwise this is just the same as Golly RLE format:

> For rules with more than two states, a "." represents a zero state; states 1..24 are represented by "A".."X", states 25..48 by "pA".."pX", states 49..72 by "qA".."qX", and on up to states 241..255 represented by "yA".."yO".

## Interpolations

Inside each sub-command, the parameter can also include interpolations.

There are two types of interpolations: fixed and expressions.

**Fixed interpolations** look like `#xxx`, where `xxx` is a name. Some names are provided by the ant, which take precedence; the rest are put in the header.

| Fixed Interpolation Name | Value |
|:------------------------:|:------|
| `dir` | 0, 1, 2, or 3 depending on the ant's direction. |
| `state` | Whatever state the ant is in. |
| `blah` | Whatever value `#blah` is set to in the header. (`blah` can be anything.) |

**Expression interpolations** are similar: They look like `#xxx;` - the only difference is a semicolon at the end and the `xxx`'s are an expression. Expressions are processed after fixed interpolations; so the former can include the latter.

The expression language is a crude stack-based (postfix) language that is somewhat like Befunge; it's not Turing-complete, but it should suffice. The "returned value" is the top of the stack after the expression is executed.

| Command/Token | Function |
|:-------------:|:---------|
| `0-9` number | Pushes the arbitrary number to the stack; only integers are supported. |
| `` `string` `` | Pushes the arbitrary string between the backticks. |
| `'` | No-op. Useful for separating numbers (the parser is greedy so it needs a non-digit character to stop it). |
| `\` | Swap top two items on the stack. |
| `$` | Drops the top item. |
| `:` | Duplicates the top item. |
| `?` | Pushes a random integer from 0 to the top number minus 1. |
| `%` | Pushes second number mod top number. |
| `*` | Pushes second number times top number. |
| `/` | Pushes second number divided by top number. |
| `+` | Pushes second number plus top number. |
| `-` | Pushes second number minus top number. |
| `~` | Pushes negation of top number. Shortcut for `,0-`. |
| `\|` | Pushes second number bitwise or top number. |
| `&` | Pushes second number bitwise and top number. |
| `^` | Pushes second number bitwise xor top number. |
| `<` | Pushes true or false depending on if second number is less than the top number. |
| `>` | Pushes true or false depending on if second number is greater than the top number. |
| `=` | Pushes true or false depending on if second number is equal to the top number. |
| `@` | Pushes the third number if the first is true, otherwise the second. |

An (incomplete) test suite is available at <https://dragoncoder047.github.io/langton-music/interpoltest.html>.

## Supported Ant Species and Commands

### `Ant` (base class for all)

| Command | What it does |
|:-------:|:-------------|
| `fd(num)`, `bk(num)` | Moves forward or that many cells. Defaults to 1 if argument is omitted. |
| `rt(num)`, `lt(num)` | Turn right or left that many steps (step = 90 degrees). Defaults to 1 if argument is omitted. |
| `dir(num)` | Set the direction to `num`. Use of this command turns the ant into an **absolute turmite**. |
| `put(state)` | Set the cell the ant is sitting on to `state` (which must be a number). |
| `state(num)` | Sets the ant's internal state to `num`. Use of this command turns the ant into an **turmite**. |
| `spawn(breed:dir:state)` | Spawn an ant of breed `breed` here, in state `state` and facing in `dir`. `dir` is relative, meaning 0 = same way as me, 1 = right turn from me, etc. |
| `die` | Mark this ant as dead, so it will be removed. |
| `alert(text)` | Shows the text to the user in an alert box. Useful for debugging. |
| `status(text, color)` | Puts the text in the status bar. Color is optional, defaults to black. |

### `Beetle` and `Cricket`

| Command | What it does |
|:-------:|:-------------|
| `play(note:pan)` | Play that note for 1 tick. `note` can be a number, which is a frequency in hertz, or a note name string such as `Bb5` which is converted to the frequency of that piano note. Support for stereo pan is experimental - defaults to 0. |

`Beetle` (think: "beat") uses a [`Tone.MembraneSynth`](https://tonejs.github.io/docs/14.7.77/MembraneSynth), whereas `Cricket` uses a [`Tone.AMSynth`](https://tonejs.github.io/docs/14.7.77/AMSynth).
