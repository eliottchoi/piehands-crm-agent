#!/bin/bash
# Piehands CRM Frontend Deployment Script
# Deploys the React frontend to Vercel

# --- Configuration ---
PROJECT_ID="agent-growth-and-ops"
BACKEND_SERVICE_NAME="crm-backend"
REGION="us-central1"

# --- Script Start ---
set -e # Exit immediately if a command exits with a non-zero status.

echo "🚀 Piehands CRM Frontend Deployment Script"
echo "=========================================="
echo "📋 Target Project: $PROJECT_ID"
echo ""

# 1. Fetch Backend URL from Cloud Run
echo "🔗 Fetching backend URL from Cloud Run..."
BACKEND_URL=$(gcloud run services describe "$BACKEND_SERVICE_NAME" --platform "managed" --region "$REGION" --project "$PROJECT_ID" --format "value(status.url)")

if [ -z "$BACKEND_URL" ]; then
    echo "❌ Error: Could not retrieve backend service URL."
    echo "Please ensure the backend is deployed successfully first."
    exit 1
fi

echo "✅ Backend URL found: $BACKEND_URL"
echo ""

# 2. Deploy to Vercel
echo "🔼 Deploying to Vercel..."
cd frontend

# Set the backend URL as a Vercel environment variable for the production build
export VITE_API_BASE_URL="$BACKEND_URL"

# Deploy to production and pipe the output URL to the clipboard
# The --prod flag creates a production deployment.
# Vercel CLI will automatically build and deploy the project.
vercel --prod --build-env VITE_API_BASE_URL="$BACKEND_URL"

# The vercel command will output the deployment URL.
# If you need to capture it for scripting:
# DEPLOYMENT_URL=$(vercel --prod --build-env VITE_API_BASE_URL="$BACKEND_URL")
# echo "Deployment URL: $DEPLOYMENT_URL"

echo ""
echo "✅ Frontend deployment process initiated with Vercel."
echo "🌍 Monitor the deployment status in your Vercel dashboard."
echo ""

# --- End of Script ---
