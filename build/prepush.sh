#!/bin/bash

prepush() {
    echo "--------------------------------------------------------"
    echo "Linting"
    echo "--------------------------------------------------------"
    yarn lint || exit 1

    echo "--------------------------------------------------------"
    echo "Testing"
    echo "--------------------------------------------------------"
    git fetch upstream
    yarn test --changedSince=upstream/master || exit 1
}

# Execute this script
if ! prepush; then
    echo "----------------------------------------------------"
    echo "Error: failure in prepush script"
    echo "----------------------------------------------------"
    exit 1
fi
