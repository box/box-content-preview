#!/bin/bash

# The remote, Box VM path that we will pull files out of.
remoteroot="${USER}@${USER}.dev.box.net:/box/www/assets/content-experience"

# The local root where remote Box VM files will be synchronized into.
localroot='./dist'

rsync -avz --delete --exclude='.*' "${localroot}/." "${remoteroot}/."
if test $? -ne 0 ; then
    echo "Folder sync failed"
    echo ""
    exit 1
fi