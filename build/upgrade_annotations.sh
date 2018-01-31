#!/bin/bash -xe

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
    CHANGELOG="$(curl -k https://raw.githubusercontent.com/box/box-annotations/master/CHANGELOG.md | awk '/\#/{f=1} f{print; if (/\<a/) exit}' | grep . | sed 's/\<a.*//')";
}


push_to_github() {
    # Add new files
    git add . && git commit -m "Update: box-annotations to v$LATEST_VERSION" -m "https://github.com/box/box-annotations/releases/tag/v$LATEST_VERSION" -m "$CHANGELOG"

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


reset_to_master() {
    # Add the upstream remote if it is not present
    if ! git remote get-url github-upstream; then
        git remote add github-upstream git@github.com:box/box-content-preview.git || return 1
    fi

    # The master branch should not have any commits
    if [[ $(git log --oneline ...github-upstream/master) != "" ]] ; then
        echo "----------------------------------------------------"
        echo "Error in resetting to master!"
        echo "----------------------------------------------------"
        exit 1
    fi

    # Update to latest code on GitHub master
    git checkout master || return 1

    # Fetch latest code with tags
    git fetch github-upstream || return 1;

    # Reset to latest code and clear unstashed changes
    git reset --hard github-upstream/master || return 1
}


upgrade_box_annotations() {
    if [[ $(git diff --shortstat 2> /dev/null | tail -n1) != "" ]] ; then
        echo "----------------------------------------------------"
        echo "Your branch is dirty!"
        echo "----------------------------------------------------"
        exit 1
    fi

    # Get latest commited code and tags
    reset_to_master || return 1

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
