#!/bin/bash

# Docker deployment script for Bulaksumur Bot
# Usage: ./docker-deploy.sh

set -e

echo "🚀 Starting Docker deployment for Bulaksumur Bot..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with your environment variables:"
    echo "BOT_TOKEN=your_bot_token"
    echo "FIREBASE_PROJECT_ID=your_project_id"
    echo "FIREBASE_PRIVATE_KEY=your_private_key"
    echo "FIREBASE_CLIENT_EMAIL=your_client_email"
    exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Stop and remove existing container if it exists
echo "🛑 Stopping existing container..."
docker-compose down --remove-orphans || true

# Remove old images to free up space
echo "🧹 Cleaning up old images..."
docker image prune -f || true

# Build and start the container
echo "🔨 Building and starting container..."
docker-compose up -d --build

# Wait for container to be healthy
echo "⏳ Waiting for container to be healthy..."
timeout=60
counter=0
while [ $counter -lt $timeout ]; do
    if docker-compose ps | grep -q "healthy"; then
        echo "✅ Container is healthy!"
        break
    fi
    echo "⏳ Waiting... ($counter/$timeout)"
    sleep 5
    counter=$((counter + 5))
done

if [ $counter -eq $timeout ]; then
    echo "⚠️  Container health check timeout, but continuing..."
fi

# Show container status
echo "📊 Container status:"
docker-compose ps

# Show logs
echo "📋 Recent logs:"
docker-compose logs --tail=20

echo "🎉 Deployment completed successfully!"
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down"
