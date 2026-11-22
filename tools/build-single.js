#!/usr/bin/env node
// Builds one self-contained HTML file from index.html + css/ + js/.
//   node tools/build-single.js            -> dist/bingo-watch.html
// The result can be shared, emailed or opened straight from a phone. Only the map library,
// fonts, map tiles and weather data are still loaded from the internet.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let html = read('index.html');
let css = 0, js = 0;

// <link rel="stylesheet" href="css/x.css">  ->  <style>…</style>
html = html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (_, file) => {
    css++;
    return '<style>\n' + read(file) + '</style>';
});

// <script src="js/x.js"></script>  ->  <script>…</script>
html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (_, file) => {
    js++;
    // "</script" inside the code would end the inline script early
    return '<script>\n' + read(file).replace(/<\/script/gi, '<\\/script') + '</script>';
});

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', 'bingo-watch.html');
fs.writeFileSync(out, html);
console.log(`dist/bingo-watch.html  (${css} stylesheet, ${js} scripts, ${(html.length / 1024).toFixed(0)} KB)`);
