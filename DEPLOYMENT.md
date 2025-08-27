# 🚀 Google Cloud Run Deployment Guide

## Prerequisites

1. **Google Cloud Account**: Make sure you have a Google Cloud account
2. **Google Cloud CLI**: Install the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)
3. **Node.js**: Version 16 or higher
4. **Git**: For version control

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure Google Cloud

### Authenticate with Google Cloud
```bash
gcloud auth login
```

### Set your project ID
```bash
gcloud config set project YOUR_PROJECT_ID
```

### Enable required APIs
```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

## Step 3: Update Configuration

### Edit deploy.sh
Open `deploy.sh` and update the following variables:
- `PROJECT_ID`: Your Google Cloud project ID
- `SERVICE_NAME`: Your preferred service name (default: wanderwise-travel-ai)
- `REGION`: Your preferred region (default: us-central1)

### Make deploy.sh executable
```bash
chmod +x deploy.sh
```

## Step 4: Deploy

### Option A: Use the deployment script
```bash
./deploy.sh
```

### Option B: Manual deployment
```bash
gcloud run deploy wanderwise-travel-ai \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --timeout 300 \
  --concurrency 80 \
  --set-env-vars NODE_ENV=production
```

## Step 5: Configure Environment Variables

After deployment, set up your environment variables in Google Cloud Console:

### Required Environment Variables
- `REACT_APP_OPENAI_API_KEY`: Your OpenAI API key
- `REACT_APP_GOOGLE_MAPS_API_KEY`: Your Google Maps API key
- `REACT_APP_MCP_SERVER_URL`: MCP server URL (if using)

### Set environment variables via CLI
```bash
gcloud run services update wanderwise-travel-ai \
  --region us-central1 \
  --set-env-vars REACT_APP_OPENAI_API_KEY=your-openai-key,REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-key
```

## Step 6: Test Your Deployment

1. Get your service URL:
```bash
gcloud run services describe wanderwise-travel-ai --region=us-central1 --format="value(status.url)"
```

2. Open the URL in your browser and test the application

## Troubleshooting

### Common Issues

#### Build Errors
- Make sure all dependencies are properly installed
- Check that your `package.json` has the correct build scripts
- Verify that the `serve` package is included in dependencies

#### Environment Variables
- Ensure all required API keys are set
- Check that environment variable names start with `REACT_APP_` for React apps
- Verify API keys are valid and have proper permissions

#### Performance Issues
- Adjust memory and CPU allocation if needed
- Consider increasing max instances for high traffic
- Monitor logs for any errors

### View Logs
```bash
gcloud logs tail --service=wanderwise-travel-ai --region=us-central1
```

### Update Service
```bash
gcloud run services update wanderwise-travel-ai --region=us-central1 --image=gcr.io/PROJECT_ID/wanderwise-travel-ai
```

## Cost Optimization

- **Memory**: Start with 1Gi, adjust based on usage
- **CPU**: Start with 1 CPU, increase if needed
- **Max Instances**: Set to 10 for cost control
- **Concurrency**: 80 is a good balance for performance and cost

## Security Considerations

- Use environment variables for sensitive data
- Enable authentication if needed (remove `--allow-unauthenticated`)
- Set up proper IAM roles
- Use HTTPS (enabled by default in Cloud Run)

## Monitoring

- Set up Cloud Monitoring for your service
- Configure alerts for errors and performance issues
- Monitor costs in the Google Cloud Console

## Support

If you encounter issues:
1. Check the Google Cloud Run documentation
2. Review the application logs
3. Verify all environment variables are set correctly
4. Test locally before deploying
