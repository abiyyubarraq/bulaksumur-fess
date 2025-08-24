# Docker Deployment Guide

This guide will help you deploy the Bulaksumur Menfess Bot using Docker on your Ubuntu 18.04 VPS.

## Prerequisites

1. **VPS Access**: SSH access to your Ubuntu 18.04 VPS
2. **Docker**: Docker and Docker Compose installed on your VPS
3. **Bot Token**: Telegram bot token from @BotFather
4. **Firebase Credentials**: Firebase project credentials

## Initial VPS Setup

### 1. Connect to Your VPS

```bash
ssh root@your-vps-ip-address
```

### 2. Update System

```bash
apt update && apt upgrade -y
```

### 3. Install Docker (if not already installed)

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Add user to docker group
usermod -aG docker $USER

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 4. Create Application Directory

```bash
mkdir -p /opt/bulaksumur-bot
mkdir -p /opt/bulaksumur-bot/logs
```

## GitHub Repository Setup

### 1. Add Repository Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add the following secrets:

- `SSH_PRIVATE_KEY`: Your VPS SSH private key
- `REMOTE_HOST`: Your VPS IP address  
- `REMOTE_USER`: SSH username (usually `root`)
- `BOT_TOKEN`: Your Telegram bot token
- `FIREBASE_PROJECT_ID`: Your Firebase project ID
- `FIREBASE_PRIVATE_KEY`: Your Firebase private key
- `FIREBASE_CLIENT_EMAIL`: Your Firebase client email

### 2. Generate SSH Key Pair

On your local machine or in GitHub Codespaces:

```bash
# Generate SSH key pair
ssh-keygen -t rsa -b 4096 -f ~/.ssh/vps_deploy_key

# Copy public key to VPS
ssh-copy-id -i ~/.ssh/vps_deploy_key.pub root@your-vps-ip

# Copy private key content for GitHub secrets
cat ~/.ssh/vps_deploy_key
```

Copy the entire content and add it as `SSH_PRIVATE_KEY` secret.

## Deployment Methods

### Method 1: Automated Deployment (Recommended)

Once you've set up the GitHub secrets, every push to the `main` branch will automatically:

1. Deploy the code to your VPS
2. Build and start the Docker container
3. Set up environment variables

### Method 2: Manual Deployment

If you prefer manual deployment:

1. **Copy .env to VPS**
   ```bash
   # From your local functions directory
   ./copy-env.sh your-vps-ip
   ```

2. **Upload Files to VPS**
   ```bash
   scp -r functions/* root@your-vps-ip:/opt/bulaksumur-bot/
   ```

3. **Setup on VPS**
   ```bash
   ssh root@your-vps-ip
   cd /opt/bulaksumur-bot
   
   # Make deployment script executable
   chmod +x docker-deploy.sh
   
   # Deploy
   ./docker-deploy.sh
   ```

### Method 3: Local Testing (No Docker Required)

To test your build locally before deploying:

```bash
# From your local functions directory
./test-local.sh
```

## Docker Commands

### Check Container Status
```bash
docker-compose ps
```

### View Logs
```bash
# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View logs for specific service
docker-compose logs bulaksumur-bot
```

### Restart Container
```bash
docker-compose restart
```

### Stop Container
```bash
docker-compose down
```

### Update and Redeploy
```bash
# Pull latest changes and rebuild
docker-compose up -d --build

# Or use the deployment script
./docker-deploy.sh
```

### Access Container Shell
```bash
docker-compose exec bulaksumur-bot sh
```

## Environment Variables

Create a `.env` file in the `/opt/bulaksumur-bot` directory:

```env
BOT_TOKEN=your_telegram_bot_token_here
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY="your_firebase_private_key"
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
NODE_ENV=production
```

## Troubleshooting

### Common Issues

1. **Container Won't Start**: Check logs with `docker-compose logs`
2. **Environment Variables**: Verify all required variables are set in `.env`
3. **Port Conflicts**: Ensure port 3000 is not in use
4. **Permission Issues**: Make sure the deployment script is executable

### Useful Commands

```bash
# Check Docker status
docker info

# Check disk space
df -h

# Check memory usage
free -h

# Check running containers
docker ps

# Check container resources
docker stats

# Clean up unused Docker resources
docker system prune -f
```

### Log Files

- **Container logs**: `docker-compose logs`
- **Application logs**: Mounted in `/opt/bulaksumur-bot/logs/`

## Security Recommendations

1. **Firewall**: Configure UFW firewall
   ```bash
   ufw allow ssh
   ufw allow 80
   ufw allow 443
   ufw --force enable
   ```

2. **SSH Security**: Disable password authentication, use key-based auth only

3. **Docker Security**: Run containers as non-root user (already configured)

4. **Environment Variables**: Never commit secrets to Git, use environment variables

## Monitoring

Set up basic monitoring:

```bash
# Create a simple health check script
cat > /opt/bulaksumur-bot/health-check.sh << 'EOF'
#!/bin/bash
if ! docker-compose ps | grep -q "Up"; then
    echo "Bot container is down, attempting restart..."
    cd /opt/bulaksumur-bot
    ./docker-deploy.sh
fi
EOF

chmod +x /opt/bulaksumur-bot/health-check.sh

# Add to crontab to run every 5 minutes
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/bulaksumur-bot/health-check.sh") | crontab -
```

## Advantages of Docker Deployment

1. **Consistency**: Same environment across development and production
2. **Isolation**: Bot runs in its own container
3. **Easy Updates**: Simple rebuild and restart process
4. **Resource Management**: Better control over CPU and memory usage
5. **Rollback**: Easy to revert to previous versions
6. **Ubuntu 18.04 Compatibility**: No need to upgrade system packages

This will automatically restart the bot if the container stops running.
