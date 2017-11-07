#!/bin/bash

export NODE_PATH=$NODE_PATH:./node_modules

update_version() {
    CURRENT_VERSION="$(cat package.json | grep box-annotations | sed 's/.*\^\(.*\)\".*/\1/')";
    LATEST_VERSION="$(npm show box-annotations version)";

    yarn add box-annotations@^$LATEST_VERSION

    UPDATED_VERSION="$(cat package.json | grep box-annotations | sed 's/.*\^\(.*\)\".*/\1/')";

    if [ $UPDATED_VERSION == $LATEST_VERSION ]; then
        echo "----------------------------------------------------------------------"
        echo "Successfully upgraded from $CURRENT_VERSION to $UPDATED_VERSION"
        echo "----------------------------------------------------------------------"
    else
        echo "----------------------------------------------------------------------"
        echo "Error: Failed to upgrade to $CURRENT_VERSION"
        echo "----------------------------------------------------------------------"
    fi
}

get_changelog() {
    CHANGELOG="$(curl https://raw.githubusercontent.com/box/box-annotations/master/CHANGELOG.md | awk '/\#/{f=1} f{print; if (/\<a/) exit}' | grep . | sed 's/\<a.*//')";
}


push_to_github() {
    # Add new files
    git add . && git commit -m "Update: box-annotations to v$UPDATED_VERSION" -m "https://github.com/box/box-annotations/releases" -m "$CHANGELOG"

    # Push commit to GitHub
    if git push origin -f --no-verify; then
        echo "----------------------------------------------------------------------"
        echo "Pushed commit to git successfully"
        echo "----------------------------------------------------------------------"
    else
        echo "----------------------------------------------------------------------"
        echo "Error while pushing commit to git"
        echo "----------------------------------------------------------------------"
        return 1
    fi
}

upgrade_box_annotations() {
    # Bump the version number
    update_version || return 1

    # Update changelog
    get_changelog || return 1

    # Push to GitHub
    push_to_github || return 1

    return 0
}

# Execute this entire script
if ! upgrade_box_annotations; then
    echo "----------------------------------------------------------------------"
    echo "Error while upgrading box-annotations to latest version!"
    echo "----------------------------------------------------------------------"

    echo "----------------------------------------------------------------------"
    echo "Cleaning workspace by checking out master and removing tags"
    echo "----------------------------------------------------------------------"
    exit 1
fi
