#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');

// eslint-disable-next-line no-unused-vars
const [node, script, assetsVersion, libName, libVersion, manifestPath] = process.argv;

if (!(assetsVersion && libName && libVersion && manifestPath)) {
    console.log('Missing required arguments');
    process.exit(1);
}

const manifestStr = fs.readFileSync(manifestPath);
const parsedManifest = JSON.parse(manifestStr);
parsedManifest.version = assetsVersion;
parsedManifest.dependencies[libName] = libVersion;

fs.writeFileSync(manifestPath, JSON.stringify(parsedManifest, null, 4));
