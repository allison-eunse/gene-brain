#!/bin/bash
#
# Publish TODAY.md to Central Hub
#
# This script copies your local TODAY.md to the central Gene-Brain hub
# as a dated daily log (YYYY-MM-DD.md).
#
# SETUP:
# 1. Copy this script to your project repo root
# 2. Make it executable: chmod +x publish_today.sh
# 3. Set environment variables or edit the defaults below:
#    - BIG_REPO: central repo (default: allison-eunse/gene-brain)
#    - OWNER: your GitHub username (auto-detected from git remote if not set)
#    - REPO: this repo name (auto-detected from git remote if not set)
# 4. Ensure you have push access to the central repo (via SSH or HTTPS with token)
#
# USAGE:
# 1. Create/edit TODAY.md in your repo root (use AI or write manually)
# 2. Review the content
# 3. Run: ./publish_today.sh
#

set -e

# Configuration
BIG_REPO="${BIG_REPO:-allison-eunse/gene-brain}"
TODAY_FILE="${TODAY_FILE:-TODAY.md}"
DATE=$(date +%Y-%m-%d)

# Auto-detect owner and repo from git remote
if [ -z "$OWNER" ] || [ -z "$REPO" ]; then
  REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
  if [[ "$REMOTE_URL" =~ github\.com[:/]([^/]+)/([^/.]+) ]]; then
    OWNER="${OWNER:-${BASH_REMATCH[1]}}"
    REPO="${REPO:-${BASH_REMATCH[2]}}"
  fi
fi

if [ -z "$OWNER" ] || [ -z "$REPO" ]; then
  echo "Error: Could not detect OWNER and REPO. Please set them manually."
  exit 1
fi

# Check TODAY.md exists
if [ ! -f "$TODAY_FILE" ]; then
  echo "Error: $TODAY_FILE not found."
  echo "Create your daily log first, then run this script."
  exit 1
fi

echo "Publishing daily log..."
echo "  From: $TODAY_FILE"
echo "  To: $BIG_REPO -> team-tracking/$OWNER/$REPO/daily/$DATE.md"
echo ""

# Create temp directory for central repo
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Clone central repo (shallow)
echo "Cloning central repo..."
git clone --depth=1 "https://github.com/$BIG_REPO.git" "$TEMP_DIR/central" 2>/dev/null || \
git clone --depth=1 "git@github.com:$BIG_REPO.git" "$TEMP_DIR/central"

# Create destination directory
DEST_DIR="$TEMP_DIR/central/team-tracking/$OWNER/$REPO/daily"
mkdir -p "$DEST_DIR"

# Copy TODAY.md
cp "$TODAY_FILE" "$DEST_DIR/$DATE.md"
echo "Copied to $DEST_DIR/$DATE.md"

# Commit and push
cd "$TEMP_DIR/central"
git config user.name "$(git config user.name || echo 'Daily Log Publisher')"
git config user.email "$(git config user.email || echo 'noreply@github.com')"

git add team-tracking/
if git diff --cached --quiet; then
  echo "No changes to commit (log already exists for $DATE)"
  exit 0
fi

git commit -m "docs: daily log for $OWNER/$REPO ($DATE)"
git push

echo ""
echo "✅ Daily log published successfully!"
echo "   View at: https://github.com/$BIG_REPO/blob/main/team-tracking/$OWNER/$REPO/daily/$DATE.md"
