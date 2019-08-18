const express = require('express')
const path = require('path')
const app = express()

app.use('/website', express.static('docs'))

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/docs/index.html'))
})

app.listen(3000)