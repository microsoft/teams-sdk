# Release Process

This project uses [Nerdbank.GitVersioning](https://github.com/dotnet/Nerdbank.GitVersioning) for automatic version management.

## Creating a Release

1. **Create a branch from `release`** and merge `main` into it:
   ```bash
   git checkout -b prep-release/<next-version> release
   git merge origin/main
   ```
   - Set `version.json` to the stable version being released (e.g. remove the `-preview.{height}` suffix)
   - Commit and push

2. **Create a PR to `release`** (base: `release`, compare: `prep-release/<next-version>`):
   - The PR will include all changes from main plus the version bump
   - Get teammate approval and merge

3. **Trigger the release pipeline** for the `release` branch with **Public** publish type

4. **Bump the version on main** for the next release cycle:
   - Edit `version.json` on main
   - Increment the patch version (e.g. `"3.0-preview.{height}"` → `"3.1-preview.{height}"`)
   - Commit and push (or PR)

## Hotfixes

To fix a bug in a released version without including new preview changes:

1. **Consider if a normal release would work instead** - merging main to release includes all updates and is simpler. Only use a hotfix if you need to exclude preview changes from main.

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

## How Versioning Works

- Versions are computed automatically from git history based on `version.json`
- **Main branch**: `3.0.X-preview` (prerelease, published with `next` npm tag)
- **Release branch**: `3.0.X` (stable, published with `latest` npm tag)

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

To bump from `3.0.x` to `3.1.x` or `4.0.x`:

1. Edit `version.json` on main branch
2. Update the version (e.g. `"3.0-preview.{height}"` → `"3.1-preview.{height}"`)
3. Commit and push
