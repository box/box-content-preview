#!/bin/bash

export NODE_PATH=$NODE_PATH:./node_modules

increment_version_and_push() {
  
  current_version=$(./build/current_version.sh)
  tag_version="v$current_version"
  echo "----------------------------------------------------"
  echo "Release version is" $current_version
  echo "Tagging version" $tag_version
  echo "----------------------------------------------------"  
  git tag -a $tag_version -m $tag_version

  echo "----------------------------------------------------"
  echo "Bumping master version..."
  echo "----------------------------------------------------"  
  if $major_release; then
    npm version major --no-git-tag-version
  else
    npm version minor --no-git-tag-version
  fi

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

# Clean node modules, re-install dependencies, and build assets
build_assets() {
  
  echo "----------------------------------------------------"
  echo "Nuking node modules!"
  echo "----------------------------------------------------"  
  rm -rf node_modules
  rm -rf .npm

  echo "----------------------------------------------------"
  echo "Installing node modules..."
  echo "----------------------------------------------------"  
  if npm install; then
    echo "----------------------------------------------------"
    echo "Installed node modules."
    echo "----------------------------------------------------"
  else
    echo "----------------------------------------------------"
    echo "Failed to install node modules!"
    echo "----------------------------------------------------"
    exit 1;
  fi

  release_version=$(./build/current_version.sh)

  echo "----------------------------------------------------"
  echo "Starting release build for version" $release_version
  echo "----------------------------------------------------"

  if npm run release; then
    echo "----------------------------------------------------"
    echo "Built release assets for version" $release_version
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

  build_assets

  # Call the maven push script which will upload the release
  # artifact to maven
  if ! ./build/push_to_maven.sh; then
    echo "----------------------------------------------------"
    echo "Error in push_to_maven.sh."
    echo "----------------------------------------------------"
    exit 1
  fi

  # Finally Bump up the version and push to github
  increment_version_and_push
}

# Push new release
major_release=false
while getopts "em" opt; do
  case "$opt" in
    m)
    major_release=true
    ;;
  esac
done
if ! push_new_release; then
  echo "----------------------------------------------------"
  echo "Error: failure in push_new_release"
  echo "----------------------------------------------------"
  exit 1
fi
