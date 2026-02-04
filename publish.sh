#!/bin/bash
# Build and prepare the game for deployment
# Output: dist/ folder ready for static hosting

set -e

echo "🏔️ Building Les Aiguilles Blanches..."

# Clean previous build
rm -rf dist/

# Build with Vite
npm run build

# Verify build output
if [ ! -f "dist/index.html" ]; then
    echo "❌ Build failed: dist/index.html not found"
    exit 1
fi

echo ""
echo "✅ Build complete!"
echo ""
echo "📁 Output: dist/"
ls -lh dist/
echo ""
echo "📦 Assets:"
ls -lh dist/assets/
echo ""
echo "🚀 Ready for deployment. Upload the contents of dist/ to your web server."
