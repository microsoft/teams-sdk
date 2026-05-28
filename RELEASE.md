# Release Process

This project uses [Nerdbank.GitVersioning](https://github.com/dotnet/Nerdbank.GitVersioning) for automatic version management.

## How Versioning Works

Versions are computed automatically from git history based on `version.json`.

- **Main branch**: active development.
- **Preview branch**: preview releases.
- **Release branch**: stable releases.
- Versions without a prerelease suffix are stable releases, for example `3.0.{height}`.
- Versions with a prerelease suffix are prereleases, for example `3.1-beta.{height}`.

The publish pipeline determines the npm tag from the computed version:

- `*-beta*` → `beta`
- `*-preview*` → `preview`
- any other prerelease → `next`
- stable versions → `latest`

## Creating a Stable Release

1. **Prepare the release branch:**

   - Create or update the `release` branch from the commit you want to ship.
   - Set `version.json` to the stable version line, for example `"3.0.{height}"`.
   - Update package metadata if it still has a prerelease placeholder version.
   - Update docs and install instructions to use the stable package:

     ```bash
     npm install -g @microsoft/teams.cli
     ```

   - Make sure CLI self-update points at npm `latest`.

2. **Create a PR to `release`**, get approval, and merge.

3. **Trigger the publish pipeline** for `release` with **Public** publish type.

   The pipeline stamps versions, packs packages, signs them, and publishes stable packages to npm with the `latest` tag.

4. **Verify the release:**

   ```bash
   npm view @microsoft/teams.cli dist-tags
   npm view @microsoft/teams.cli@latest version
   ```

5. **Bump `main` for the next development cycle** if needed:
   - Edit `version.json` on `main`.
   - For example, move from `"3.0.{height}"` to `"3.1-beta.{height}"`.
   - Commit and push via PR.

## Publishing

The publish pipeline (`.azdo/publish.yml`) is manually triggered and requires selecting a **Publish Type**: `Internal` or `Public`.

1. Go to the pipeline in ADO.
2. Click **Run pipeline**.
3. Select the branch to build from.
4. Choose a **Publish Type**:
   - **Internal** — publishes unsigned packages to the Azure Artifacts `TeamsSDKPreviews` npm feed. No approval required.
   - **Public** — signs and publishes packages to npm via ESRP. Requires approval via the ADO pipeline environment.
5. Pipeline runs: Build > Test > Stamp versions > Pack > Publish.

The pipeline packs all non-private packages from `packages/`. Packages with `"private": true` in their `package.json` are skipped.
