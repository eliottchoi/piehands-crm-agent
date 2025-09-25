#!/bin/bash
set -e

# Configuration
PROJECT_ID="agent-growth-and-ops"
DB_INSTANCE="crm-database" # Standardized name
REGION="us-central1"
TIER="db-g1-small" # Using a general-purpose tier like db-g1-small
VERSION="POSTGRES_15"
ROOT_USER="postgres"
DATABASE_NAME="crm"
DB_USER="crm_user"
SECRET_DB_URL="CRM_DATABASE_URL"

echo "🚀 Setting up Cloud SQL Database..."
echo "==================================="
echo "Project: $PROJECT_ID"
echo "Instance: $DB_INSTANCE"

# 0. Delete the old, incorrectly named instance if it exists
if gcloud sql instances describe "piehands-crm-db" --project="$PROJECT_ID" &>/dev/null; then
    echo "🗑️ Deleting old instance 'piehands-crm-db'..."
    gcloud sql instances delete "piehands-crm-db" --project="$PROJECT_ID" --quiet
fi

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

# 4. Create or Update Database User with a URL-safe password
echo "👤 Creating/updating database user '$DB_USER' with a URL-safe password..."
DB_PASSWORD=$(openssl rand -hex 16) # Generate a 32-character URL-safe password

if ! gcloud sql users list --instance="$DB_INSTANCE" --project="$PROJECT_ID" | grep -q "$DB_USER"; then
    gcloud sql users create "$DB_USER" --instance="$DB_INSTANCE" --password="$DB_PASSWORD" --project="$PROJECT_ID"
else
    gcloud sql users set-password "$DB_USER" --instance="$DB_INSTANCE" --password="$DB_PASSWORD" --project="$PROJECT_ID"
    echo "✅ User '$DB_USER' already exists. Password has been reset with a new URL-safe password."
fi

# Store or update the password in Secret Manager
echo "🔐 Storing/updating user password in Secret Manager..."
if gcloud secrets describe "${DB_USER}_password" --project="$PROJECT_ID" --quiet &>/dev/null; then
    echo -n "$DB_PASSWORD" | gcloud secrets versions add "${DB_USER}_password" --data-file=- --project="$PROJECT_ID" --quiet
else
    echo -n "$DB_PASSWORD" | gcloud secrets create "${DB_USER}_password" --data-file=- --replication-policy="automatic" --project="$PROJECT_ID" --quiet
fi


# 5. Construct and Store Database URL in Secret Manager
echo "🔐 Constructing and storing database connection URL..."
# The format for Cloud Run's Unix socket is:
# postgresql://<user>:<password>@localhost/<database>?host=/cloudsql/<project>:<region>:<instance>
CONNECTION_NAME=$(gcloud sql instances describe "$DB_INSTANCE" --project="$PROJECT_ID" --format="value(connectionName)")
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost/${DATABASE_NAME}?host=/cloudsql/${CONNECTION_NAME}"

echo -n "$DATABASE_URL" | gcloud secrets create "$SECRET_DB_URL" \
    --data-file=- \
    --replication-policy="automatic" \
    --project="$PROJECT_ID" \
    --quiet || \
    echo -n "$DATABASE_URL" | gcloud secrets versions add "$SECRET_DB_URL" --data-file=- --project="$PROJECT_ID" --quiet

echo "✅ Secret '$SECRET_DB_URL' created/updated."

echo "🎉 Database setup complete!"
