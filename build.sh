#!/bin/bash

# Build script for RMS Frontend
# Usage: ./build.sh [tag]

set -e

# Default tag
TAG=${1:-latest}
IMAGE_NAME="thanhkt/rms-fe"

echo "Building ${IMAGE_NAME}:${TAG}..."

# Load environment variables from .env.production if it exists
if [ -f ".env.production" ]; then
    echo "Loading environment variables from .env.production..."
    source .env.production
fi

# Validate required environment variables
required_vars=(
    "NEXT_PUBLIC_BACKEND_URL"
    "NEXT_PUBLIC_API_URL" 
    "NEXT_PUBLIC_WS_URL"
    "JWT_SECRET"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "Error: $var is not set. Please set it in .env.production or as an environment variable."
        exit 1
    fi
done

echo "Using configuration:"
echo "  NEXT_PUBLIC_BACKEND_URL: ${NEXT_PUBLIC_BACKEND_URL}"
echo "  NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}"
echo "  NEXT_PUBLIC_WS_URL: ${NEXT_PUBLIC_WS_URL}"

# Build with all required build args
docker build \
    --target production \
    --build-arg NODE_ENV=production \
    --build-arg NEXT_PUBLIC_BACKEND_URL="${NEXT_PUBLIC_BACKEND_URL}" \
    --build-arg NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL}" \
    --build-arg NEXT_PUBLIC_WS_URL="${NEXT_PUBLIC_WS_URL}" \
    --build-arg NEXT_PUBLIC_APP_ENV=production \
    --build-arg JWT_SECRET="${JWT_SECRET}" \
    -f Dockerfile.production \
    -t "${IMAGE_NAME}:${TAG}" \
    .

echo "Build completed: ${IMAGE_NAME}:${TAG}"
echo ""
echo "To run with docker-compose:"
echo "docker-compose up -d"
echo ""
echo "To run standalone:"
echo "docker run --env-file .env.production -p 3000:3000 ${IMAGE_NAME}:${TAG}"
