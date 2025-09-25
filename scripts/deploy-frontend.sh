#!/bin/bash
# Piehands CRM Frontend Deployment Script
# Deploys the React frontend to Firebase Hosting

# --- Configuration ---
PROJECT_ID="agent-growth-and-ops"
BACKEND_SERVICE_NAME="crm-backend"
REGION="us-central1"
FIREBASE_SITE_NAME="piehands-crm-app" # From firebase.json

# --- Script Start ---
set -e # Exit immediately if a command exits with a non-zero status.

echo "🚀 Piehands CRM Frontend Deployment Script"
echo "=========================================="
echo "📋 Target Project: $PROJECT_ID"
echo "🔥 Firebase Site: $FIREBASE_SITE_NAME"
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

# 2. Build the React application with the backend URL
echo "📦 Building React application..."
cd frontend

# Create a temporary .env.production file for the build
echo "VITE_API_BASE_URL=$BACKEND_URL" > .env.production
echo "🔧 Created .env.production with backend URL."

npm run build

# Clean up the temporary env file
rm .env.production
echo "🗑️ Removed temporary .env.production file."

# 3. Deploy to Firebase Hosting
echo "🔼 Deploying to Firebase Hosting..."
# The --only flag targets the specific site defined in firebase.json
firebase deploy --only hosting:$FIREBASE_SITE_NAME --project "$PROJECT_ID"

cd ..
echo ""
echo "✅ Frontend deployment to Firebase Hosting successful!"
echo "🌍 Live URL: https://$FIREBASE_SITE_NAME.web.app"
echo ""
# --- End of Script ---
