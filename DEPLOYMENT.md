# Deployment Guide

This document outlines the process for building and deploying the AU API Docker image to AWS ECR.

## Prerequisites

- AWS CLI configured with appropriate credentials
- Docker installed and running
- Access to the AWS ECR repository

## Deployment Commands

Execute the following commands in order to build and push the Docker image:

### 1. Authenticate with AWS ECR

```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 822778518482.dkr.ecr.us-east-1.amazonaws.com
```

This command retrieves an authentication token from AWS ECR and pipes it to Docker login.

### 2. Build the Docker Image

```bash
docker build --platform linux/amd64 -t answerunited/au-api .
```

Builds the Docker image for the linux/amd64 platform architecture (ensures compatibility with AWS ECS/Fargate).

### 3. Tag the Image for ECR

```bash
docker tag answerunited/au-api:latest 822778518482.dkr.ecr.us-east-1.amazonaws.com/answerunited/au-api:latest
```

Tags the local image with the ECR repository URI.

### 4. Push to ECR

```bash
docker push 822778518482.dkr.ecr.us-east-1.amazonaws.com/answerunited/au-api:latest
```

Pushes the tagged image to the AWS ECR repository.

## Quick Deploy Script

You can create a shell script to run all commands at once:

```bash
#!/bin/bash

# Authenticate with ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 822778518482.dkr.ecr.us-east-1.amazonaws.com

# Build the Docker image
docker build --platform linux/amd64 -t answerunited/au-api .

# Tag the image
docker tag answerunited/au-api:latest 822778518482.dkr.ecr.us-east-1.amazonaws.com/answerunited/au-api:latest

# Push to ECR
docker push 822778518482.dkr.ecr.us-east-1.amazonaws.com/answerunited/au-api:latest

echo "Deployment complete!"
```

## Notes

- **Region**: The ECR repository is in `us-east-1`
- **Platform**: The image is built for `linux/amd64` to ensure compatibility
- **Repository**: `822778518482.dkr.ecr.us-east-1.amazonaws.com/answerunited/au-api`