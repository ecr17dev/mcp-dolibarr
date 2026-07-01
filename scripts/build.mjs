/**
 * Build script con esbuild para crear bundle optimizado
 * Uso: node scripts/build.mjs
 */

import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// ============ CONFIG ============

const BUNDLE_OPTIONS = {
  entryPoints: [join(rootDir, 'src/index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: join(rootDir, 'dist/bundle.js'),
  external: [], // No external para bundle completo
  minify: true,
  sourcemap: true,
  metafile: true,
  logLevel: 'info',
};

// ============ HELPERS ============

function getSizeLabel(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============ BUILD ============

async function build() {
  console.log('\n📦 Building Dolibarr MCP Bundle...\n');

  // Ensure dist exists
  if (!existsSync(join(rootDir, 'dist'))) {
    mkdirSync(join(rootDir, 'dist'), { recursive: true });
  }

  try {
    const result = await esbuild.build(BUNDLE_OPTIONS);

    // Show bundle size
    if (result.metafile) {
      const outputs = Object.entries(result.metafile.outputs);
      console.log('\n📊 Bundle Stats:');
      for (const [file, info] of outputs) {
        const size = readFileSync(join(rootDir, file)).length;
        console.log(`  ${file}: ${getSizeLabel(size)}`);
        if (info.inputs) {
          console.log('  Dependencies:');
          for (const [dep, depInfo] of Object.entries(depInfo => depInfo.inputs || {})) {
            const depSize = depInfo.inputs ? Object.values(depInfo.inputs).reduce((sum, i) => sum + (i.bytesInOutput || 0), 0) : 0;
            // Skip showing dependency sizes for brevity
          }
        }
      }
    }

    console.log('\n✅ Bundle built successfully!\n');
    console.log('Output: dist/bundle.js');
    console.log('Run with: node dist/bundle.js\n');

  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

build();
