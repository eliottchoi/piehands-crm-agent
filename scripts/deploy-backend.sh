#!/bin/bash
# Piehands CRM Backend Deployment Script
# Deploys the NestJS backend to Google Cloud Run
# Based on CLAUDE.md rules for M1/M2 Macs

# --- Configuration ---
PROJECT_ID="agent-growth-and-ops"
REGION="us-central1"
SERVICE_NAME="crm-backend"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"
SOURCE_DIR="./backend"

# --- Script Start ---
set -e # Exit immediately if a command exits with a non-zero status.

echo "🚀 Piehands CRM Backend Deployment Script"
echo "=========================================="
echo "📋 Project: $PROJECT_ID"
echo "🌍 Region: $REGION"
echo "🚀 Service: $SERVICE_NAME"
echo ""

# 1. Build the Docker image for linux/amd64
echo "🐳 Building Docker image for linux/amd64 architecture..."
(cd "$SOURCE_DIR" && docker build --platform linux/amd64 -t "$IMAGE_NAME:latest" .)

# 2. Verify architecture (optional but recommended)
ARCH=$(docker image inspect "$IMAGE_NAME:latest" --format='{{.Architecture}}')
echo "✅ Image built with architecture: $ARCH"
if [ "$ARCH" != "amd64" ]; then
    echo "❌ Error: Image was not built for amd64. Aborting deployment."
    exit 1
fi

# 3. Push the image to Google Container Registry
echo "📤 Pushing image to GCR..."
docker push "$IMAGE_NAME:latest"

# 4. Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."

DB_INSTANCE_NAME=$(gcloud sql instances describe crm-database --project="$PROJECT_ID" --format="value(connectionName)")
if [ -z "$DB_INSTANCE_NAME" ]; then
    echo "❌ Error: Could not retrieve database instance connection name for 'crm-database'."
    exit 1
fi
echo "🔗 Connecting to Cloud SQL instance: $DB_INSTANCE_NAME"

gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE_NAME:latest" \
  --platform "managed" \
  --region "$REGION" \
  --allow-unauthenticated \
  --service-account "piehands-crm-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --add-cloudsql-instances "$DB_INSTANCE_NAME" \
  --set-secrets="DATABASE_URL=CRM_DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest,SENDGRID_API_KEY=SENDGRID_API_KEY:latest,SENDGRID_FROM_EMAIL=SENDGRID_FROM_EMAIL:latest,SENDGRID_FROM_NAME=SENDGRID_FROM_NAME:latest" \
  --project="$PROJECT_ID"

echo "✅ Deployment successful!"
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --platform "managed" --region "$REGION" --project="$PROJECT_ID" --format "value(status.url)")
echo "🔗 Service URL: $SERVICE_URL"

# 5. Ensure traffic is directed to the latest revision
echo "🔄 Verifying traffic split..."
gcloud run services update-traffic "$SERVICE_NAME" --to-latest --region="$REGION" --project="$PROJECT_ID"

echo "🎉 Deployment fully completed and traffic routed to the new revision."
# --- End of Script ---
