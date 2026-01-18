# Multimodal Gene-Brain Integration Project

A unified dashboard for tracking research progress across multiple repositories in the Gene-Brain project.

## Overview

This repository serves as the **central tracking hub** for the Multimodal Gene-Brain Integration Project. Individual team members maintain their own repositories for source code, while this hub aggregates:

- **Commit feeds** (on every push from team repos)
- **Daily logs** (end-of-day summaries, manually published after review)

The GitHub Pages site provides a single view of all team activity.

## Project Goal

We aim to construct a unified representation connecting:
- **DNA** (upstream biological blueprint)
- **Proteomic profiles** (intermediate molecular processes)
- **Brain imaging/phenotypic measurements** (downstream outcomes)

within a shared latent space that is predictive, generative, and interpretable.

## Team & Research Components

| Research Component | Member(s) | GitHub | Key Responsibility |
|---|---|---|---|
| Gene-Brain CCA & Prediction | 유은서 | allison-eunse | CCA between Gene FM embeddings and brain data; pilot regression for cognitive decline |
| LLM-based Evaluation | 이은지, 곽수지 | leee4321, sujigwak | Pipeline for interpreting CCA results via fine-tuned LLM |
| Genomic-Conditional Diffusion | 최승연, 민정윤 | syunchoi | Pilot diffusion model conditioned on genomic embeddings for brain image generation |
| Genomic FM | 김채연 | cykim-saihst | Gene region parsing for cognitive decline; regression with genomic embeddings |
| Gene-Text | 조은수 | ssikssikhan-cho | Training pipeline aligning DNA FM embeddings with LLM embeddings (NCBI/UniProt) |
| Proteomics Adapter | 김수현 | Shunamo | Multi-View Adapter with Gating Network for plasma proteomics |

## Repository Structure

```
gene-brain/
├── site/                      # GitHub Pages source
│   ├── index.html             # Home (project intro + team table)
│   ├── commits.html           # Commits dashboard
│   ├── daily.html             # Daily logs viewer
│   ├── log.html               # Single markdown viewer
│   ├── styles.css             # Theme (pastel + purple/blue/green)
│   ├── js/                    # Loaders, renderers, refresh logic
│   ├── config/
│   │   └── projects.json      # Member/repo roster
│   ├── assets/
│   │   └── project_overview.png
│   └── data/                  # Commit JSONs pushed by team repos
│       └── <owner>__<repo>/commits.json
├── team-tracking/             # Daily logs (markdown)
│   └── <owner>/<repo>/daily/YYYY-MM-DD.md
├── scripts/
│   └── build_pages_artifact.py
├── templates/
│   └── individual-project/
│       ├── sync_commits_to_central.yml
│       └── publish_today.sh
└── .github/workflows/
    └── pages.yml
```

## For Team Members (Individual Project Repo Setup)

### 1. Add the commit-sync workflow

Copy `templates/individual-project/sync_commits_to_central.yml` to your repo's `.github/workflows/`.

### 2. Set the required secret

Create a secret named `BIG_REPO_TOKEN` with a PAT that has write access to this central repo.

### 3. (Optional) Publish daily logs

Use `templates/individual-project/publish_today.sh` to push your reviewed `TODAY.md` to the central repo.

### Auto-Discovery

You don't need to tell the central repo your exact repository name. The dashboard will **automatically discover** any project that syncs commits. Projects will appear with their GitHub username and repo name.

To add custom display names (e.g., "Gene-Text" instead of "gene-text"), update `site/config/projects.json`.

---

See `PLAN.md` for implementation details and conventions.
