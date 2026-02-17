#!/usr/bin/env sh
set -e

# Build static site (no BASE_PATH — deploying to root of tzeusy.github.io)
bun run build

# Navigate into the build output directory
cd out

git init
git add -A
git commit -m 'deploy'

# Force-push to the GitHub Pages user repo
git push -f git@github.com:Tzeusy/tzeusy.github.io.git master

cd -
