#!/bin/bash

# Sync the demo folder and contents of the dist folder
rsync -avz --delete -v --exclude='.*' "demo" "dist/." "${USER}@${USER}.dev.box.net:/box/www/assets/content-experience"

if test $? -ne 0 ; then
    echo "Folder sync failed"
    echo ""
    exit 1
fi