# Release Process

This project uses [Nerdbank.GitVersioning](https://github.com/dotnet/Nerdbank.GitVersioning) for automatic version management.

## How Versioning Works

- Versions are computed automatically from git history based on `version.json`
- **Main branch**: `2.1.X-beta` (early development, published with `beta` npm tag)
- **Release branch**: `2.1.X-preview` (vetted releases, published with `preview` npm tag)

## Creating a Release

1. **Create a branch from `release`** and merge `main` into it:
   ```bash
   git checkout -b prep-release/<next-version> release
   git merge origin/main
   ```
   - Set `version.json` to `"2.1-preview.{height}"` (change `-beta` to `-preview`)
   - Commit and push

2. **Create a PR to `release`** (base: `release`, compare: `prep-release/<next-version>`):
   - The PR will include all changes from main plus the version suffix change
   - Get teammate approval and merge

3. **Trigger the release pipeline** for the `release` branch with **Public** publish type

4. **Bump the version on main** for the next release cycle (if needed):
   - Edit `version.json` on main
   - Increment the minor version (e.g. `"2.1-beta.{height}"` → `"2.2-beta.{height}"`)
   - Commit and push (or PR)

## Hotfixes

To fix a bug in a released version without including new beta changes:

1. **Consider if a normal release would work instead** - merging main to release includes all updates and is simpler. Only use a hotfix if you need to exclude beta changes from main.

2. **Create a branch from `release`**:
   ```bash
   git checkout release
   git checkout -b hotfix/fix-description
   ```

3. **Make your fix and commit**

4. **Create a PR to `release`**, get approval, and merge

5. **Trigger the release pipeline**

6. **Cherry-pick the fix back to main**:
   ```bash
   git checkout main
   git cherry-pick <commit-sha>
   git push origin main
   ```

## Publishing

The publish pipeline (`.azdo/publish.yml`) is manually triggered and requires selecting a **Publish Type**: `Internal` or `Public`.

1. Go to the pipeline in ADO
2. Click **Run pipeline**
3. Select the branch to build from
4. Choose a **Publish Type**:
   - **Internal** — publishes unsigned packages to the Azure Artifacts `TeamsSDKPreviews` npm feed. No approval required.
   - **Public** — signs and publishes packages to npm via ESRP. Requires approval via the ADO pipeline environment.
5. Pipeline runs: Build > Test > Stamp versions > Pack > Publish

The pipeline packs all non-private packages from `packages/`. Packages with `"private": true` in their `package.json` are skipped.

## Bumping Major/Minor Version

To bump from `2.1.x` to `2.2.x` or `3.0.x`:

1. Edit `version.json` on main branch
2. Update the version (e.g. `"2.1-beta.{height}"` → `"2.2-beta.{height}"`)
3. Commit and push
