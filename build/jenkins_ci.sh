#!/bin/bash

export NODE_PATH=$NODE_PATH:./node_modules

# eslint - adapted from https://gist.github.com/jhartikainen/36a955f3bfe06557e16e
# and https://coderwall.com/p/zq8jlq/eslint-pre-commit-hook
# returns added (A), modified (M), untracked (??) filenames
git_changed_files() {
    echo $(git status -s | grep -E '[AM?]+\s.+?\.js$' | cut -c3-)
}

# run lint over changed files, if any
eslint_changed_files() {
    files=$(git_changed_files);
    root=$(git rev-parse --show-toplevel);

    if [ ! -z "${files}" ]; then
        e=$(${root}/node_modules/eslint/bin/eslint.js $files);
        if [[ "$e" != *"0 problems"* ]]; then
            echo "Eslint error: Check eslint hints."
            exit 1 # reject
        fi
    fi
}

# Clean node modules, re-install dependencies, and build assets
build_assets() {

    echo "-------------------------------------------------------------"
    echo "Installing node modules from https://registry.nodejitsu.com"
    echo "-------------------------------------------------------------"
    if npm install --registry https://registry.nodejitsu.com; then
        echo "----------------------------------------------------"
        echo "Installed node modules."
        echo "----------------------------------------------------"
    else
        echo "---------------------------------------------------------------------------------------------------------------------------"
        echo "Installing node modules from http://maven-vip.dev.box.net:8150/nexus/content/groups/npm-all/ OR https://registry.npmjs.org"
        echo "---------------------------------------------------------------------------------------------------------------------------"
        if npm install; then
            echo "----------------------------------------------------"
            echo "Installed node modules."
            echo "----------------------------------------------------"
        else
            echo "--------------------------------------------------------------"
            echo "Installing node modules from http://registry.cnpmjs.org"
            echo "--------------------------------------------------------------"
            if npm install --registry http://registry.cnpmjs.org; then
                echo "----------------------------------------------------"
                echo "Installed node modules."
                echo "----------------------------------------------------"
            else
                echo "----------------------------------------------------"
                echo "Failed to install node modules!"
                echo "----------------------------------------------------"
                exit 1;
            fi
        fi
    fi


    echo "----------------------------------------------------"
    echo "Starting release build for version" $VERSION
    echo "----------------------------------------------------"

    if npm run release; then
        echo "----------------------------------------------------"
        echo "Built release assets for version" $VERSION
        echo "----------------------------------------------------"
    else
        echo "----------------------------------------------------"
        echo "Failed to build release assets!"
        echo "----------------------------------------------------"
        exit 1;
    fi
}

if ! eslint_changed_files; then
    echo "----------------------------------------------------"
    echo "Error: failure in build_pull_request - eslint errors"
    echo "----------------------------------------------------"
    exit 1
fi

if ! build_assets; then
    echo "----------------------------------------------------"
    echo "Error: failure in build_pull_request - build errors"
    echo "----------------------------------------------------"
    exit 1
fi
