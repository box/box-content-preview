#!/bin/bash

export NODE_PATH=$NODE_PATH:./node_modules

move_reports() {
    echo "--------------------------------------------------------------------------"
    echo "Moving test reports to ./reports/coverage.xml and ./reports/results.xml"
    echo "--------------------------------------------------------------------------"
    mv ./reports/coverage/cobertura/*/cobertura-coverage.xml ./reports/cobertura.xml;
    mv ./reports/coverage/junit/*/junit.xml ./reports/junit.xml;
}

# Clean node modules, re-install dependencies, and build assets
build_assets() {

    echo "-------------------------------------------------------------------------------------------------"
    echo "Installing node modules"
    echo "-------------------------------------------------------------------------------------------------"
    if yarn install; then
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

    if yarn run ci; then
        echo "----------------------------------------------------"
        echo "Built CI assets for version" $VERSION
        echo "----------------------------------------------------"
        move_reports
    else
        echo "----------------------------------------------------"
        echo "Failed to build CI assets!"
        echo "----------------------------------------------------"
        move_reports
        exit 1;
    fi
}

if ! build_assets; then
    echo "----------------------------------------------------"
    echo "Error: failure in build_pull_request - build errors"
    echo "----------------------------------------------------"
    exit 1
fi
