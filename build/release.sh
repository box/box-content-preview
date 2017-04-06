#!/bin/bash

export NODE_PATH=$NODE_PATH:./node_modules

# Temp versions
OLD_VERSION="XXX"
VERSION="XXX"


# Major, minor, or patch release
major_release=false
minor_release=false
patch_release=false


lint_and_test() {
    yarn run lint && yarn run test
}


increment_version() {
    # Old version
    OLD_VERSION=$(./build/current_version.sh)

    if $major_release; then
        echo "----------------------------------------------------"
        echo "Bumping major version..."
        echo "----------------------------------------------------"
        npm --no-git-tag-version version major
    elif $minor_release; then
        echo "----------------------------------------------------"
        echo "Bumping minor version..."
        echo "----------------------------------------------------"
        npm --no-git-tag-version version minor
    elif $patch_release; then
        echo "----------------------------------------------------"
        echo "Bumping patch version..."
        echo "----------------------------------------------------"
        npm --no-git-tag-version version patch
    fi

    # The current version being built
    VERSION=$(./build/current_version.sh)
}


update_changelog() {
    echo "----------------------------------------------------"
    echo "Updating CHANGELOG.md"
    echo "----------------------------------------------------"

    if github_changelog_generator box/box-content-preview --future-release v$VERSION --since-tag v$OLD_VERSION; then
        echo "----------------------------------------------------"
        echo "Updated CHANGELOG successfully"
        echo "----------------------------------------------------"
    else
        echo "----------------------------------------------------"
        echo "Error: Could not update the CHANGELOG for this version"
        echo "----------------------------------------------------"
        exit 1
    fi
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
    git commit -am $VERSION

    # Force update tag after updating files
    git tag -a v$VERSION -m $VERSION

    echo "----------------------------------------------------"
    echo "Master version is now at" $VERSION
    echo "----------------------------------------------------"

    # Push to Github including tags
    if git push github-upstream master --tags --no-verify; then
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


# Check out latest code from git, build assets, increment version, and push t
push_new_release() {
    # Update to latest code on Github master
    git checkout master || exit 1

    if git remote get-url github-upstream; then
        git fetch --tags github-upstream;
    else
       git remote add github-upstream git@github.com:box/box-content-preview.git
       git fetch --tags github-upstream;
    fi;

    git reset --hard github-upstream/master || exit 1
    git clean -f || exit 1

    # Run linting and tests
    lint_and_test

    # Bump the version number
    increment_version

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
