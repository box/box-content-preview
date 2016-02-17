#!/bin/bash

export NODE_PATH=$NODE_PATH:./node_modules


# Asset package name
KIND="content-experience-assets"


# The current version being built
VERSION=$(./build/current_version.sh)


# The static asset path where deploy needs to happen
installDir="/box/www/content-experience-assets"


# Temp directory
rpmDir="/tmp"


# RPM name
rpm="$KIND-$VERSION.noarch.rpm"


# Major, minor, or patch release
major_release=false
minor_release=false


# Maven info
MAVEN="maven-vip.dev.box.net"
MAVEN_PORT="8150"
MAVEN_PATH="nexus/content/repositories"
MAVEN_URL="http://$MAVEN:$MAVEN_PORT/$MAVEN_PATH"
publishURL="$MAVEN_URL/releases/net/box/$KIND/$VERSION/$rpm"
credentialsFile="/home/jenkins/.ivy2/boxmaven.credentials"
[ -r "$credentialsFile" ] || (echo "Error: maven credentials file not found" && exit 1)
mavenUser=$(grep '^user=' $credentialsFile | sed 's/^user=//')
mavenPassword=$(grep '^password=' $credentialsFile | sed 's/^password=//')



increment_version() {
    if $major_release; then
        echo "----------------------------------------------------"
        echo "Bumping major version..."
        echo "----------------------------------------------------"
        npm version major
    elif $minor_release; then
        echo "----------------------------------------------------"
        echo "Bumping minor version..."
        echo "----------------------------------------------------"
        npm version minor
    else
        echo "----------------------------------------------------"
        echo "Bumping patch version..."
        echo "----------------------------------------------------"
        npm version patch
    fi
}


push_to_github() {
    new_version=$(./build/current_version.sh)
    git commit -am $new_version
    
    echo "----------------------------------------------------"
    echo "Master version is now at" $new_version
    echo "----------------------------------------------------"

    if git push origin master --tags; then
        echo "----------------------------------------------------"
        echo "Pushed version" $new_version "to git successfully"
        echo "----------------------------------------------------"
    else
        echo "----------------------------------------------------"
        echo "Error while pushing version" $new_version "to git"
        echo "----------------------------------------------------"
        exit 1
    fi
}


push_to_maven() {

    echo "----------------------------------------------------"
    echo "Starting a Maven push for" $KIND-$VERSION
    echo "----------------------------------------------------"

    shopt -s dotglob

    [ -e "$KIND-$VERSION" ] || ln -s . "$KIND-$VERSION" # For the rpm prefix

    # Tar all non-hidden files and directories
    cd dist
    fpm -s dir -t rpm --prefix $installDir --rpm-os linux --architecture all --package $rpmDir/$rpm --directories . --name "$KIND-$VERSION" --version $VERSION --rpm-user box --rpm-group box --rpm-compression none --description 'content experience assets bundle' .
    cd ..
    status=$(curl -s -o /dev/null -w %{http_code} -X POST -u $mavenUser:$mavenPassword -T $rpmDir/$rpm $publishURL)

    echo "----------------------------------------------------"
    echo "Status of Maven push: $status"
    echo "----------------------------------------------------"

    rm $rpmDir/$rpm || exit 1
    rm $KIND-$VERSION || exit 1
}


# Clean node modules, re-install dependencies, and build assets
build_assets() {

    echo "---------------------------------------------------------------------------------------------------------------------------"
    echo "Installing node modules from http://maven-vip.dev.box.net:8150/nexus/content/groups/npm-all/ OR https://registry.npmjs.org"
    echo "---------------------------------------------------------------------------------------------------------------------------"
    if npm install; then
        echo "----------------------------------------------------"
        echo "Installed node modules."
        echo "----------------------------------------------------"
    else
        echo "-------------------------------------------------------------"
        echo "Installing node modules from https://registry.nodejitsu.com"
        echo "-------------------------------------------------------------"
        if npm install --registry https://registry.nodejitsu.com; then
            echo "----------------------------------------------------"
            echo "Installed node modules."
            echo "----------------------------------------------------"
        else
            echo "--------------------------------------------------------------"
            echo "Installing node modules from http://registry.cnpmjs.org"
            echo "--------------------------------------------------------------"
            if npm install --registry http://registry.cnpmjs.org; then
                echo "----------------------------------------------------"
                echo "Installed node modules."
                echo "----------------------------------------------------"
            else
                echo "----------------------------------------------------"
                echo "Failed to install node modules!"
                echo "----------------------------------------------------"
                exit 1;
            fi
        fi
    fi


    echo "----------------------------------------------------"
    echo "Starting release build for version" $VERSION
    echo "----------------------------------------------------"

    if npm run build; then
        echo "----------------------------------------------------"
        echo "Built release assets for version" $VERSION
        echo "----------------------------------------------------"
    else
        echo "----------------------------------------------------"
        echo "Failed to build release assets!"
        echo "----------------------------------------------------"
        exit 1;
    fi
}


# Check out latest code from git, build assets, increment version, and push t
push_new_release() {
    git checkout master || exit 1
    git fetch origin || exit 1
    git reset --hard origin/master || exit 1
    sudo git clean -fdX || exit 1

    increment_version
    build_assets

    # Pushes artifact to maven
    if ! push_to_maven; then
        echo "----------------------------------------------------"
        echo "Error in push_to_maven.sh!"
        echo "----------------------------------------------------"
        exit 1
    fi

    # Finally push to github
    push_to_github
}


# Check if we are doing major, minor, or patch release
while getopts "em" opt; do
    case "$opt" in
        m)
        major_release=true
        ;;
        n)
        minor_release=true
        ;;
    esac
done


# Execute this entire script
if ! push_new_release; then
  echo "----------------------------------------------------"
  echo "Error: failure in push_new_release!"
  echo "----------------------------------------------------"
  exit 1
fi
