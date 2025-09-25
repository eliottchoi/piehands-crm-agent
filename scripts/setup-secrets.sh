#!/bin/bash
set -e

# Configuration
PROJECT_ID="agent-growth-and-ops"

# List of secrets to create
# Format: "SECRET_NAME:SECRET_VALUE"
# To generate a new JWT_SECRET, run: openssl rand -base64 32
# SENDGRID_API_KEY is managed separately and should not be overwritten by this script.
SECRETS=(
    "JWT_SECRET:$(openssl rand -base64 32)"
    "SENDGRID_FROM_EMAIL:your_from_email@example.com"
    "SENDGRID_FROM_NAME:Your Company Name"
)

echo "🔐 Setting up Secrets in Google Secret Manager..."
echo "============================================="
echo "Project: $PROJECT_ID"
echo ""

# 1. Enable Secret Manager API
echo "🔧 Enabling Secret Manager API..."
gcloud services enable secretmanager.googleapis.com --project="$PROJECT_ID"

# 2. Grant access to Cloud Run service account
RUNTIME_SA="crm-runtime-sa@${PROJECT_ID}.iam.gserviceaccount.com"
echo "🔑 Granting Secret Accessor role to Cloud Run service account: $RUNTIME_SA"

for secret_entry in "${SECRETS[@]}"; do
    SECRET_NAME=$(echo "$secret_entry" | cut -d: -f1)
    
    # Check if the secret exists before trying to grant access
    if gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" &>/dev/null; then
        gcloud secrets add-iam-policy-binding "$SECRET_NAME" \
            --member="serviceAccount:$RUNTIME_SA" \
            --role="roles/secretmanager.secretAccessor" \
            --project="$PROJECT_ID"
    else
        echo "⚠️ Secret '$SECRET_NAME' does not exist yet. Skipping IAM policy binding."
    fi
done


# 3. Create/update secrets
echo "📝 Creating/updating secrets..."

for secret_entry in "${SECRETS[@]}"; do
    SECRET_NAME=$(echo "$secret_entry" | cut -d: -f1)
    SECRET_VALUE=$(echo "$secret_entry" | cut -d: -f2-)

    # Create the secret if it doesn't exist
    if ! gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" &>/dev/null; then
        echo "  -> Creating secret '$SECRET_NAME'..."
        gcloud secrets create "$SECRET_NAME" \
            --replication-policy="automatic" \
            --project="$PROJECT_ID"
    fi

    # Add a new version with the specified value
    echo "  -> Adding new version to secret '$SECRET_NAME'..."
    echo -n "$SECRET_VALUE" | gcloud secrets versions add "$SECRET_NAME" \
        --data-file=- \
        --project="$PROJECT_ID"
done

echo ""
echo "✅ All secrets have been set up successfully."
echo "🔒 Please replace placeholder values (like SendGrid API key) manually in the Google Cloud Console."
echo ""
echo "🎉 Secrets setup complete!"
