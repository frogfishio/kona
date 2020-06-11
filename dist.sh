#!/usr/bin/env bash

npm run dist
cd build/release; npm publish --access public; cd ../..

if test -f "../update.sh"; then
    source ../update.sh
fi