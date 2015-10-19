#!/bin/bash

declare KIND="content-experience-assets"
declare VERSION=$(./build/current_version.sh)
declare installDir="/box/www/content-experience-assets"
declare rpmDir="/tmp"
# DM looks specifically for artifacts with filenames of the following form:
declare rpm="$KIND-$VERSION.noarch.rpm"
declare snapshotsOrReleases=
case "${VERSION##*-}" in
  SNAPSHOT) snapshotsOrReleases="snapshots" ;;
  *) snapshotsOrReleases="releases" ;;
esac

declare MAVEN="maven-vip.dev.box.net"
declare MAVEN_PORT="8150"
declare MAVEN_PATH="nexus/content/repositories"
declare MAVEN_URL="http://$MAVEN:$MAVEN_PORT/$MAVEN_PATH"
declare publishURL="$MAVEN_URL/$snapshotsOrReleases/net/box/$KIND/$VERSION/$rpm"

# Grab Maven credentials from secure file
credentialsFile="/home/jenkins/.ivy2/boxmaven.credentials"
[ -r "$credentialsFile" ] || (echo "Error: maven credentials file not found" && exit 1)
mavenUser=$(grep '^user=' $credentialsFile | sed 's/^user=//')
mavenPassword=$(grep '^password=' $credentialsFile | sed 's/^password=//')

shopt -s dotglob

[ -e "$KIND-$VERSION" ] || ln -s . "$KIND-$VERSION" # For the rpm prefix

# Tar all non-hidden files and directories
mv dist $VERSION
mkdir dist
mv $VERSION dist/
cd dist
fpm -s dir -t rpm --prefix $installDir --rpm-os linux --architecture all --package $rpmDir/$rpm --directories . --name $KIND --version $VERSION --rpm-user box --rpm-group box --rpm-compression none --description 'content experience assets bundle' .
cd ..
status=$(curl -s -o /dev/null -w %{http_code} -X POST -u $mavenUser:$mavenPassword -T $rpmDir/$rpm $publishURL)

echo "Status of Maven push: $status"

rm $rpmDir/$rpm || exit 1
rm $KIND-$VERSION || exit 1
