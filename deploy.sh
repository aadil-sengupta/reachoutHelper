#!/bin/bash

# Deployment script for LinkedIn Outreach Helper
# Usage: ./deploy.sh
#
# This script syncs source files to the server and builds there
# to avoid cross-platform native module issues (better-sqlite3)

set -e  # Exit on error

echo "Starting deployment..."

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
    ssh "$SERVER" "$1"
}

# Check if we're in the right directory
if [ ! -d "linkedin-outreach" ]; then
    echo -e "${RED}Error: linkedin-outreach directory not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Step 1: Ensure server directory structure exists
echo -e "${GREEN}Step 1: Setting up server directory structure...${NC}"
run_on_server "sudo mkdir -p $SERVER_PATH && sudo chown ubuntu:ubuntu $SERVER_PATH"
run_on_server "mkdir -p $SERVER_PATH/data $SERVER_PATH/scripts"

# Step 2: Sync source files to server (excluding build artifacts and databases)
echo -e "${GREEN}Step 2: Syncing source files to server...${NC}"

# Sync the linkedin-outreach app source (excluding sources.json which has server-specific paths)
rsync -avz --delete -e ssh \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='*.db' \
    --exclude='.git' \
    --exclude='.env.local' \
    --exclude='data/sources.json' \
    linkedin-outreach/ "$SERVER:$SERVER_PATH/"

# Sync scripts directory
rsync -avz -e ssh \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    scripts/ "$SERVER:$SERVER_PATH/scripts/"

# Step 3: Sync data directory (but preserve existing db files and sources.json)
echo -e "${GREEN}Step 3: Syncing data files (preserving databases)...${NC}"
rsync -avz -e ssh \
    --exclude='*.db' \
    --ignore-existing \
    data/ "$SERVER:$SERVER_PATH/data/" 2>/dev/null || true

# Step 4: Install dependencies and build on server
echo -e "${GREEN}Step 4: Installing dependencies on server...${NC}"
run_on_server "cd $SERVER_PATH && npm install"

echo -e "${GREEN}Step 5: Building application on server...${NC}"
run_on_server "cd $SERVER_PATH && npm run build"

# Step 6: Ensure database file exists
echo -e "${GREEN}Step 6: Ensuring database files exist...${NC}"
run_on_server "touch $SERVER_PATH/data/outreach.db && chmod 644 $SERVER_PATH/data/outreach.db"

# Step 7: Create sources.json if it doesn't exist
echo -e "${GREEN}Step 7: Checking sources.json...${NC}"
run_on_server "test -f $SERVER_PATH/data/sources.json && echo 'sources.json exists' || echo 'WARNING: sources.json does not exist - create it manually'"

# Step 8: Restart the service
echo -e "${GREEN}Step 8: Restarting service...${NC}"
run_on_server "cd $SERVER_PATH && pm2 restart linkedin-outreach 2>/dev/null || pm2 start npm --name 'linkedin-outreach' -- start"

# Step 9: Verify deployment
echo -e "${GREEN}Step 9: Verifying deployment...${NC}"
echo "Waiting for application to start..."
sleep 5

if run_on_server "curl -sf http://localhost:3000 > /dev/null 2>&1"; then
    echo -e "${GREEN}Deployment successful! Application is running on port 3000${NC}"
else
    echo -e "${YELLOW}Application may still be starting. Check server logs.${NC}"
    echo "View logs with: ssh reachout-aws 'pm2 logs linkedin-outreach --lines 50'"
fi

echo -e "${GREEN}Deployment completed!${NC}"
echo ""
echo "Server: $SERVER (100.104.178.23)"
echo "Path: $SERVER_PATH"
echo "URL: http://100.104.178.23:3000"
echo ""
echo "Useful commands:"
echo "  View logs:     ssh reachout-aws 'pm2 logs linkedin-outreach'"
echo "  Check status:  ssh reachout-aws 'pm2 status'"
echo "  Run ML scores: ssh reachout-aws 'cd $SERVER_PATH && python3 scripts/compute_scores.py'"
