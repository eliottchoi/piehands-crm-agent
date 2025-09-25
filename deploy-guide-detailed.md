#!/bin/bash
set -e

echo "🚀 Piehands CRM Backend Deployment Script"
echo "=========================================="

# Configuration - Explicitly named for multi-agent environment
PROJECT_ID="piehands-agents"
REGION="us-central1"
SERVICE_NAME="crm-backend"
DB_INSTANCE="crm-database-prod"
RUNTIME_SA="crm-runtime-sa"

echo "📋 Project: $PROJECT_ID"
echo "🌍 Region: $REGION" 
echo "🚀 Service: $SERVICE_NAME"
echo ""

# Step 1: Build and push Docker image
echo "🐳 Building Docker image..."
cd backend

gcloud auth configure-docker --quiet

echo "📦 Building container..."
docker build -t gcr.io/$PROJECT_ID/$SERVICE_NAME:latest .

echo "📤 Pushing to Container Registry..."
docker push gcr.io/$PROJECT_ID/$SERVICE_NAME:latest

# Step 2: Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image=gcr.io/$PROJECT_ID/$SERVICE_NAME:latest \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=4Gi \
  --cpu=2 \
  --max-instances=10 \
  --min-instances=1 \
  --timeout=900 \
  --concurrency=100 \
  --set-env-vars="NODE_ENV=production,PORT=8080" \
  --set-secrets="DATABASE_URL=CRM_DATABASE_URL:latest,SENDGRID_API_KEY=SENDGRID_API_KEY:latest,SENDGRID_FROM_EMAIL=SENDGRID_FROM_EMAIL:latest,SENDGRID_FROM_NAME=SENDGRID_FROM_NAME:latest,JWT_SECRET=JWT_SECRET:latest" \
  --add-cloudsql-instances="$PROJECT_ID:$REGION:$DB_INSTANCE" \
  --service-account="crm-runtime-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --quiet

# Step 3: Get deployment URL
BACKEND_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')

echo ""
echo "🎉 Backend deployment complete!"
echo "🔗 Backend URL: $BACKEND_URL"
echo "🏥 Health check: $BACKEND_URL/health"
echo ""

# Step 4: Test health endpoint
echo "🏥 Testing health endpoint..."
curl -f "$BACKEND_URL/health" && echo "✅ Health check passed!" || echo "❌ Health check failed!"

echo ""
echo "🎯 Next steps:"
echo "1. Test email sending: curl -X POST '$BACKEND_URL/campaigns/send?workspaceId=ws_piehands' -H 'Content-Type: application/json' -d '{\"templateId\":\"tmpl_welcome\",\"targetGroup\":\"ALL_USERS\"}'"
echo "2. Deploy frontend with: ./scripts/deploy-frontend.sh"
echo ""
