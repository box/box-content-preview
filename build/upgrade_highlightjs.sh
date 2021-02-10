#!/bin/bash
# Run with specific branch/tag (e.g. ./upgrade_highlightjs.sh 10.6.0) or with no arguments to use master

# TODO: This list of languages should be made more dynamic based on the file extensions Preview supports, see src/lib/extensions.js
HIGHLIGHTJS_DIST="highlight.pack.js"
HIGHLIGHTJS_LANGUAGES="actionscript dos c cpp cmake csharp css diff erb groovy haml java javascript json less makefile ocaml php perl properties python ruby scss scala sml sql bash vim yaml"
REPO_SRC_DIR="highlightjs"
REPO_URL="git@github.com:highlightjs/highlight.js.git"
BASE_PATH="src/third-party/text"
STATIC_ASSETS_BRANCH=${1:-master}
STATIC_ASSETS_VERSION=$(./build/current_version.sh)
STATIC_ASSETS_PATH="${BASE_PATH}/${STATIC_ASSETS_VERSION}"

source build/upgrade_utils.sh

build_custom_highlightjs() {
    echo "-----------------------------------------------------------------------------------"
    echo "Cloning higlightjs repo at branch: $STATIC_ASSETS_BRANCH..."
    echo "-----------------------------------------------------------------------------------"
    rm -rf ${REPO_SRC_DIR}
    git clone ${REPO_URL} --depth 1 --single-branch --branch ${STATIC_ASSETS_BRANCH} ${REPO_SRC_DIR} || return 1

    echo "-----------------------------------------------------------------------------------"
    echo "Building higlightjs for browser for languages ${HIGHLIGHTJS_LANGUAGES}..."
    echo "-----------------------------------------------------------------------------------"
    # Use subshell to execute the custom build to avoid having to keep track of the current working directory
    (cd ${REPO_SRC_DIR} && yarn install --frozen-lockfile && node tools/build -t browser ${HIGHLIGHTJS_LANGUAGES}) || return 1
}

process_highlightjs_assets() {
    echo "-----------------------------------------------------------------------------------"
    echo "Copying relevant files to third-party directory..."
    echo "-----------------------------------------------------------------------------------"
    cp -v ${REPO_SRC_DIR}/build/${HIGHLIGHTJS_DIST} ${STATIC_ASSETS_PATH}/highlight.min.js || return 1
    cp -v ${REPO_SRC_DIR}/src/styles/github.css ${STATIC_ASSETS_PATH} || return 1

    echo "-----------------------------------------------------------------------------------"
    echo "Minifying github.css with cssnano"
    echo "-----------------------------------------------------------------------------------"
    ./node_modules/.bin/cssnano ${STATIC_ASSETS_PATH}/github.css ${STATIC_ASSETS_PATH}/github.min.css || return 1
}

upgrade_highlightjs() {
    echo "Upgrading highlight.js to $STATIC_ASSETS_BRANCH";

    # Prepare target directory under third-party/text
    prepare_target_directory || return 1

    # Build highlightjs from the specified version
    build_custom_highlightjs || return 1

    # Copy over built assets to target directory
    process_highlightjs_assets || return 1

    # Bump highlightjs version in manifest.json
    bump_manifest_version || return 1

    # Cleanup highlightjs
    cleanup_repo || return 1

    echo "-----------------------------------------------------------------------------------"
    echo "Successfully upgraded highlightjs! 🚀"
    echo "-----------------------------------------------------------------------------------"
}

# Execute this entire script
if ! upgrade_highlightjs; then
    echo "----------------------------------------------------------------------"
    echo "Error while upgrading highlightjs to latest version!"
    echo "----------------------------------------------------------------------"

    echo "----------------------------------------------------------------------"
    echo "Clean workspace by deleting ${STATIC_ASSETS_PATH} and ${REPO_SRC_DIR}"
    echo "----------------------------------------------------------------------"
    exit 1
fi
