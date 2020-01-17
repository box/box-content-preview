#!/bin/bash

export NODE_PATH=$NODE_PATH:./node_modules

# Temp versions
OLD_VERSION="XXX"
VERSION="XXX"

dry_run=false

# Wraps mutating commands with echo if dry_run is enabled.
cmd() {
    if $dry_run; then
        echo "The build script would run $*"
        return 0
    fi

    "$@"
}

# Major, minor, or patch release
major_release=false
minor_release=false
patch_release=false

reset_tags() {
    # Wipe tags
    echo "----------------------------------------------------------------------"
    echo "Wiping local tags"
    echo "----------------------------------------------------------------------"
    cmd git tag -l | xargs git tag -d || return 1

    # Add the upstream remote if it is not present
    if ! git remote get-url github-upstream; then
        cmd git remote add github-upstream git@github.com:box/box-content-preview.git || return 1
    fi

    # Fetch latest code with tags
    echo "----------------------------------------------------------------------"
    echo "Fetching latest upstream code + tags"
    echo "----------------------------------------------------------------------"
    cmd git fetch --tags github-upstream || return 1
}

reset_to_previous_version() {
    if OLD_VERSION === "XXX"; then
        echo "----------------------------------------------------------------------"
        echo "Error while cleaning workspace!"
        echo "----------------------------------------------------------------------"
        return 1
    fi

    # Reset and fetch upstream with tags
    reset_tags || return 1

    # Reset to previous release version and clear unstashed changes
    echo "----------------------------------------------------------------------"
    echo "Resetting to v" $OLD_VERSION
    echo "----------------------------------------------------------------------"
    cmd git reset --hard OLD_VERSION || return 1
    cmd git clean -f || return 1
}

reset_to_master() {
    # Update to latest code on GitHub master
    cmd git checkout master || return 1

    # Reset and fetch upstream with tags
    cmd reset_tags || return 1

    # Reset to latest code and clear unstashed changes
    echo "----------------------------------------------------------------------"
    echo "Resetting to upstream/master"
    echo "----------------------------------------------------------------------"
    cmd git reset --hard github-upstream/master || return 1
    cmd git clean -f || return 1
}

build_lint_and_test() {
    # The build command includes linting
    cmd yarn build && cmd yarn test:ci || return 1
}

increment_version() {
    # Old version
    OLD_VERSION=$(./build/current_version.sh)

    # The current branch should not match the previous release tag
    if [[ $(git log --oneline ...v$OLD_VERSION) == "" ]]; then
        echo "----------------------------------------------------"
        echo "Your release has no new commits!"
        echo "----------------------------------------------------"
        exit 1
    fi

    if $major_release; then
        echo "----------------------------------------------------------------------"
        echo "Bumping major version..."
        echo "----------------------------------------------------------------------"
        npm --no-git-tag-version version major
    elif $minor_release; then
        echo "----------------------------------------------------------------------"
        echo "Bumping minor version..."
        echo "----------------------------------------------------------------------"
        npm --no-git-tag-version version minor
    elif $patch_release; then
        echo "----------------------------------------------------------------------"
        echo "Bumping patch version..."
        echo "----------------------------------------------------------------------"
        npm --no-git-tag-version version patch
    fi

    # The current version being built
    VERSION=$(./build/current_version.sh)
}

update_changelog() {
    echo "----------------------------------------------------------------------"
    echo "Updating CHANGELOG.md"
    echo "----------------------------------------------------------------------"

    if cmd ./node_modules/.bin/conventional-changelog -i CHANGELOG.md --same-file; then
        echo "----------------------------------------------------------------------"
        echo "Updated CHANGELOG successfully"
        echo "----------------------------------------------------------------------"
    else
        echo "----------------------------------------------------------------------"
        echo "Error: Could not update the CHANGELOG for this version"
        echo "----------------------------------------------------------------------"
        return 1
    fi
}

