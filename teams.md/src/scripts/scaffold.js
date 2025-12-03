#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createFileIfNotExists(filePath, content = '') {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
  }
}

function scaffold(userInput) {
  // If path starts with src/ but is not a valid base, fail
  if (
    /^src\//.test(userInput) &&
    !/^src\/pages\/templates\//.test(userInput) &&
    !/^src\/components\/include\//.test(userInput)
  ) {
    console.error('Error: Path is outside of allowed base directories.');
    process.exit(1);
  }

  // Normalize input
  let relPath = userInput
    .replace(/^src\/(pages\/templates|components\/include)\/?/, '')
    .replace(/^[/.]+/, '');
  let isTemplates = false;
  let isInclude = false;
  // Detect if user input is for templates or include
  if (/^(src\/)?pages\/templates\//.test(userInput) || userInput.startsWith('templates/')) {
    isTemplates = true;
  } else if (/^(src\/)?components\/include\//.test(userInput) || userInput.startsWith('include/')) {
    isInclude = true;
  }

  // If user gave a full path, strip to relative
  if (isTemplates) {
    relPath = userInput.replace(/^(src\/)?pages\/templates\/?/, '');
    // Fail if userInput is not under templatesBase
    const templatesBase = path.resolve(__dirname, '../pages/templates');
    const absTarget = path.resolve(templatesBase, relPath);
    if (!absTarget.startsWith(templatesBase)) {
      console.error('Error: Path is outside of templates base directory.');
      process.exit(1);
    }
  } else if (isInclude) {
    relPath = userInput.replace(/^(src\/)?components\/include\/?/, '');
    // Fail if userInput is not under includeBase
    const includeBase = path.resolve(__dirname, '../components/include');
    const absTarget = path.resolve(includeBase, relPath);
    if (!absTarget.startsWith(includeBase)) {
      console.error('Error: Path is outside of include base directory.');
      process.exit(1);
    }
  }

  // Helper to walk and create files in every directory
  function walkAndCreate(base, relPath, filesFn) {
    const parts = relPath.split('/').filter(Boolean);
    let curr = base;
    for (const part of parts) {
      curr = path.join(curr, part);
      ensureDirSync(curr);
      filesFn(curr);
    }
    return curr;
  }

  // If ambiguous, create both
  if (!isTemplates && !isInclude) {
    const templatesBase = path.join(__dirname, '../pages/templates');
    const includeBase = path.join(__dirname, '../components/include');
    const templatesTarget = walkAndCreate(templatesBase, relPath, (dir) => {
      createFileIfNotExists(path.join(dir, '_category.json'), '{\n  "label": "New Category"\n}\n');
      createFileIfNotExists(path.join(dir, 'README.mdx'), '# New Template\n');
    });
    const includeTarget = walkAndCreate(includeBase, relPath, (dir) => {
      createFileIfNotExists(path.join(dir, 'typescript.incl.md'), '# Typescript Include\n');
    });
    return { templatesTarget, includeTarget };
  }
  if (isTemplates) {
    const templatesBase = path.join(__dirname, '../pages/templates');
    const templatesTarget = walkAndCreate(templatesBase, relPath, (dir) => {
      createFileIfNotExists(path.join(dir, '_category.json'), '{\n  "label": "New Category"\n}\n');
      createFileIfNotExists(path.join(dir, 'README.mdx'), '# New Template\n');
    });
    return { templatesTarget };
  }
  if (isInclude) {
    const includeBase = path.join(__dirname, '../components/include');
    const includeTarget = walkAndCreate(includeBase, relPath, (dir) => {
      createFileIfNotExists(path.join(dir, 'typescript.incl.md'), '# Typescript Include\n');
    });
    return { includeTarget };
  }
}

const userPath = process.argv[2];
function isValidPath(p) {
  if (!p || typeof p !== 'string') return false;
  if (p.startsWith('/') || p.includes('..') || p.trim() === '') return false;
  return true;
}

if (!isValidPath(userPath)) {
  console.error(
    'Error: Invalid path. Use a relative path like "templates/new/two" or "include/new/two". Do not start with a slash or use "..".'
  );
  process.exit(1);
}

const created = scaffold(userPath);
if (created) {
  if (created.templatesTarget && created.includeTarget) {
    console.log(
      `Scaffolded:\n  Template: ${created.templatesTarget}\n  Include:  ${created.includeTarget}`
    );
  } else if (created.templatesTarget) {
    console.log(`Scaffolded Template: ${created.templatesTarget}`);
  } else if (created.includeTarget) {
    console.log(`Scaffolded Include: ${created.includeTarget}`);
  }
}
