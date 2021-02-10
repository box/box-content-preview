#!/bin/bash
# Run with specific branch/tag (e.g. ./upgrade_remarkable.sh 2.0.1) or with no arguments to use master

REMARKABLE_DIST="remarkable.min.js"
REPO_SRC_DIR="remarkable"
REPO_URL="git@github.com:jonschlinkert/remarkable.git"
BASE_PATH="src/third-party/text"
STATIC_ASSETS_BRANCH=${1:-master}
STATIC_ASSETS_VERSION=$(./build/current_version.sh)
STATIC_ASSETS_PATH="${BASE_PATH}/${STATIC_ASSETS_VERSION}"

source build/upgrade_utils.sh

build_remarkable() {
    echo "-----------------------------------------------------------------------------------"
    echo "Cloning remarkable repo at branch: $STATIC_ASSETS_BRANCH..."
    echo "-----------------------------------------------------------------------------------"
    rm -rf ${REPO_SRC_DIR}
    git clone ${REPO_URL} --depth 1 --single-branch --branch ${STATIC_ASSETS_BRANCH} ${REPO_SRC_DIR} || return 1

    echo "-----------------------------------------------------------------------------------"
    echo "Building remarkable..."
    echo "-----------------------------------------------------------------------------------"
    # Use subshell to execute the custom build to avoid having to keep track of the current working directory
    (cd ${REPO_SRC_DIR} && yarn install --frozen-lockfile && yarn build) || return 1
}

process_remarkable_assets() {
    echo "-----------------------------------------------------------------------------------"
    echo "Copying relevant files to third-party directory..."
    echo "-----------------------------------------------------------------------------------"
    cp -v ${REPO_SRC_DIR}/dist/${REMARKABLE_DIST} ${STATIC_ASSETS_PATH} || return 1
}

upgrade_remarkable() {
    echo "Upgrading remarkable to $STATIC_ASSETS_BRANCH";

    # Prepare target directory under third-party/text
    prepare_target_directory || return 1

    # Build remarkable from the specified version
    build_remarkable || return 1

    # Copy over built assets to target directory
    process_remarkable_assets || return 1

    # Bump remarkable version in manifest.json
    bump_manifest_version || return 1

    # Cleanup remarkable
    cleanup_repo || return 1

    echo "-----------------------------------------------------------------------------------"
    echo "Successfully upgraded remarkable! 🚀"
    echo "-----------------------------------------------------------------------------------"
}

# Execute this entire script
if ! upgrade_remarkable; then
    echo "----------------------------------------------------------------------"
    echo "Error while upgrading remarkable to latest version!"
    echo "----------------------------------------------------------------------"

    echo "----------------------------------------------------------------------"
    echo "Clean workspace by deleting ${STATIC_ASSETS_PATH} and ${REPO_SRC_DIR}"
    echo "----------------------------------------------------------------------"
    exit 1
fi
