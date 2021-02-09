#!/bin/bash
# Run with specific branch/tag (e.g. ./upgrade_highlightjs.sh 10.6.0) or with no arguments to use master

# TODO: This list of languages should be made more dynamic based on the file extensions Preview supports, see src/lib/extensions.js
HIGHLIGHTJS_DIST="highlight.pack.js"
HIGHLIGHTJS_LANGUAGES="actionscript dos c cpp cmake csharp css diff erb groovy haml java javascript json less makefile ocaml php perl properties python ruby scss scala sml sql bash vim yaml"
HIGHLIGHTJS_SRC_DIR="highlightjs"
TEXT_BASE_PATH="src/third-party/text"
TEXT_STATIC_ASSETS_BRANCH=${1:-master}
TEXT_STATIC_ASSETS_VERSION=$(./build/current_version.sh)
TEXT_STATIC_ASSETS_PATH="${TEXT_BASE_PATH}/${TEXT_STATIC_ASSETS_VERSION}"

build_custom_highlightjs() {
    echo "-----------------------------------------------------------------------------------"
    echo "Cloning higlightjs repo at branch: $TEXT_STATIC_ASSETS_BRANCH..."
    echo "-----------------------------------------------------------------------------------"
    rm -rf ${HIGHLIGHTJS_SRC_DIR}
    git clone git@github.com:highlightjs/highlight.js.git --depth 1 --single-branch --branch ${TEXT_STATIC_ASSETS_BRANCH} ${HIGHLIGHTJS_SRC_DIR} || return 1

    echo "-----------------------------------------------------------------------------------"
    echo "Building higlightjs for browser for languages ${HIGHLIGHTJS_LANGUAGES}..."
    echo "-----------------------------------------------------------------------------------"
    # Use subshell to execute the custom build to avoid having to keep track of the current working directory
    (cd ${HIGHLIGHTJS_SRC_DIR} && yarn install --frozen-lockfile && node tools/build -t browser ${HIGHLIGHTJS_LANGUAGES}) || return 1
}

bump_highlightjs_version() {
    echo "-----------------------------------------------------------------------------------"
    echo "Bumping highlightjs version in package.json thirdparty-dependencies"
    echo "-----------------------------------------------------------------------------------"
    HIGHLIGHTJS_VERSION=$(cd ${HIGHLIGHTJS_SRC_DIR} && ../build/current_version.sh) || return 1

    echo "Bumping highlightjs version to ${HIGHLIGHTJS_VERSION}"
    sed -i '' "s/\(\"highlightjs\": \)\".*\"/\1\"${HIGHLIGHTJS_VERSION}\"/g" package.json
}

cleanup_custom_highlightjs() {
    echo "-----------------------------------------------------------------------------------"
    echo "Cleaning up highlightjs repo"
    echo "-----------------------------------------------------------------------------------"
    rm -rf ${HIGHLIGHTJS_SRC_DIR}
}

prepare_target_directory() {
    echo "-----------------------------------------------------------------------------------"
    echo "Creating target directory at $TEXT_STATIC_ASSETS_PATH..."
    echo "-----------------------------------------------------------------------------------"

    rm -rf ${TEXT_STATIC_ASSETS_PATH}
    TEXT_CURRENT_ASSETS_VERSIONS=`ls ${TEXT_BASE_PATH} | sort -t "." -k1,1n -k2,2n -k3,3n | tail -1`

    echo "Using base version from $TEXT_CURRENT_ASSETS_VERSIONS"
    mkdir -v ${TEXT_STATIC_ASSETS_PATH}
    cp -pv ${TEXT_BASE_PATH}/${TEXT_CURRENT_ASSETS_VERSIONS}/* ${TEXT_STATIC_ASSETS_PATH}/
}

process_highlightjs_assets() {
    echo "-----------------------------------------------------------------------------------"
    echo "Copying relevant files to third-party directory..."
    echo "-----------------------------------------------------------------------------------"
    cp -v ${HIGHLIGHTJS_SRC_DIR}/build/${HIGHLIGHTJS_DIST} ${TEXT_STATIC_ASSETS_PATH}/highlight.min.js || return 1
    cp -v ${HIGHLIGHTJS_SRC_DIR}/src/styles/github.css ${TEXT_STATIC_ASSETS_PATH} || return 1

    echo "-----------------------------------------------------------------------------------"
    echo "Minifying github.css with cssnano"
    echo "-----------------------------------------------------------------------------------"
    ./node_modules/.bin/cssnano ${TEXT_STATIC_ASSETS_PATH}/github.css ${TEXT_STATIC_ASSETS_PATH}/github.min.css || return 1
}

upgrade_highlightjs() {
    echo "Upgrading highlight.js to $TEXT_STATIC_ASSETS_BRANCH";

    # Prepare target directory under third-party/text
    prepare_target_directory || return 1

    # Build highlightjs from the specified version
    build_custom_highlightjs || return 1

    # Copy over built assets to target directory
    process_highlightjs_assets || return 1

    # Bump highlightjs version in package.json thirdparty-dependencies
    bump_highlightjs_version || return 1

    # Cleanup highlightjs
    cleanup_custom_highlightjs || return 1

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
    echo "Clean workspace by deleting ${TEXT_STATIC_ASSETS_PATH} and ${HIGHLIGHTJS_SRC_DIR}"
    echo "----------------------------------------------------------------------"
    exit 1
fi
