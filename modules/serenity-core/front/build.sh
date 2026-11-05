#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

mkdir -p output

echo "Building Serenity-Ops Frontend..."

if command -v docker &> /dev/null && docker info &> /dev/null; then
    DOCKER_BUILDKIT=1 docker build --target export --output type=local,dest=output .
else
    cd app
    npm install
    npm run build
    rm -rf ../output/*
    cp -r dist/* ../output/
    cd ..
fi

echo "Build complete in front/output/:"
ls -la output/
