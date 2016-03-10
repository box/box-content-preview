#!/bin/sh

files=$(git status -s | grep -E '[AM?]+\s.+?\.js$' | cut -c3-);
root=$(git rev-parse --show-toplevel);

if [ ! -z "${files}" ]; then
    ${root}/node_modules/.bin/eslint $files;
fi
