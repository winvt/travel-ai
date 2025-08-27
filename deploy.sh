#!/bin/bash

# Google Cloud Run Deployment Script for WanderWise Travel AI

echo "🚀 Starting Google Cloud Run deployment for WanderWise..."

# Set your project ID (replace with your actual project ID)
PROJECT_ID="your-project-id"
SERVICE_NAME="wanderwise-travel-ai"
REGION="us-central1"  # Change to your preferred region

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud CLI is not installed. Please install it first:"
    echo "https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "🔐 Please authenticate with Google Cloud:"
    gcloud auth login
fi

# Set the project
echo "📋 Setting project to: $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# Deploy to Cloud Run
echo "🚀 Deploying to Google Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --timeout 300 \
  --concurrency 80 \
  --set-env-vars NODE_ENV=production

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")

echo "✅ Deployment completed successfully!"
echo "🌐 Your app is available at: $SERVICE_URL"
echo ""
echo "📝 Next steps:"
echo "1. Set up your environment variables in Google Cloud Console"
echo "2. Configure your API keys (OpenAI, Google Maps, etc.)"
echo "3. Test your application"
echo ""
echo "🔧 To update environment variables:"
echo "gcloud run services update $SERVICE_NAME --region=$REGION --set-env-vars KEY=VALUE"
echo ""
echo "📊 To view logs:"
echo "gcloud logs tail --service=$SERVICE_NAME --region=$REGION"
