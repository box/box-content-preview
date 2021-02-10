#!/bin/bash
# Run with specific depdnency and branch/tag (e.g. ./upgrade_dependency.sh [highlightjs|remarkable|papaparse] 10.6.0) or with no branch/tag argument to use master

BASE_PATH="src/third-party/text"
DEPENDENCY=${1}
STATIC_ASSETS_BRANCH=${2:-master}
STATIC_ASSETS_VERSION=$(./build/current_version.sh)
STATIC_ASSETS_PATH="${BASE_PATH}/${STATIC_ASSETS_VERSION}"

build_custom_highlightjs() {
    # TODO: This list of languages should be made more dynamic based on the file extensions Preview supports, see src/lib/extensions.js
    HIGHLIGHTJS_LANGUAGES="actionscript dos c cpp cmake csharp css diff erb groovy haml java javascript json less makefile ocaml php perl properties python ruby scss scala sml sql bash vim yaml"

    echo "-----------------------------------------------------------------------------------"
    echo "Cloning higlightjs repo at branch: $STATIC_ASSETS_BRANCH..."
    echo "-----------------------------------------------------------------------------------"
    rm -rf highlightjs
    git clone git@github.com:highlightjs/highlight.js.git --depth 1 --single-branch --branch ${STATIC_ASSETS_BRANCH} highlightjs || return 1

    echo "-----------------------------------------------------------------------------------"
    echo "Building higlightjs for browser for languages ${HIGHLIGHTJS_LANGUAGES}..."
    echo "-----------------------------------------------------------------------------------"
    # Use subshell to execute the custom build to avoid having to keep track of the current working directory
    (cd highlightjs && yarn install --frozen-lockfile && node tools/build -t browser ${HIGHLIGHTJS_LANGUAGES}) || return 1
}

build_papaparse() {
    echo "-----------------------------------------------------------------------------------"
    echo "Cloning papaparse repo at branch: $STATIC_ASSETS_BRANCH..."
    echo "-----------------------------------------------------------------------------------"
    rm -rf papaparse
    git clone git@github.com:mholt/PapaParse.git --depth 1 --single-branch --branch ${STATIC_ASSETS_BRANCH} || return 1
}

build_remarkable() {
    echo "-----------------------------------------------------------------------------------"
    echo "Cloning remarkable repo at branch: $STATIC_ASSETS_BRANCH..."
    echo "-----------------------------------------------------------------------------------"
    rm -rf remarkable
    git clone git@github.com:jonschlinkert/remarkable.git --depth 1 --single-branch --branch ${STATIC_ASSETS_BRANCH} || return 1

    echo "-----------------------------------------------------------------------------------"
    echo "Building remarkable..."
    echo "-----------------------------------------------------------------------------------"
    # Use subshell to execute the custom build to avoid having to keep track of the current working directory
    (cd remarkable && yarn install --frozen-lockfile && yarn build) || return 1
}

# bump_manifest_version <libname>
# where libname is the name of the third-party dependency in the manifest.json
bump_manifest_version() {
    echo "-----------------------------------------------------------------------------------"
    echo "Bumping $1 version in manifest.json"
    echo "-----------------------------------------------------------------------------------"
    VERSION=$(cd $1 && ../build/current_version.sh) || return 1

    echo "Bumping $1 version to $VERSION"
    node build/updateManifest.js ${STATIC_ASSETS_VERSION} $1 $VERSION ${STATIC_ASSETS_PATH}/manifest.json || return 1
}

# cleanup_repo <folder_name>
cleanup_repo() {
    if [ -z $1 ]; then
        echo "-----------------------------------------------------------------------------------"
        echo "No folder specified to clean up"
        echo "-----------------------------------------------------------------------------------"
        exit 1
    fi

    echo "-----------------------------------------------------------------------------------"
    echo "Cleaning up $1 repo"
    echo "-----------------------------------------------------------------------------------"
    rm -rf $1
}

validate_dependency() {
    if [ -z "$DEPENDENCY" ]; then
        echo "ERROR: Dependency is required [highlightjs|remarkable|papaparse]"
        echo "Usage: ./upgrade_dependency.sh [highlightjs|remarkable|papaparse] <version>"
        exit 1
    elif [ "$DEPENDENCY" != "highlightjs" ] && [ "$DEPENDENCY" != "remarkable" ] && [ "$DEPENDENCY" != "papaparse" ]; then
        echo "ERROR: Provided dependency \"$DEPENDENCY\" is not valid"
        exit 1
    fi
}

perform_upgrade() {
    case "$DEPENDENCY" in
    highlightjs)
        upgrade_highlightjs || return 1
        ;;
    remarkable)
        upgrade_remarkable || return 1
        ;;
    papaparse)
        upgrade_papaparse || return 1
        ;;
    esac
}

