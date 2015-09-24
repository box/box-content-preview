'use strict';
var express = require('express');
var app = express();
app.use('/', express.static(__dirname + '/demo'));
app.use('/dist', express.static(__dirname + '/dist'));
app.listen(9898);
