# Langton-Music

[![discussion](https://img.shields.io/badge/discussion-conwaylife.com-blue)](https://conwaylife.com/forums/viewtopic.php?f=11&p=147432)
[![pages-build-deployment](https://github.com/dragoncoder047/langton-music/actions/workflows/pages/pages-build-deployment/badge.svg)](https://github.com/dragoncoder047/langton-music/actions/workflows/pages/pages-build-deployment)
[![GitHub issues](https://img.shields.io/github/issues/dragoncoder047/langton-music)](https://github.com/dragoncoder047/langton-music/issues)
![GitHub commit activity](https://img.shields.io/github/commit-activity/w/dragoncoder047/langton-music)
![GitHub last commit](https://img.shields.io/github/last-commit/dragoncoder047/langton-music)

## Features

* Responsive design works on all screen sizes.
* All-in-one documentation and help included.
* Simple XML-based format.

## Running Offline

1. `git clone` this repository locally, or dowload a zip and unpack.
2. [Download Tone.js](https://cdn.jsdelivr.net/npm/tone@14.7.77/build/Tone.min.js) and save it in the same folder as everything else.
3. [Go here](https://cdn.jsdelivr.net/npm/ace-builds@1.10.0/src-noconflict/) and download `ace.js`, `mode-xml.js`, and any theme file. Create a folder `ace/` and save them there.
4. Open `main.js` and change the `ace.config.set('basePath', 'xxx')` towards the top to point to the new `ace/` folder instead of jsDelivr. Also, if you chose a theme other than `chrome`, change the `textbox.setTheme('ace/theme/chrome')` as well.
5. Open `index.html` in a text editor and change the two links at the top to point to the downloaded copies of Ace and Tone.js instead of jsDelivr.
6. Open `index.html` in a browser.
7. Enjoy!
