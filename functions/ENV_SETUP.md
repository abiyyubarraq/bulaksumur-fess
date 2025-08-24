# Environment Variables Setup Guide

This guide shows you how to handle your `.env` file with Docker deployment.

## Method 1: Copy Your Existing .env File (Recommended)

### Step 1: Copy .env to VPS
```bash
# From your local functions directory
./copy-env.sh your-vps-ip
```

### Step 2: Deploy
```bash
ssh root@your-vps-ip
cd /opt/bulaksumur-bot
./docker-deploy.sh
```

## Method 2: Manual Copy

### Step 1: Copy .env file manually
```bash
scp .env root@your-vps-ip:/opt/bulaksumur-bot/
```

### Step 2: Deploy
```bash
ssh root@your-vps-ip
cd /opt/bulaksumur-bot
./docker-deploy.sh
```

## Method 3: Create .env on VPS

### Step 1: SSH to VPS
```bash
ssh root@your-vps-ip
cd /opt/bulaksumur-bot
```

### Step 2: Create .env file
```bash
nano .env
```

### Step 3: Add your environment variables
```env
# Bot Configuration
BOT_TOKEN=your_telegram_bot_token_here

# Firebase Configuration
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY="your_firebase_private_key"
FIREBASE_CLIENT_EMAIL=your_firebase_client_email

# Add all your other environment variables here
NODE_ENV=production
# ... your other variables
```

### Step 4: Deploy
```bash
./docker-deploy.sh
```

## Method 4: GitHub Secrets (Automated)

If you want to use GitHub Actions for automated deployment:

1. **Add all your environment variables as GitHub secrets**
2. **Update the workflow file** to include all your variables

Example workflow update:
```yaml
# In .github/workflows/deploy-docker.yml
cat > .env << EOF
BOT_TOKEN=${{ secrets.BOT_TOKEN }}
FIREBASE_PROJECT_ID=${{ secrets.FIREBASE_PROJECT_ID }}
FIREBASE_PRIVATE_KEY="${{ secrets.FIREBASE_PRIVATE_KEY }}"
FIREBASE_CLIENT_EMAIL=${{ secrets.FIREBASE_CLIENT_EMAIL }}
# Add all your other variables here
VARIABLE_1=${{ secrets.VARIABLE_1 }}
VARIABLE_2=${{ secrets.VARIABLE_2 }}
EOF
```

## Environment Variables in Docker

### How it works:
- **env_file**: Loads all variables from `.env` file
- **environment**: Sets specific variables (like NODE_ENV=production)
- **Docker Compose**: Automatically loads `.env` file in the same directory

### Example .env file structure:
```env
# Bot Configuration
BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com

# Application Configuration
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mydb
DB_USER=myuser
DB_PASSWORD=mypassword

# API Keys
API_KEY=your_api_key_here
SECRET_KEY=your_secret_key_here

# Feature Flags
ENABLE_FEATURE_X=true
ENABLE_FEATURE_Y=false

# External Services
REDIS_URL=redis://localhost:6379
SENTRY_DSN=https://your-sentry-dsn
```

## Security Best Practices

### 1. Never commit .env to Git
```bash
# Make sure .env is in .gitignore
echo ".env" >> .gitignore
```

### 2. Use different .env files for different environments
```bash
.env.local      # Local development
.env.staging    # Staging environment
.env.production # Production environment
```

### 3. Validate environment variables
```bash
# Check if required variables are set
if [ -z "$BOT_TOKEN" ]; then
    echo "❌ BOT_TOKEN is not set"
    exit 1
fi
```

## Troubleshooting

### Check if .env is loaded:
```bash
# View container environment variables
docker-compose exec bulaksumur-bot env

# Check specific variable
docker-compose exec bulaksumur-bot sh -c 'echo $BOT_TOKEN'
```

### Debug .env file:
```bash
# Check if .env file exists
ls -la .env

# View .env content (be careful with sensitive data)
cat .env

# Check file permissions
ls -la .env
```

### Common Issues:

1. **File not found**: Make sure `.env` is in the same directory as `docker-compose.yml`
2. **Permission denied**: Check file permissions with `ls -la .env`
3. **Variables not loaded**: Restart container with `docker-compose down && docker-compose up -d`
4. **Format issues**: Make sure there are no spaces around `=` in `.env` file

## Quick Commands

```bash
# Copy .env to VPS
./copy-env.sh your-vps-ip

# Deploy with existing .env
./docker-deploy.sh

# Check environment variables in container
docker-compose exec bulaksumur-bot env | grep BOT_TOKEN

# View logs
docker-compose logs -f

# Restart container
docker-compose restart
```
