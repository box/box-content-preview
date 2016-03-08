#!/bin/sh

# Git pre-commit hook. Runs eslint on modified JS files. Adapted from
# https://gist.github.com/jhartikainen/36a955f3bfe06557e16e and
# https://coderwall.com/p/zq8jlq/eslint-pre-commit-hook

# Returns added (A), modified (M), untracked (??) filenames
function get_git_changed_files {
  echo $(git status -s | grep -E '[AM?]+\s.+?\.js$' | cut -c3-)
}

# Run eslint over changed files, if any
files=$(get_git_changed_files);
root=$(git rev-parse --show-toplevel);

if [ ! -z "${files}" ]; then
    ${root}/node_modules/eslint/bin/eslint.js $files;
fi
