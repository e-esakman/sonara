#!/bin/bash

echo "Deploying Sonara backend..."

PROJECT_ID="project-a83c2612-7504-41be-9dd"
SERVICE="sonara-backend"
REGION="asia-south1"

gcloud config set project $PROJECT_ID

gcloud run deploy $SERVICE \
  --source backend \
  --region $REGION \
  --allow-unauthenticated

echo "Deployment complete!"