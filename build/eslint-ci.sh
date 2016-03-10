#!/bin/sh

files=$(git diff --name-only origin/master | grep '\.js$');
root=$(git rev-parse --show-toplevel);

if [ ! -z "${files}" ]; then
    ${root}/node_modules/.bin/eslint $files;
fi
