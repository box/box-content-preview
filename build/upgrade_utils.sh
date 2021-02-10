#!/bin/bash

bump_manifest_version() {
    echo "-----------------------------------------------------------------------------------"
    echo "Bumping $REPO_SRC_DIR version in manifest.json"
    echo "-----------------------------------------------------------------------------------"
    VERSION=$(cd $REPO_SRC_DIR && ../build/current_version.sh) || return 1

    echo "Bumping $REPO_SRC_DIR version to ${VERSION}"
    node build/updateManifest.js ${STATIC_ASSETS_VERSION} ${REPO_SRC_DIR} ${VERSION} ${STATIC_ASSETS_PATH}/manifest.json || return 1
}

cleanup_repo() {
    echo "-----------------------------------------------------------------------------------"
    echo "Cleaning up $REPO_SRC_DIR repo"
    echo "-----------------------------------------------------------------------------------"
    rm -rf ${REPO_SRC_DIR}
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