update_readme() {
    echo "----------------------------------------------------------------------"
    echo "Updating README"
    echo "----------------------------------------------------------------------"

    # Replace 'v{VERSION}' string
    cmd sed -i -e "s@v$OLD_VERSION@v$VERSION@g" README.md

    # Replace 'preview/{VERSION}' string
    cmd sed -i -e "s@preview/$OLD_VERSION@preview/$VERSION@g" README.md

    if [ -f README.md-e ]; then
        cmd rm README.md-e
    fi
}

push_to_github() {
    # Add new files
    cmd git commit -am "chore(release): $VERSION"

    # Force update tag after updating files
    cmd git tag -a v$VERSION -m $VERSION

    echo "----------------------------------------------------------------------"
    echo "Master version is now at" $VERSION
    echo "----------------------------------------------------------------------"

    # Push release to GitHub
    if $patch_release; then
        if cmd git push github-upstream v$VERSION --no-verify; then
            echo "----------------------------------------------------------------------"
            echo "Pushed version" $VERSION "to git successfully"
            echo "----------------------------------------------------------------------"
        else
            echo "----------------------------------------------------------------------"
            echo "Error while pushing version" $VERSION "to git"
            echo "----------------------------------------------------------------------"
            return 1
        fi
    else
        if cmd git push github-upstream master --tags --no-verify; then
            echo "----------------------------------------------------------------------"
            echo "Pushed version" $VERSION "to git successfully"
            echo "----------------------------------------------------------------------"
        else
            echo "----------------------------------------------------------------------"
            echo "Error while pushing version" $VERSION "to git"
            echo "----------------------------------------------------------------------"
            return 1
        fi
    fi
}

# Check out latest code from git, build assets, increment version, and push tags
push_new_release() {
    # Get latest commited code and tags
    if $dry_run; then
        echo "----------------------------------------------------------------------"
        echo "Running in Dry Run Mode!"
        echo "----------------------------------------------------------------------"
    fi

    if $patch_release; then
        echo "----------------------------------------------------------------------"
        echo "Starting patch release - skipping reset to master"
        echo "IMPORTANT - your branch should be in the state you want for the patch"
        echo "----------------------------------------------------------------------"
    elif $minor_release; then
        echo "----------------------------------------------------------------------"
        echo "Starting minor release - reset to upstream master"
        echo "----------------------------------------------------------------------"
        reset_to_master || return 1
    else
        echo "----------------------------------------------------------------------"
        echo "Starting major release - reset to upstream master"
        echo "----------------------------------------------------------------------"
        reset_to_master || return 1
    fi

    # Run build script, linting, and tests
    build_lint_and_test || return 1

    # Bump the version number
    increment_version || return 1

    # Update changelog
    update_changelog || return 1

    # Update readme
    update_readme || return 1

    # Push to GitHub
    push_to_github || return 1

    # Push GitHub release
    echo "----------------------------------------------------------------------"
    echo "Pushing new GitHub release"
    echo "----------------------------------------------------------------------"
    cmd ./node_modules/.bin/conventional-github-releaser

    return 0
}

# Check if we are doing major, minor, or patch release
while getopts "mnpd" opt; do
    case "$opt" in
    m)
        major_release=true
        ;;
    n)
        minor_release=true
        ;;
    p)
        patch_release=true
        ;;
    d)
        dry_run=true
        ;;
    esac
done

# Execute this entire script
if ! push_new_release; then
    echo "----------------------------------------------------------------------"
    echo "Error while pushing new release!"
    echo "----------------------------------------------------------------------"

    echo "----------------------------------------------------------------------"
    echo "Cleaning workspace by checking out master and removing tags"
    echo "----------------------------------------------------------------------"

    if $patch_release; then
        # Only reset to previous version for patch releases
        reset_to_previous_version || return 1

    # Reset to upstream/master for major/minor releases
    elif ! reset_to_master; then
        echo "----------------------------------------------------------------------"
        echo "Error while cleaning workspace!"
        echo "----------------------------------------------------------------------"
    else
        echo "----------------------------------------------------------------------"
        echo "Workspace succesfully cleaned!"
        echo "----------------------------------------------------------------------"
    fi
    exit 1
fi
