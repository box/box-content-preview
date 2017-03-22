#!/bin/bash

export NODE_PATH=$NODE_PATH:./node_modules

# Temp versions
OLD_VERSION="XXX"
VERSION="XXX"


# Major, minor, or patch release
major_release=false
minor_release=false
patch_release=false


increment_version() {
    # Old version
    OLD_VERSION=$(./build/current_version.sh)

    if $major_release; then
        echo "----------------------------------------------------"
        echo "Bumping major version..."
        echo "----------------------------------------------------"
        npm version major
    elif $minor_release; then
        echo "----------------------------------------------------"
        echo "Bumping minor version..."
        echo "----------------------------------------------------"
        npm version minor
    elif $patch_release; then
        echo "----------------------------------------------------"
        echo "Bumping patch version..."
        echo "----------------------------------------------------"
        npm version patch
    fi

    # The current version being built
    VERSION=$(./build/current_version.sh)
}


update_changelog() {
    echo "----------------------------------------------------"
    echo "Updating changelog"
    echo "----------------------------------------------------"
    github_changelog_generator box/box-content-preview --base HISTORY.md
}


update_readme() {
    echo "----------------------------------------------------"
    echo "Updating README"
    echo "----------------------------------------------------"

    # Replace 'v{VERSION}' string
    sed -i -e "s@v$OLD_VERSION@v$VERSION@g" README.md

    # Replace 'preview/{VERSION}' string
    sed -i -e "s@preview/$OLD_VERSION@preview/$VERSION@g" README.md

    rm README.md-e
}


push_to_github() {
    # Add new files
    git add -A
    git commit --amend --no-edit --no-verify

    # Re-tag head including new files
    git tag -f "v$VERSION"

    echo "----------------------------------------------------"
    echo "Master version is now at" $VERSION
    echo "----------------------------------------------------"

    # Push to Github including tags
    if git push origin master --tags --no-verify --force; then
        echo "----------------------------------------------------"
        echo "Pushed version" $VERSION "to git successfully"
        echo "----------------------------------------------------"
    else
        echo "----------------------------------------------------"
        echo "Error while pushing version" $VERSION "to git"
        echo "----------------------------------------------------"
        exit 1
    fi
}


# Clean node modules, re-install dependencies, and build assets
build_assets() {
    echo "--------------------------------------------------"
    echo "Installing node modules"
    echo "--------------------------------------------------"
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
    echo "Starting release build for version" $VERSION
    echo "----------------------------------------------------"

    if yarn run release; then
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


# Check out latest code from git, build assets, increment version, and push t
push_new_release() {
    Update to latest code on Github master
    git checkout master || exit 1
    git add remote github-upstream git@github.com:box/box-content-preview.git || exit 1
    git fetch github-upstream || exit 1
    git reset --hard github-upstream/master || exit 1
    git clean -fdX || exit 1

    # Bump the version number
    increment_version

    # Build assets into dist/
    build_assets

    # Update changelog
    update_changelog

    # Update readme
    update_readme

    # Push to Github
    push_to_github
}


# Check if we are doing major, minor, or patch release
while getopts "mn" opt; do
    case "$opt" in
        m )
            major_release=true ;;
        n )
            minor_release=true ;;
        p )
            patch_release=true ;;
    esac
done


# Execute this entire script
if ! push_new_release; then
    echo "----------------------------------------------------"
    echo "Error while pushing new release!"
    echo "----------------------------------------------------"
    exit 1
fi
