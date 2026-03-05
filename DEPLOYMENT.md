# Deployment Guide for LinkedIn Outreach Helper

## Quick Start

### 1. First-Time Server Setup

**On your AWS server:**
```bash
# Pull the code
cd /opt
sudo git clone https://github.com/aadil-sengupta/reachoutHelper.git
sudo chown -R ubuntu:ubuntu reachoutHelper
cd reachoutHelper

# Run one-time setup
./setup-server.sh
```

**Ensure database files are in place:**
- Copy `crm.db` to `/opt/reachoutHelper/`
- Copy `analytics.duckdb` and `campaign_1_model.joblib` to `/opt/reachoutHelper/` (optional for ML)

### 2. Deploy Updates from Your Local Machine

**From your local machine:**
```bash
cd /path/to/reachoutHelper
./deploy.sh
```

This will:
- Build the Next.js app locally
- Upload code to server (preserving database files)
- Install dependencies
- Restart the service

### 3. Quick Updates (Code Changes Only)

For faster deployments when only code changes:
```bash
./update-server.sh
```

## Server Details

- **IP**: 100.104.178.23
- **User**: ubuntu
- **Path**: /opt/reachoutHelper
- **SSH Key**: ~/.ssh/Aadil's MBP.pem
- **Port**: 3000

## File Preservation

The deployment scripts automatically preserve:
- `crm.db` (main CRM database)
- `data/outreach.db` (outreach tracking)
- `analytics.duckdb` (ML embeddings)
- `campaign_1_model.joblib` (ML model)

## Manual Commands

**Check service status:**
```bash
ssh -i "~/.ssh/Aadil's MBP.pem" ubuntu@100.104.178.23 "cd /opt/reachoutHelper && pm2 status"
```

**View logs:**
```bash
ssh -i "~/.ssh/Aadil's MBP.pem" ubuntu@100.104.178.23 "cd /opt/reachoutHelper && pm2 logs reachoutHelper"
```

**Run ML scoring:**
```bash
ssh -i "~/.ssh/Aadil's MBP.pem" ubuntu@100.104.178.23 "cd /opt/reachoutHelper && python3 scripts/compute_scores.py"
```

## Troubleshooting

**If deployment fails:**
1. Check SSH key permissions: `chmod 600 ~/.ssh/Aadil's\ MBP.pem`
2. Verify server connectivity: `ssh -i "~/.ssh/Aadil's MBP.pem" ubuntu@100.104.178.23`
3. Check PM2 status on server

**If database files are missing:**
- Copy them manually to the server
- Ensure they have correct permissions (644)

## Next Steps

1. Run the ML scoring script to compute lead rankings
2. Access your app at: http://100.104.178.23:3000
3. Set up SSL/TLS if needed (using nginx reverse proxy)
4. Configure automatic backups for database files