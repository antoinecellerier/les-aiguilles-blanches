/**
 * electron-builder afterPack hook — remove unnecessary files to reduce AppImage size.
 *
 * Runs after the app is packed but before the installer is built.
 * Removes:
 * - Source maps from game dist (~15MB)
 * - Vulkan/SwiftShader libs (game uses Canvas 2D, not WebGL) (~11MB)
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
        const size = fs.statSync(fp).size;
        fs.unlinkSync(fp);
        saved += size;
      }
    }
  }

  // Remove Vulkan SwiftShader (software Vulkan fallback, not needed for Canvas 2D)
  const gpuFiles = ['libvk_swiftshader.so', 'vk_swiftshader_icd.json'];
  for (const name of gpuFiles) {
    const fp = path.join(appOutDir, name);
    if (fs.existsSync(fp)) {
      const size = fs.statSync(fp).size;
      fs.unlinkSync(fp);
      saved += size;
    }
  }

  console.log(`  • afterPack: removed ${(saved / 1024 / 1024).toFixed(1)}MB of unnecessary files`);
};
