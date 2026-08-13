#!/usr/bin/env bash
# Push UDAAN to GitHub and open the PR.
# Requires a token with write access to the repo (fine-grained PAT needs
# "Contents: Read and write" + "Pull requests: Read and write").
#
# Usage:
#   GITHUB_TOKEN=github_pat_... bash scripts/push-to-github.sh
set -euo pipefail

: "${GITHUB_TOKEN:?Set GITHUB_TOKEN to a token with Contents+PullRequests write on Chun0/upsc}"

REPO="Chun0/upsc"
TOKEN="$GITHUB_TOKEN"
AUTH="Authorization: Bearer $TOKEN"

# verify write scope early
SCOPE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "https://api.github.com/repos/$REPO/issues" \
  -H "$AUTH" -H "Content-Type: application/json" -d '{"title":"scope-check"}' || true)
if [ "$SCOPE" = "403" ] || [ "$SCOPE" = "401" ]; then
  echo "✗ Token cannot write to $REPO (HTTP $SCOPE)."
  echo "  Fix: create a fine-grained PAT with Contents: Read and write +"
  echo "  Pull requests: Read and write, scoped to this repo, then retry."
  exit 1
fi

git checkout main
git push "https://x-access-token:${TOKEN}@github.com/${REPO}.git" main
git checkout feature/complete-app
git push "https://x-access-token:${TOKEN}@github.com/${REPO}.git" feature/complete-app

# open the PR (idempotent)
EXISTING=$(curl -s -H "$AUTH" "https://api.github.com/repos/$REPO/pulls?head=Chun0:feature/complete-app&state=open" | grep -o '"html_url": *"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$EXISTING" ]; then
  echo "PR already open: $EXISTING"
  exit 0
fi

RESP=$(curl -s -X POST "https://api.github.com/repos/$REPO/pulls" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{
    "title": "feat: UDAAN — complete AI-powered government exam prep app",
    "head": "feature/complete-app",
    "base": "main",
    "body": "Single-user, local-first exam prep copilot. 14 exams mapped, agentic master/slave Gemini orchestration with multi-key rotation and rate-limit buckets, AI quiz/mock/descriptive generation, predesigned markdown report cards (marked.js + SVG charts), mastery analytics, spaced-repetition revision, 3D UX. 80 unit tests + 9 live-model integration tests. See README.md and docs/."
  }')

URL=$(printf '%s' "$RESP" | grep -o '"html_url": *"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$URL" ]; then
  echo "PR created: $URL"
else
  echo "PR creation failed. GitHub said:"
  printf '%s\n' "$RESP" | head -20
  exit 1
fi
