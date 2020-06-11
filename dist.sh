#!/usr/bin/env bash

npm run dist
cd build/release; npm publish --access public; cd ../..
git push;

if test -f "../update.sh"; then
    cd ..; source ./update.sh; cd kona
fi