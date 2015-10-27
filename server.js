'use strict';

var express = require('express');
var fs = require('fs');
var https = require('https')

var app = express();

var home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;

app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Max-Age', 7200);
    res.header('Access-Control-Allow-Headers', 'X-Requested-With');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

app.use('/', express.static(__dirname + '/demo'));

app.use('/dist', express.static(__dirname + '/dist', { maxAge: 86400000 }));

https.createServer({
    key: fs.readFileSync(home + '/key.pem'),
    cert: fs.readFileSync(home + '/cert.pem')
}, app).listen(443);