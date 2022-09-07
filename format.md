# Langton-Music Format

## Overview

The format is based on XML.

The entire document is enclosed in `<langton>` tags.

Then there can be 4 things inside that:

* `<config>` tags: for header configuration values
* `<breed>` tags: Defining the ant breeds
* `<ant>` tags: instantiating (using) the ant
* `<rle>` tags: RLE data to specify the cells on the grid.

Addidtionally, because it's XML, you can put comments anywhere you like by using `<!-- -->`.

## Header - `<config>` tags

This is pretty simple. Each tag is formatted like this: `<config name="KEY">VALUE</config>`

### Supported Header Options

| Option (`name` attribute) | Function (content) |
|:-------------------------:|:-------------------|
| `bpm` | Controls maximum beats per minute of playback. |
| `stepCount` | Doesn't really do anything, it just changes the initial step number from the default zero when you press LOAD. Useful for restoring from a dump. |
| `#blah` | An arbitrary interpolation value (see below). |

## Ant Breeds - `<breed>` tag

This is a little complicated. Let's start with an example, classic Langton's Ant:

```xml
<breed species="Ant" name="langton">
    <case cell="0">
        <action>
            <command name="put">1</command>
            <command name="lt"></command>
            <command name="fd"></command>
        </action>
    </case>
    <case cell="1">
        <action>
            <command name="put">0</command>
            <command name="rt"></command>
            <command name="fd"></command>
        </action>
    </case>
</breed>
```

Each "breed" of ant is enclosed in `<breed>` tags. The `species` attribute determines what commands are available, and the `name` attribute gives the ant breed a name so it can be referred to later on.

Inside the `<breed>`, there are one or more `<case>`s. The `<case>`s each have a `cell` attribute and a `state` attribute that determines when the case is applied - `state` is the *internal* state that the ant is in, and `cell` is the *external* state of the cell the ant is sitting on. Both must be numbers; and if `state` is omitted it defaults to 1.

If there is no case for a state:cell pair, the ant will halt and do nothing until another ant comes and changes the cell. (Multiple ants can occupy the same cell, and must if an ant is to be re-started in this manner, but if two "active" ants run into each other, the behavior is not defined.)

Within the `<case>`s there are `<action>`s that define groups of commands. Each action is queued, and only one action executes per tick. Case lookup only occurs when the queue is exhausted. Within the action group, all commands execute at once.

Each `<command>` has a `name` attribute that is the command. In some cases the command needs an argument; this goes inside the tag.

Scroll to the bottom for the list of supported commands and species of ants.

### Interpolations

Inside each `<command>`, the parameter can also include interpolations.

There are two types of interpolations: fixed and expressions.

#### Fixed Interpolations

These look like `#xxx`, where `xxx` is a name. Some names are provided by the ant, which take precedence; the rest are user-defined via `<config>`s.

| Fixed Interpolation Name | Value |
|:------------------------:|:------|
| `dir` | 0, 1, 2, or 3 depending on the ant's direction. |
| `state` | Whatever state the ant is in. |
| `blah` | Whatever value `#blah` is set to in a `<config>`. (`blah` can be anything.) |

#### Expression Interpolations

These are similar to fixed interpolations: They look like `#xxx;` - the only difference is a semicolon at the end and the `xxx`'s are an expression. Expressions are processed after fixed interpolations; so the former can include the latter.

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
| `~` | Pushes negation of top number. Shortcut for `,0\-`. |
| `\|` | Pushes second number bitwise or top number. |
| `&` | Pushes second number bitwise and top number. |
| `^` | Pushes second number bitwise xor top number. |
| `<` | Pushes true or false depending on if second number is less than the top number. |
| `>` | Pushes true or false depending on if second number is greater than the top number. |
| `=` | Pushes true or false depending on if second number is equal to the top number. |
| `@` | Pushes the third number if the first is true, otherwise the second. |

An (incomplete) test suite is available at <https://dragoncoder047.github.io/langton-music/interpoltest.html>.

## Actual Ants - `<ant>` tag

Ants are simpler and do not have any contents.

A full `<ant>` looks like this: `<ant breed="langton" id="ant1" state="1" dir="1" x="0" y="0"></ant>`.

* `breed` is the breed of ant, which references a `<breed>` elsewhere.
* `id` is the "name" of the ant as it appears in the "Track Ant" pulldown menu. If this is not supplied. a random one will be generated automatically.
* `state` is the initial state of the ant; if omitted it defults to 1.
* `dir` is the direction of the ant; it is 0, 1, 2, or 3.
* `x` and `y` are the position of the ant.

## Cell Data - `<rle>` tag

This is almost like Golly's RLE format, but it has some differeces. First, there is no `x = N, y = N, rule = N` header line per se. The metadata (x- and y-offset) is stored in the `offsetx` and `offsety` attributes of the `<rle>` tag, and default to 0 if omitted.

Otherwise this is just the same as Golly RLE format:

> For rules with more than two states, a "." represents a zero state; states 1..24 are represented by "A".."X", states 25..48 by "pA".."pX", states 49..72 by "qA".."qX", and on up to states 241..255 represented by "yA".."yO".

## Supported Ant Species and Commands

### `Ant` (base class for all)

(Do note that the parenthesis notation here is used only to save space. `foo(bar)` would really be written `<command name="foo">bar</command>`.)

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
