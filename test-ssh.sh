#!/bin/bash

# Test SSH connection with your key
SSH_KEY="~/.ssh/Aadil's MBP.pem"
SERVER="ubuntu@100.104.178.23"

# Test different formats
echo "Testing SSH connection..."

# Method 1: Direct with tilde
echo "Method 1: Direct tilde"
ssh -i "~/.ssh/Aadil's MBP.pem" "$SERVER" "echo 'Connected!'"

echo ""

# Method 2: With HOME variable
echo "Method 2: Using HOME"
ssh -i "$HOME/.ssh/Aadil's MBP.pem" "$SERVER" "echo 'Connected!'"

echo ""

# Method 3: Full path
echo "Method 3: Full path"
ssh -i "/Users/aadils/.ssh/Aadil's MBP.pem" "$SERVER" "echo 'Connected!'"