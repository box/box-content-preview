#!/bin/bash

export NODE_PATH=$NODE_PATH:./node_modules

# Run eslint over changed files, if any
eslint_changed_files() {
    if npm run eslint; then
        echo "----------------------------------------------------"
        echo "Eslint passes with no errors"
        echo "----------------------------------------------------"
    else
        echo "----------------------------------------------------"
        echo "Error: failure in build_pull_request - eslint errors"
        echo "----------------------------------------------------"
        exit 1;
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
