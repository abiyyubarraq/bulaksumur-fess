#!/bin/bash

echo "🚀 Starting manual deployment process..."

# Navigate to the project directory (adjust path if needed)
cd /opt/bulaksumur-bot

echo "📥 Pulling latest changes from GitHub..."
git pull origin main

if [ $? -eq 0 ]; then
    echo "✅ Git pull successful"
else
    echo "❌ Git pull failed"
    exit 1
fi

echo "🔄 Running Docker deployment..."
bash docker-deploy.sh

echo "🎉 Manual deployment completed!"
