#!/bin/sh

root=$(git rev-parse --show-toplevel);
${root}/node_modules/.bin/eslint ${root}/src/lib