prepare_target_directory() {
    if [ ! -d $STATIC_ASSETS_PATH ]
    then
        echo "-----------------------------------------------------------------------------------"
        echo "Creating target directory at $STATIC_ASSETS_PATH..."
        echo "-----------------------------------------------------------------------------------"

        CURRENT_ASSETS_VERSIONS=`ls ${BASE_PATH} | sort -t "." -k1,1n -k2,2n -k3,3n | tail -1`

        echo "Using base version from $CURRENT_ASSETS_VERSIONS"
        mkdir -v ${STATIC_ASSETS_PATH}
        cp -pv ${BASE_PATH}/${CURRENT_ASSETS_VERSIONS}/* ${STATIC_ASSETS_PATH}/
    else
        echo "-----------------------------------------------------------------------------------"
        echo "Directory already exists at $STATIC_ASSETS_PATH, using it as is..."
        echo "-----------------------------------------------------------------------------------"
    fi
}

process_highlightjs_assets() {
    HIGHLIGHTJS_DIST="highlight.pack.js" # v10+ the dist file becomes highlight.min.js

    echo "-----------------------------------------------------------------------------------"
    echo "Copying relevant files to third-party directory..."
    echo "-----------------------------------------------------------------------------------"
    cp -v highlightjs/build/${HIGHLIGHTJS_DIST} ${STATIC_ASSETS_PATH}/highlight.min.js || return 1
    cp -v highlightjs/src/styles/github.css ${STATIC_ASSETS_PATH} || return 1

    echo "-----------------------------------------------------------------------------------"
    echo "Minifying github.css with cssnano"
    echo "-----------------------------------------------------------------------------------"
    ./node_modules/.bin/cssnano ${STATIC_ASSETS_PATH}/github.css ${STATIC_ASSETS_PATH}/github.min.css || return 1
}

process_papaparse_assets() {
    echo "-----------------------------------------------------------------------------------"
    echo "Copying relevant files to third-party directory..."
    echo "-----------------------------------------------------------------------------------"
    cp -v papaparse/papaparse.js ${STATIC_ASSETS_PATH} || return 1
    cp -v papaparse/papaparse.min.js ${STATIC_ASSETS_PATH} || return 1
}

process_remarkable_assets() {
    REMARKABLE_DIST="remarkable.min.js"

    echo "-----------------------------------------------------------------------------------"
    echo "Copying relevant files to third-party directory..."
    echo "-----------------------------------------------------------------------------------"
    cp -v remarkable/dist/${REMARKABLE_DIST} ${STATIC_ASSETS_PATH} || return 1
}

upgrade_dependency() {
    echo "-----------------------------------------------------------------------------------"
    echo "Beginning upgrade for $DEPENDENCY! 🚧"
    echo "-----------------------------------------------------------------------------------"

    # Validate which dependency is being upgraded
    validate_dependency || return 1

    # Prepare target directory under third-party/text
    prepare_target_directory || return 1

    # Perform the upgrade for the specified dependency
    perform_upgrade || return 1
}

upgrade_highlightjs() {
    echo "-----------------------------------------------------------------------------------"
    echo "Upgrading highlight.js to $STATIC_ASSETS_BRANCH"
    echo "-----------------------------------------------------------------------------------"

    # Build highlightjs from the specified version
    build_custom_highlightjs || return 1

    # Copy over built assets to target directory
    process_highlightjs_assets || return 1

    # Bump highlightjs version in manifest.json
    bump_manifest_version highlightjs || return 1

    # Cleanup highlightjs
    cleanup_repo highlightjs || return 1

    echo "-----------------------------------------------------------------------------------"
    echo "Successfully upgraded highlightjs! 🚀"
    echo "-----------------------------------------------------------------------------------"
}

upgrade_papaparse() {
    echo "-----------------------------------------------------------------------------------"
    echo "Upgrading papaparse to $STATIC_ASSETS_BRANCH"
    echo "-----------------------------------------------------------------------------------"

    # Clone papaparse from the specified version
    build_papaparse || return 1

    # Copy over built assets to target directory
    process_papaparse_assets || return 1

    # Bump papaparse version in manifest.json
    bump_manifest_version papaparse || return 1

    # Cleanup papaparse
    cleanup_repo papaparse || return 1

    echo "-----------------------------------------------------------------------------------"
    echo "Successfully upgraded papaparse! 🚀"
    echo "-----------------------------------------------------------------------------------"
}

upgrade_remarkable() {
    echo "-----------------------------------------------------------------------------------"
    echo "Upgrading remarkable to $STATIC_ASSETS_BRANCH"
    echo "-----------------------------------------------------------------------------------"

    # Build remarkable from the specified version
    build_remarkable || return 1

    # Copy over built assets to target directory
    process_remarkable_assets || return 1

    # Bump remarkable version in manifest.json
    bump_manifest_version remarkable || return 1

    # Cleanup remarkable
    cleanup_repo remarkable || return 1

    echo "-----------------------------------------------------------------------------------"
    echo "Successfully upgraded remarkable! 🚀"
    echo "-----------------------------------------------------------------------------------"
}

# Execute this entire script
if ! upgrade_dependency; then
    echo "----------------------------------------------------------------------"
    echo "Error while upgrading $DEPENDENCY to latest version!"
    echo "----------------------------------------------------------------------"

    echo "----------------------------------------------------------------------"
    echo "Clean workspace by deleting ${STATIC_ASSETS_PATH} and any cloned repo directory"
    echo "----------------------------------------------------------------------"
    exit 1
fi
