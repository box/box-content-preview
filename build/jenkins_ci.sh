#!/bin/bash

export NODE_PATH=$NODE_PATH:./node_modules

# Clean node modules, re-install dependencies, and build assets
build_assets() {
  rm -rf node_modules

  if npm install; then
    echo "----------------------------------------------------"
    echo "Installed node modules"
    echo "----------------------------------------------------"
  else
    echo "----------------------------------------------------"
    echo "Failed to install node modules!"
    echo "----------------------------------------------------"
    exit 1;
  fi

  if npm run release; then
    echo "----------------------------------------------------"
    echo "Built release assets"
    echo "----------------------------------------------------"
  else
    echo "----------------------------------------------------"
    echo "Failed to build release assets!"
    echo "----------------------------------------------------"
    exit 1;
  fi
}

# Check out latest code from git, build assets, increment version, and push t
build_pull_request() {
  git checkout master || exit 1
  git fetch origin || exit 1
  git reset --hard origin/master || exit 1
  sudo git clean -fdX || exit 1

  build_assets
}

if ! build_pull_request; then
  echo "----------------------------------------------------"
  echo "Error: failure in build_pull_request"
  echo "----------------------------------------------------"
  exit 1
fi
