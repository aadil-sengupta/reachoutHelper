#!/bin/bash

# Server setup script - run this once on your AWS server
# Usage: Run on the server after initial deployment

set -e

echo "🔧 Setting up LinkedIn Outreach Helper server..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2 for process management
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

# Create startup script
cat > /opt/reachoutHelper/start.sh << 'EOF'
#!/bin/bash
cd /opt/reachoutHelper/linkedin-outreach
npm start
EOF

chmod +x /opt/reachoutHelper/start.sh

# Create PM2 ecosystem file
cat > /opt/reachoutHelper/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'reachoutHelper',
    script: './linkedin-outreach/package.json',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

# Start the application with PM2
echo "Starting application with PM2..."
cd /opt/reachoutHelper
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Install Python dependencies for ML scoring
if ! command -v python3 &> /dev/null; then
    echo "Installing Python3..."
    sudo apt-get update
    sudo apt-get install -y python3 python3-pip
fi

# Install ML dependencies
if [ -f "scripts/requirements.txt" ]; then
    echo "Installing Python dependencies for ML scoring..."
    pip3 install -r scripts/requirements.txt
fi

echo -e "${GREEN}✅ Server setup completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Ensure your database files are in place:"
echo "   - /opt/reachoutHelper/crm.db"
echo "   - /opt/reachoutHelper/data/outreach.db"
echo "   - /opt/reachoutHelper/analytics.duckdb (optional)"
echo "   - /opt/reachoutHelper/campaign_1_model.joblib (optional)"
echo "2. Run ML scoring: cd /opt/reachoutHelper && python3 scripts/compute_scores.py"
echo "3. Check PM2 status: pm2 status"
echo "4. View logs: pm2 logs reachoutHelper"
echo ""
echo "Your app should be running on port 3000"