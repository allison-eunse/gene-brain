#!/usr/bin/env python3
"""
Build script for GitHub Pages deployment.

This script:
1. Copies site/ to dist/
2. Copies team-tracking/ to dist/team-tracking/
3. Generates dist/data/daily-index.json by scanning team-tracking/**/daily/*.md
"""

import json
import os
import shutil
from pathlib import Path
from datetime import datetime
import re

ROOT = Path(__file__).parent.parent
SITE_DIR = ROOT / "site"
TEAM_TRACKING_DIR = ROOT / "team-tracking"
DIST_DIR = ROOT / "dist"


def clean_dist():
    """Remove existing dist directory."""
    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)


def copy_site():
    """Copy site/ to dist/."""
    shutil.copytree(SITE_DIR, DIST_DIR)


def copy_team_tracking():
    """Copy team-tracking/ to dist/team-tracking/."""
    if TEAM_TRACKING_DIR.exists():
        shutil.copytree(TEAM_TRACKING_DIR, DIST_DIR / "team-tracking")


def generate_daily_index():
    """
    Scan team-tracking/<owner>/<repo>/daily/*.md files and generate
    dist/data/daily-index.json with structure:
    {
      "owner__repo": ["2026-01-19", "2026-01-18", ...],
      ...
    }
    """
    index = {}
    date_pattern = re.compile(r"^\d{4}-\d{2}-\d{2}$")
    
    team_tracking_in_dist = DIST_DIR / "team-tracking"
    if not team_tracking_in_dist.exists():
        # No team-tracking directory, create empty index
        data_dir = DIST_DIR / "data"
        data_dir.mkdir(parents=True, exist_ok=True)
        (data_dir / "daily-index.json").write_text(json.dumps(index, indent=2))
        return

    # Walk through team-tracking/<owner>/<repo>/daily/*.md
    for owner_dir in team_tracking_in_dist.iterdir():
        if not owner_dir.is_dir():
            continue
        owner = owner_dir.name
        
        for repo_dir in owner_dir.iterdir():
            if not repo_dir.is_dir():
                continue
            repo = repo_dir.name
            
            daily_dir = repo_dir / "daily"
            if not daily_dir.exists():
                continue
            
            key = f"{owner}__{repo}"
            dates = []
            
            for md_file in daily_dir.glob("*.md"):
                date_str = md_file.stem  # filename without .md
                if date_pattern.match(date_str):
                    dates.append(date_str)
            
            if dates:
                # Sort descending (most recent first)
                dates.sort(reverse=True)
                index[key] = dates

    # Write the index
    data_dir = DIST_DIR / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "daily-index.json").write_text(
        json.dumps(index, indent=2, ensure_ascii=False)
    )
    print(f"Generated daily-index.json with {len(index)} project(s)")


def generate_data_index():
    """
    Scan dist/data/<key>/ folders to find all project keys that have commits.json.
    Generates dist/data/data-index.json with a list of keys.
    This allows the UI to auto-discover projects without needing them in projects.json.
    """
    data_dir = DIST_DIR / "data"
    keys = []
    
    if data_dir.exists():
        for subdir in data_dir.iterdir():
            if subdir.is_dir() and (subdir / "commits.json").exists():
                keys.append(subdir.name)
    
    keys.sort()
    (data_dir / "data-index.json").write_text(
        json.dumps(keys, indent=2, ensure_ascii=False)
    )
    print(f"Generated data-index.json with {len(keys)} project(s)")


def main():
    print("Building Pages artifact...")
    
    clean_dist()
    print("  - Cleaned dist/")
    
    copy_site()
    print("  - Copied site/ to dist/")
    
    copy_team_tracking()
    print("  - Copied team-tracking/ to dist/team-tracking/")
    
    generate_daily_index()
    print("  - Generated dist/data/daily-index.json")
    
    generate_data_index()
    print("  - Generated dist/data/data-index.json")
    
    print("Done! Artifact ready in dist/")


if __name__ == "__main__":
    main()
