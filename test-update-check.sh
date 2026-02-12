#!/bin/bash
# Test the version update check banner
# Builds the app, serves it with a fake version.json, opens in browser
set -e

echo "🏗️  Building..."
npm run build --silent

echo "📝 Faking version.json to trigger update banner..."
echo '{"version":"fake-old-version"}' > dist/version.json

echo "🌐 Serving on http://localhost:8080"
echo "   Look for the gold '🔄 New version available' banner above the footer."
echo "   Click it — page should reload."
echo ""
echo "   Press Ctrl+C to stop."
npx serve dist -p 8080 -s
