#!/bin/bash
# Piehands CRM Backend Deployment Script
# Deploys the NestJS backend to Google Cloud Run

# --- Configuration ---
PROJECT_ID="agent-growth-and-ops"
REGION="us-central1"
SERVICE_NAME="crm-backend"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"
SOURCE_DIR="./backend" # Directory containing the Dockerfile and source

# --- Script Start ---
set -e # Exit immediately if a command exits with a non-zero status.

echo "🚀 Piehands CRM Backend Deployment Script"
echo "=========================================="
echo "📋 Project: $PROJECT_ID"
echo "🌍 Region: $REGION"
echo "🚀 Service: $SERVICE_NAME"
echo ""

# 1. Build the Docker image
echo "🐳 Building Docker image..."
(cd "$SOURCE_DIR" && gcloud builds submit --tag "$IMAGE_NAME")

# 2. Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."

# --- Cloud Run Deployment Flags ---
# --allow-unauthenticated: Allows public access to the service. Remove if you want to restrict access.
# --platform managed: Use the fully managed Cloud Run environment.
# --region: The GCP region where the service will be deployed.
# --service-account: The service account the revision runs as.
# --set-env-vars: Set environment variables for the service.
#    - DATABASE_URL: The connection string for the Cloud SQL database.
#    - NODE_ENV: Set to 'production' for performance.
#    - JWT_SECRET: Secret key for signing JWTs.
#    - REDIS_URL: Connection string for Redis instance (if used).
#    - GOOGLE_APPLICATION_CREDENTIALS: Path to service account key file (usually handled by Cloud Run environment).
# --add-cloudsql-instances: Connect the service to a Cloud SQL instance.

# Fetch the latest database connection name
DB_INSTANCE_NAME=$(gcloud sql instances describe crm-database --project="$PROJECT_ID" --format="value(connectionName)")

if [ -z "$DB_INSTANCE_NAME" ]; then
    echo "❌ Error: Could not retrieve database instance connection name."
    exit 1
fi

echo "🔗 Connecting to Cloud SQL instance: $DB_INSTANCE_NAME"

gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE_NAME" \
  --platform "managed" \
  --region "$REGION" \
  --allow-unauthenticated \
  --service-account "crm-runtime-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --add-cloudsql-instances "$DB_INSTANCE_NAME" \
  --set-secrets="DATABASE_URL=CRM_DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest,SENDGRID_API_KEY=SENDGRID_API_KEY:latest" \
  --project="$PROJECT_ID"

echo "✅ Deployment successful!"
echo "🔗 Service URL: $(gcloud run services describe "$SERVICE_NAME" --platform "managed" --region "$REGION" --project="$PROJECT_ID" --format "value(status.url)")"

# --- End of Script ---
