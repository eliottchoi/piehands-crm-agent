#!/bin/bash
set -e

# This script runs all setup scripts in order.
# Ensure you have authenticated with gcloud and have the correct project set.

# Configuration
export PROJECT_ID="agent-growth-and-ops"

echo "🚀🚀🚀 Starting Complete Piehands CRM Setup 🚀🚀🚀"
echo "============================================="
echo "Project: $PROJECT_ID"
echo "============================================="
echo ""

# Set the project for all subsequent gcloud commands
gcloud config set project "$PROJECT_ID"

# Step 1: Set up the database
echo "--- Step 1: Setting up Database ---"
./scripts/setup-database.sh
echo "✅ Database setup complete."
echo ""

# Step 2: Set up secrets
echo "--- Step 2: Setting up Secrets ---"
./scripts/setup-secrets.sh
echo "✅ Secrets setup complete."
echo ""

# Step 3: Set up necessary IAM permissions for service accounts
echo "--- Step 3: Setting up IAM Permissions ---"
RUNTIME_SA="crm-runtime-sa@${PROJECT_ID}.iam.gserviceaccount.com"
GCLOUD_USER=$(gcloud config get-value account)

echo "🔑 Granting Cloud SQL Client role to Runtime SA..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$RUNTIME_SA" \
    --role="roles/cloudsql.client"

echo "🔑 Granting Service Account User role to deploying user ($GCLOUD_USER)..."
gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" \
    --member="user:$GCLOUD_USER" \
    --role="roles/iam.serviceAccountUser"

echo "✅ IAM permissions set."
echo ""


echo "🎉🎉🎉 COMPLETE SETUP FINISHED! 🎉🎉🎉"
echo ""
echo "You are now ready to deploy the application."
echo "Run the following scripts:"
echo "1. ./scripts/deploy-backend.sh"
echo "2. ./scripts/deploy-frontend.sh"
echo ""
