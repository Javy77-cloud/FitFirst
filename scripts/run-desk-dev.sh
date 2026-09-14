#!/bin/bash
cd /Users/franciscogarcia/FitFirst || exit 1
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"
export GEMINI_MODEL="${GEMINI_MODEL:-gemini-3.6-flash}"
# Prefer local next binary
exec ./node_modules/.bin/next dev --port 43147 --hostname 0.0.0.0
