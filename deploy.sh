#!/bin/bash

# Deployment script for LinkedIn Outreach Helper
# Usage: ./deploy.sh

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Server details (uses ~/.ssh/config alias "reachout-aws")
SERVER="reachout-aws"
SERVER_PATH="/opt/reachoutHelper"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run commands on server
run_on_server() {
    echo -e "${YELLOW}Running on server: $1${NC}"
    ssh "$SERVER" "cd $SERVER_PATH && $1"
}

# Function to copy files to server
copy_to_server() {
    echo -e "${YELLOW}Copying $1 to server${NC}"
    scp "$1" "$SERVER:$SERVER_PATH/$2"
}

# Check if we're in the right directory
if [ ! -d "linkedin-outreach" ]; then
    echo -e "${RED}Error: linkedin-outreach directory not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Step 1: Build the Next.js app locally
echo -e "${GREEN}Step 1: Building Next.js app locally...${NC}"
cd linkedin-outreach

# Install dependencies if package-lock.json is newer
if [ "package-lock.json" -nt "node_modules" ] || [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build the app
echo "Building the application..."
npm run build

cd ..

# Step 2: Create deployment package
echo -e "${GREEN}Step 2: Creating deployment package...${NC}"

# Create temporary directory for deployment
DEPLOY_DIR="deploy-temp"
rm -rf "$DEPLOY_DIR"
mkdir "$DEPLOY_DIR"

# Copy necessary files
cp -r linkedin-outreach/.next "$DEPLOY_DIR/"
cp linkedin-outreach/package.json "$DEPLOY_DIR/"
cp linkedin-outreach/package-lock.json "$DEPLOY_DIR/"
cp -r linkedin-outreach/public "$DEPLOY_DIR/" 2>/dev/null || true
cp -r linkedin-outreach/src "$DEPLOY_DIR/"
cp -r data "$DEPLOY_DIR/" 2>/dev/null || true

# Copy scripts directory
cp -r scripts "$DEPLOY_DIR/" 2>/dev/null || true

# Step 3: Deploy to server
echo -e "${GREEN}Step 3: Deploying to server...${NC}"

# Create directory structure on server if it doesn't exist
run_on_server "sudo mkdir -p $SERVER_PATH"
run_on_server "sudo chown ubuntu:ubuntu $SERVER_PATH"

# Copy deployment package to server
echo "Uploading files to server..."
rsync -avz -e ssh \
    --exclude='*.db' \
    --exclude='node_modules' \
    --exclude='.git' \
    "$DEPLOY_DIR/" "$SERVER:$SERVER_PATH/"

# Step 4: Set up server environment
echo -e "${GREEN}Step 4: Setting up server environment...${NC}"

# Install dependencies on server
run_on_server "cd $SERVER_PATH && npm install --production"

# Ensure data directory and database files exist
run_on_server "mkdir -p $SERVER_PATH/data"
run_on_server "touch $SERVER_PATH/data/outreach.db"
run_on_server "chmod 644 $SERVER_PATH/data/outreach.db"

# Create sources.json if it doesn't exist
run_on_server "test -f $SERVER_PATH/data/sources.json || cat > $SERVER_PATH/data/sources.json << 'SRCEOF'
{
  \"sources\": [
    {
      \"id\": \"roboscout\",
      \"name\": \"RoboScout Campaign\",
      \"path\": \"/opt/reachoutHelper/crm.db\",
      \"templates\": {
        \"simple\": \"Hi {{first_name}}, I noticed your work at {{company}}. Would love to connect and chat about potential synergies!\",
        \"followup1\": \"Hi {{first_name}}, just following up on my earlier message. Would love to chat if you have a moment!\",
        \"followup2\": \"Hey {{first_name}}, one last note - if this ever becomes relevant to your work, I'd be happy to connect. No pressure!\"
      },
      \"llmEnabled\": true,
      \"followUpDays\": 7,
      \"maxFollowUps\": 2
    }
  ]
}
SRCEOF"

# Step 5: Restart the service
echo -e "${GREEN}Step 5: Restarting service...${NC}"

# Check if PM2 is being used
if run_on_server "which pm2 > /dev/null 2>&1"; then
    echo "Using PM2 to restart service..."
    run_on_server "pm2 restart linkedin-outreach || pm2 start npm --name 'linkedin-outreach' -- start"
else
    echo "Using systemd to restart service..."
    run_on_server "sudo systemctl restart linkedin-outreach || echo 'Service not configured with systemd'"
fi

# Step 6: Clean up
echo -e "${GREEN}Step 6: Cleaning up...${NC}"
rm -rf "$DEPLOY_DIR"

# Step 7: Verify deployment
echo -e "${GREEN}Step 7: Verifying deployment...${NC}"
echo "Checking if application is running..."
sleep 5

if run_on_server "curl -f http://localhost:3000 > /dev/null 2>&1"; then
    echo -e "${GREEN}✅ Deployment successful! Application is running on port 3000${NC}"
else
    echo -e "${YELLOW}⚠️  Application may not be running. Check server logs.${NC}"
fi

echo -e "${GREEN}🎉 Deployment completed!${NC}"
echo "Server: $SERVER"
echo "Path: $SERVER_PATH"
echo ""
echo "Next steps:"
echo "1. Check server logs: ssh reachout-aws 'cd $SERVER_PATH && pm2 logs'"
echo "2. Visit your app: http://100.104.178.23:3000"
echo "3. Run ML scoring: ssh reachout-aws 'cd $SERVER_PATH && python3 scripts/compute_scores.py'"

# Also create a simpler update script for quick deployments
cat > update-server.sh << 'EOF'
#!/bin/bash
# Quick update script - use when only code changes
# Uses SSH config alias "reachout-aws"

SERVER="reachout-aws"
SERVER_PATH="/opt/reachoutHelper"

cd linkedin-outreach
npm run build
cd ..

rsync -avz -e ssh \
    --exclude='*.db' \
    --exclude='node_modules' \
    --exclude='.git' \
    linkedin-outreach/ "$SERVER:$SERVER_PATH/linkedin-outreach/"

ssh "$SERVER" "cd $SERVER_PATH/linkedin-outreach && npm install && pm2 restart linkedin-outreach"

echo "✅ Quick update completed!"
EOF

chmod +x update-server.sh

echo ""
echo "Quick update script created: ./update-server.sh"
echo "Use it for faster deployments when only code changes."