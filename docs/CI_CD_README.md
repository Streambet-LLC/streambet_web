# Streambet Frontend CI/CD Pipeline

This document describes the CI/CD pipeline configuration for deploying the Streambet frontend application to AWS S3 with CloudFront CDN.

## Pipeline Overview

The GitLab CI/CD pipeline automates the build, test, and deployment of the frontend application to various environments:

- **dev**: Development environment (dev branch)
- **qa**: Quality Assurance environment (qa branch)
- **staging**: Staging/Pre-production environment (staging branch)
- **prod**: Production environment (prod branch)

## Pipeline Stages

1. **Build**: Compiles the React application
2. **Test**: Runs linting and tests
3. **Deploy**: Deploys the built application to the appropriate S3 bucket and invalidates CloudFront cache

## AWS Infrastructure Requirements

Before using this pipeline, ensure you have set up:

1. **S3 Buckets** for each environment:

   - streambet-frontend-dev
   - streambet-frontend-qa
   - streambet-frontend-staging
   - streambet-frontend-prod

2. **CloudFront Distributions** pointing to each S3 bucket

3. **IAM Roles** for GitLab CI/CD with the following permissions:

   - S3 access to the corresponding bucket
   - CloudFront invalidation permissions
   - SSM Parameter Store read access

4. **AWS Parameter Store** to store environment variables:
   - Parameters should be stored under `/streambet/frontend/{env}/` path
   - All frontend environment variables should start with `VITE_` or `REACT_APP_` prefix

## Setting Up GitLab CI/CD with AWS

### 1. Configure AWS IAM Roles

Create IAM roles for each environment with the following trust relationship to allow GitLab to assume the role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/gitlab.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "gitlab.com:sub": "project_path:YOUR_GITLAB_ORG/streambet:ref_type:branch:ref:ENVIRONMENT"
        }
      }
    }
  ]
}
```

Replace:

- `ACCOUNT_ID` with your AWS account ID
- `YOUR_GITLAB_ORG` with your GitLab organization name
- `ENVIRONMENT` with the environment name (dev, qa, staging, or prod)

### 2. Configure GitLab OpenID Connect (OIDC)

In GitLab, navigate to:
Settings → CI/CD → General pipelines → OpenID Connect

Enable the feature and configure it with your AWS account information.

### 3. Environment Variables in AWS Parameter Store

Store all environment variables in AWS Parameter Store using the following path pattern:
`/streambet/frontend/{env}/{variable_name}`

For example:

- `/streambet/frontend/dev/VITE_API_URL`
- `/streambet/frontend/qa/VITE_API_URL`
- etc.

### 4. Update .gitlab-ci.yml Variables

Update the following variables in the `.gitlab-ci.yml` file:

- AWS_DEFAULT_REGION
- S3 bucket names
- CloudFront distribution IDs
- AWS IAM role ARNs (replace ACCOUNT_ID with your actual AWS account ID)

## Deployment Process

1. **Automatic Deployments**:

   - Changes pushed to dev, qa, or staging branches trigger automatic deployments
   - The pipeline will build, test, and deploy to the corresponding environment

2. **Production Deployment**:
   - Production deployment requires manual approval
   - Navigate to the GitLab pipeline and click "Play" on the production deployment job

## Troubleshooting

If the pipeline fails, check:

1. AWS IAM role permissions and trust relationships
2. GitLab OIDC configuration
3. S3 bucket policies
4. CloudFront distribution settings
5. Parameter Store paths and values

For more information, refer to:

- [GitLab CI/CD Documentation](https://docs.gitlab.com/ee/ci/)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [AWS Parameter Store Documentation](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
