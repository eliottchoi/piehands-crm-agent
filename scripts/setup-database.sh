#!/bin/bash
set -e

# Configuration
PROJECT_ID="agent-growth-and-ops"
DB_INSTANCE="crm-database"
REGION="us-central1"
TIER="db-n1-standard-2" # Example tier
VERSION="POSTGRES_15"
ROOT_USER="postgres"
DATABASE_NAME="crm"
DB_USER="crm_user"
SECRET_DB_URL="CRM_DATABASE_URL"

echo "🚀 Setting up Cloud SQL Database..."
echo "==================================="
echo "Project: $PROJECT_ID"
echo "Instance: $DB_INSTANCE"

# 1. Enable APIs
echo "🔧 Enabling required APIs..."
gcloud services enable sqladmin.googleapis.com \
    --project="$PROJECT_ID"

# 2. Create Cloud SQL Instance
echo "🐘 Creating PostgreSQL instance..."
if ! gcloud sql instances describe "$DB_INSTANCE" --project="$PROJECT_ID" &>/dev/null; then
    gcloud sql instances create "$DB_INSTANCE" \
        --database-version="$VERSION" \
        --tier="$TIER" \
        --region="$REGION" \
        --root-password=$(openssl rand -base64 12) \
        --project="$PROJECT_ID"
else
    echo "✅ Instance '$DB_INSTANCE' already exists."
fi

# 3. Create Database
echo "📖 Creating database '$DATABASE_NAME'..."
if ! gcloud sql databases describe "$DATABASE_NAME" --instance="$DB_INSTANCE" --project="$PROJECT_ID" &>/dev/null; then
    gcloud sql databases create "$DATABASE_NAME" \
        --instance="$DB_INSTANCE" \
        --project="$PROJECT_ID"
else
    echo "✅ Database '$DATABASE_NAME' already exists."
fi

# 4. Create Database User
echo "👤 Creating database user '$DB_USER'..."
if ! gcloud sql users list --instance="$DB_INSTANCE" --project="$PROJECT_ID" | grep -q "$DB_USER"; then
    DB_PASSWORD=$(openssl rand -base64 12)
    gcloud sql users create "$DB_USER" \
        --instance="$DB_INSTANCE" \
        --password="$DB_PASSWORD" \
        --project="$PROJECT_ID"
    
    # Store the generated password in Secret Manager
    echo "🔐 Storing user password in Secret Manager..."
    echo -n "$DB_PASSWORD" | gcloud secrets create "${DB_USER}_password" \
        --data-file=- \
        --replication-policy="automatic" \
        --project="$PROJECT_ID"
else
    echo "✅ User '$DB_USER' already exists."
fi

# 5. Construct and Store Database URL in Secret Manager
echo "🔐 Constructing and storing database connection URL..."
DB_HOST=$(gcloud sql instances describe "$DB_INSTANCE" --project="$PROJECT_ID" --format='value(ipAddresses[0].ipAddress)')
# For private IP: --format='value(ipAddresses.filter("type=PRIVATE").ipAddress)'
# For public IP: --format='value(ipAddresses.filter("type=PRIMARY").ipAddress)'
# Note: For Cloud Run, you should use the socket connection string for better security and performance.

# Fetch the password from Secret Manager
DB_PASSWORD=$(gcloud secrets versions access latest --secret="${DB_USER}_password" --project="$PROJECT_ID")

# The format for Cloud Run's Unix socket is:
# postgresql://<user>:<password>@/<database>?host=/cloudsql/<project>:<region>:<instance>
CONNECTION_NAME=$(gcloud sql instances describe "$DB_INSTANCE" --project="$PROJECT_ID" --format="value(connectionName)")
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@/${DATABASE_NAME}?host=/cloudsql/${CONNECTION_NAME}"

echo -n "$DATABASE_URL" | gcloud secrets create "$SECRET_DB_URL" \
    --data-file=- \
    --replication-policy="automatic" \
    --project="$PROJECT_ID" \
    --quiet || \
    echo -n "$DATABASE_URL" | gcloud secrets versions add "$SECRET_DB_URL" --data-file=- --project="$PROJECT_ID" --quiet

echo "✅ Secret '$SECRET_DB_URL' created/updated."

echo "🎉 Database setup complete!"
