const express = require('express')
const path = require('path')
const app = express()
const workboxBuild = require('workbox-build');

app.use(express.static('docs'))

const buildSW = () => {
    // This will return a Promise
    console.log('building SW')
    return workboxBuild.generateSW({
      globDirectory: 'docs',
      globPatterns: [
        '**/*.{png,jpg,webp,js,ico,html,txt,webmanifest,xml,css}',
      ],
      swDest: 'docs/sw.js',
    });
  };

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/docs/index.html'))
})

buildSW()
app.listen(3000) 