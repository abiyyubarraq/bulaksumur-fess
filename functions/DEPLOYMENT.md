# VPS Deployment Guide

This guide will help you deploy the Bulaksumur Menfess Bot to your Hostinger VPS.

## Prerequisites

1. **VPS Access**: SSH access to your Hostinger VPS
2. **Domain/IP**: Your VPS IP address
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

### 3. Install Required Dependencies

```bash
# Install curl and other essentials
apt install -y curl git unzip

# Install Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Verify Bun installation
bun --version
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

Copy the entire content (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`) and add it as `SSH_PRIVATE_KEY` secret.

## Deployment Methods

### Method 1: Automated Deployment (Recommended)

Once you've set up the GitHub secrets, every push to the `main` branch will automatically:

1. Build the project
2. Deploy to your VPS
3. Start/restart the bot service

### Method 2: Manual Deployment

If you prefer manual deployment:

1. **Build Locally**
   ```bash
   cd functions
   bun install
   bun run build:prod
   ```

2. **Upload to VPS**
   ```bash
   scp -r dist package.json bulaksumur-bot.service root@your-vps-ip:/opt/bulaksumur-bot/
   ```

3. **Setup on VPS**
   ```bash
   ssh root@your-vps-ip
   cd /opt/bulaksumur-bot
   
   # Create .env file
   cp env.template .env
   # Edit .env with your actual values
   nano .env
   
   # Install dependencies
   bun install --production
   
   # Setup systemd service
   cp bulaksumur-bot.service /etc/systemd/system/
   systemctl daemon-reload
   systemctl enable bulaksumur-bot
   systemctl start bulaksumur-bot
   ```

## Service Management

### Check Service Status
```bash
sudo systemctl status bulaksumur-bot
```

### View Logs
```bash
# View recent logs
sudo journalctl -u bulaksumur-bot -f

# View logs from today
sudo journalctl -u bulaksumur-bot --since today
```

### Restart Service
```bash
sudo systemctl restart bulaksumur-bot
```

### Stop Service
```bash
sudo systemctl stop bulaksumur-bot
```

## Alternative: Using PM2

If you prefer PM2 over systemd:

### 1. Install PM2
```bash
npm install -g pm2
```

### 2. Start Bot with PM2
```bash
cd /opt/bulaksumur-bot
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3. PM2 Commands
```bash
# Status
pm2 status

# Logs
pm2 logs bulaksumur-bot

# Restart
pm2 restart bulaksumur-bot

# Stop
pm2 stop bulaksumur-bot
```

## Troubleshooting

### Common Issues

1. **Build Errors**: Ensure you're using the fixed build script with `--target=node`
2. **Permission Issues**: Make sure the application directory has correct permissions
3. **Environment Variables**: Verify all required environment variables are set
4. **Service Won't Start**: Check logs using `journalctl -u bulaksumur-bot`

### Useful Commands

```bash
# Check if bot process is running
ps aux | grep bun

# Check open ports
netstat -tulpn

# Check disk space
df -h

# Check memory usage
free -h

# Check system resources
htop
```

### Log Files

- **systemd logs**: `journalctl -u bulaksumur-bot`
- **PM2 logs**: `/root/.pm2/logs/`
- **Application logs**: `/opt/bulaksumur-bot/logs/` (if using PM2)

## Security Recommendations

1. **Firewall**: Configure UFW firewall
   ```bash
   ufw allow ssh
   ufw allow 80
   ufw allow 443
   ufw --force enable
   ```

2. **SSH Security**: Disable password authentication, use key-based auth only

3. **Regular Updates**: Keep your system updated
   ```bash
   apt update && apt upgrade -y
   ```

4. **Environment Variables**: Never commit secrets to Git, use environment variables

## Monitoring

Set up basic monitoring:

```bash
# Create a simple health check script
cat > /opt/bulaksumur-bot/health-check.sh << 'EOF'
#!/bin/bash
if ! systemctl is-active --quiet bulaksumur-bot; then
    echo "Bot service is down, attempting restart..."
    systemctl restart bulaksumur-bot
fi
EOF

chmod +x /opt/bulaksumur-bot/health-check.sh

# Add to crontab to run every 5 minutes
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/bulaksumur-bot/health-check.sh") | crontab -
```

This will automatically restart the bot if it stops running.
