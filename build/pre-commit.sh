#!/bin/sh

# Returns added (A), modified (M), untracked (??) filenames
function get_git_changed_files {
  echo $(git status -s | grep -E '[AM?]+\s.+?\.js$' | cut -c3-)
}

# Run eslint over changed files, if any
files=$(get_git_changed_files);
git_root=$(git rev-parse --show-toplevel);

if [ ! -z "${files}" ]; then
    ${git_root}/node_modules/eslint/bin/eslint.js $files;
fi
