#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const rootDir = path.resolve(__dirname, '..');

// Get version from nbgv
let version;
try {
  version = execSync('nbgv get-version -v NpmPackageVersion', {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
} catch (error) {
  console.error('Failed to get version from nbgv:', error.message);
  console.error('Make sure version.json exists and is committed to git.');
  process.exit(1);
}

if (!version || version === '0.0.0') {
  console.error('nbgv returned invalid version:', version);
  console.error('Make sure version.json exists and is committed to git.');
  process.exit(1);
}

console.log(`Setting version to ${version} (from nbgv)...\n`);

const files = [
  path.join(rootDir, 'package.json'),
  ...glob.sync('packages/*/package.json', { cwd: rootDir, absolute: true }),
];

files.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  const pkg = JSON.parse(content);
  const relativePath = path.relative(rootDir, file);

  // Update version for @microsoft/teams.* packages
  if (pkg.name && pkg.name.startsWith('@microsoft/teams')) {
    pkg.version = version;
  }

  // Update internal dependencies
  ['dependencies', 'devDependencies', 'peerDependencies'].forEach((depType) => {
    if (pkg[depType]) {
      Object.keys(pkg[depType]).forEach((dep) => {
        if (dep.startsWith('@microsoft/teams.')) {
          pkg[depType][dep] = version;
        }
      });
    }
  });

  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`  ${relativePath}`);
});

console.log(`\nDone. Updated ${files.length} files to version ${version}`);
