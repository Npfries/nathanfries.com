const express = require('express')
const path = require('path')
const app = express()
const workboxBuild = require('workbox-build')

app.use(express.static('docs'))

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/docs/index.html'))
})

// NOTE: This should be run *AFTER* all your assets are built
const buildSW = () => {
    // This will return a Promise
    return workboxBuild.generateSW({
      globDirectory: 'docs',
      globPatterns: [
        '**/*.{html,json,js,css,jpg,webp}',
      ],
      swDest: 'docs/sw.js',
    });
  };

  buildSW()

app.listen(3000)