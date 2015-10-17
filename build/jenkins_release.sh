#!/bin/bash

export NODE_PATH=$NODE_PATH:./node_modules

increment_version_and_push() {
	if $major_release; then
		npm version major
	else
		npm version minor
	fi

	release_version=$(./build/current_version.sh)

	if git push origin master --tags; then
    echo "----------------------------------------------------"
		echo "Pushed version" $release_version "to git successfully"
    echo "----------------------------------------------------"
	else
    echo "----------------------------------------------------"
		echo "Error while pushing version" $release_version "to git"
    echo "----------------------------------------------------"
		exit 1
	fi
}

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
push_new_release() {
	git checkout master || exit 1
	git fetch origin || exit 1
	git reset --hard origin/master || exit 1
	sudo git clean -fdX || exit 1

	build_assets

	increment_version_and_push

	# Call the maven push script which will upload the release
	# artifact to maven
	if ! ./build/push_to_maven.sh; then
    echo "----------------------------------------------------"
		echo "Error in push_to_maven.sh."
    echo "----------------------------------------------------"
		exit 1
	fi
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
