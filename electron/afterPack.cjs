/**
 * electron-builder afterPack hook — remove unnecessary files to reduce package size.
 *
 * Runs after the app is packed but before the installer is built.
 * Removes:
 * - Source maps from game dist (~15MB)
 * - Vulkan/SwiftShader (software Vulkan fallback, not needed for Canvas 2D)
 */
const fs = require('fs');
const path = require('path');

exports.default = async function (context) {
  const appOutDir = context.appOutDir;
  let saved = 0;

  // Remove source maps from game dist (in resources/dist/)
  const distDir = path.join(appOutDir, 'resources', 'dist', 'assets');
  if (fs.existsSync(distDir)) {
    for (const file of fs.readdirSync(distDir)) {
      if (file.endsWith('.map')) {
        const fp = path.join(distDir, file);
        saved += fs.statSync(fp).size;
        fs.unlinkSync(fp);
      }
    }
  }

  // Remove Vulkan SwiftShader (software Vulkan fallback, not needed for Canvas 2D)
  // Use recursive search to handle platform-specific paths (e.g. macOS .app bundle)
  function removeRecursive(dir, patterns) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fp = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        removeRecursive(fp, patterns);
      } else if (patterns.some(p => entry.name === p)) {
        saved += fs.statSync(fp).size;
        fs.unlinkSync(fp);
      }
    }
  }
  removeRecursive(appOutDir, [
    'libvk_swiftshader.so', 'libvk_swiftshader.dylib',
    'vk_swiftshader.dll', 'vk_swiftshader_icd.json'
  ]);

  console.log(`  • afterPack: removed ${(saved / 1024 / 1024).toFixed(1)}MB of unnecessary files`);
};
