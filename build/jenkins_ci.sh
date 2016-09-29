#!/bin/bash

export NODE_PATH=$NODE_PATH:./node_modules

# Clean node modules, re-install dependencies, and build assets
build_assets() {

    echo "-------------------------------------------------------------------------------------------------"
    echo "Installing node modules from http://maven-vip.dev.box.net:8150/nexus/content/groups/npm-all/"
    echo "-------------------------------------------------------------------------------------------------"
    if npm install; then
        echo "----------------------------------------------------"
        echo "Installed node modules."
        echo "----------------------------------------------------"
    else
        echo "----------------------------------------------------"
        echo "Failed to install node modules!"
        echo "----------------------------------------------------"
        exit 1;
    fi


    echo "----------------------------------------------------"
    echo "Starting CI build for version" $VERSION
    echo "----------------------------------------------------"

    if npm run ci; then
        echo "----------------------------------------------------"
        echo "Built CI assets for version" $VERSION
        echo "----------------------------------------------------"
    else
        echo "----------------------------------------------------"
        echo "Failed to build CI assets!"
        echo "----------------------------------------------------"
        exit 1;
    fi
}

if ! build_assets; then
    echo "----------------------------------------------------"
    echo "Error: failure in build_pull_request - build errors"
    echo "----------------------------------------------------"
    exit 1
fi
