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

if ! build_assets; then
  echo "----------------------------------------------------"
  echo "Error: failure in build_pull_request"
  echo "----------------------------------------------------"
  exit 1
fi
