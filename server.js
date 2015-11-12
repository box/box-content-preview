'use strict';

var express = require('express');
var fs = require('fs');
var https = require('https');
var cors = require('cors');

var app = express();

var home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;

app.use(cors());

app.use('/', express.static(__dirname + '/demo'));

app.use('/dist', express.static(__dirname + '/dist'));

https.createServer({
    key: fs.readFileSync(home + '/key.pem'),
    cert: fs.readFileSync(home + '/cert.pem')
}, app).listen(443);
