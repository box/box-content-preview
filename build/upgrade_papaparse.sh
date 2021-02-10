#!/bin/bash
# Run with specific branch/tag (e.g. ./upgrade_papaparse.sh 5.3.0) or with no arguments to use master

REMARKABLE_DIST="papaparse.min.js"
REPO_SRC_DIR="papaparse"
REPO_URL="git@github.com:mholt/PapaParse.git"
BASE_PATH="src/third-party/text"
STATIC_ASSETS_BRANCH=${1:-master}
STATIC_ASSETS_VERSION=$(./build/current_version.sh)
STATIC_ASSETS_PATH="${BASE_PATH}/${STATIC_ASSETS_VERSION}"

source build/upgrade_utils.sh

clone_repo() {
    echo "-----------------------------------------------------------------------------------"
    echo "Cloning papaparse repo at branch: $STATIC_ASSETS_BRANCH..."
    echo "-----------------------------------------------------------------------------------"
    rm -rf ${REPO_SRC_DIR}
    git clone ${REPO_URL} --depth 1 --single-branch --branch ${STATIC_ASSETS_BRANCH} ${REPO_SRC_DIR} || return 1
}

process_papaparse_assets() {
    echo "-----------------------------------------------------------------------------------"
    echo "Copying relevant files to third-party directory..."
    echo "-----------------------------------------------------------------------------------"
    cp -v ${REPO_SRC_DIR}/papaparse.js ${STATIC_ASSETS_PATH} || return 1
    cp -v ${REPO_SRC_DIR}/papaparse.min.js ${STATIC_ASSETS_PATH} || return 1
}

upgrade_papaparse() {
    echo "Upgrading papaparse to $STATIC_ASSETS_BRANCH";

    # Prepare target directory under third-party/text
    prepare_target_directory || return 1

    # Clone papaparse from the specified version
    clone_repo || return 1

    # Copy over built assets to target directory
    process_papaparse_assets || return 1

    # Bump papaparse version in manifest.json
    bump_manifest_version || return 1

    # Cleanup papaparse
    cleanup_repo || return 1

    echo "-----------------------------------------------------------------------------------"
    echo "Successfully upgraded papaparse! 🚀"
    echo "-----------------------------------------------------------------------------------"
}

# Execute this entire script
if ! upgrade_papaparse; then
    echo "----------------------------------------------------------------------"
    echo "Error while upgrading papaparse to latest version!"
    echo "----------------------------------------------------------------------"

    echo "----------------------------------------------------------------------"
    echo "Clean workspace by deleting ${STATIC_ASSETS_PATH} and ${REPO_SRC_DIR}"
    echo "----------------------------------------------------------------------"
    exit 1
fi
