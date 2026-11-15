import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

fs.mkdirSync(distDir, { recursive: true });

// If Vite emitted dist/index.html from root src/ui/index.html, rename/copy to dist/ui.html
const emittedIndexHtml = path.resolve(distDir, 'index.html');
const targetUiHtml = path.resolve(distDir, 'ui.html');
if (fs.existsSync(emittedIndexHtml)) {
  fs.renameSync(emittedIndexHtml, targetUiHtml);
}

await esbuild.build({
  entryPoints: [path.resolve(rootDir, 'src/plugin/main.ts')],
  bundle: true,
  outfile: path.resolve(distDir, 'plugin.js'),
  format: 'iife',
  target: 'es2018',
  platform: 'neutral',
  mainFields: ['module', 'main'],
  sourcemap: false,
  minify: false,
  logLevel: 'info',
  tsconfig: path.resolve(rootDir, 'tsconfig.plugin.json'),
});

console.log('Built dist/plugin.js and verified dist/ui.html');
