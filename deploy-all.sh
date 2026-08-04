#!/bin/bash

# Ocean All-in-One Deployment Script
# Targets: getocean.dev (Website) and docs.getocean.dev (Documentation)

echo "------------------------------------------------"
echo "[INFO] Starting Global Deployment..."
echo "------------------------------------------------"

# Check for Firebase CLI
if ! command -v firebase &> /dev/null
then
    echo "[ERROR] Firebase CLI not found."
    echo "Please install it using: npm install -g firebase-tools"
    exit 1
fi

# 1. Deploy Website
echo ""
echo "[PROCESS] Deploying Main Website (getocean.dev)..."
cd website || exit
firebase deploy --only hosting
if [ $? -ne 0 ]; then
    echo "[ERROR] Website deployment failed."
    exit 1
fi
cd ..

# 2. Deploy Documentation
echo ""
echo "[PROCESS] Deploying Documentation (docs.getocean.dev)..."
cd ocean-doc || exit
firebase deploy --only hosting:docs
if [ $? -ne 0 ]; then
    echo "[ERROR] Documentation deployment failed."
    exit 1
fi
cd ..

echo ""
echo "------------------------------------------------"
echo "[SUCCESS] Global Deployment Complete!"
echo "Website: https://getocean.dev"
echo "Docs:    https://docs.getocean.dev"
echo "------------------------------------------------"
