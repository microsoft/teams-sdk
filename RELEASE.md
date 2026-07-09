# Release Process

This project uses [Nerdbank.GitVersioning](https://github.com/dotnet/Nerdbank.GitVersioning) for automatic version management on prerelease branches. Stable release branches use explicit, manually-bumped versions.

## How Versioning Works

Versions are computed from `version.json` and git history.

- **Main branch**: active development.
- **Preview branch**: public preview releases.
- **Release branch**: stable releases. For v3, use `release/v3`.
- **Release refs** are configured in `version.json` via `publicReleaseRefSpec`; keep this in sync with any release branch name changes.
- **Preview versions** use a prerelease suffix and automatic height, for example `3.1-preview.{height}`. This produces versions like `3.1.0-preview.12`.
- **Stable versions** are hard-coded on the release branch, for example `3.0.0` or `3.0.1`.

The publish pipeline determines the npm tag from the computed version:

- `*-beta*` → `beta`
- `*-preview*` → `preview`
- any other prerelease → `next`
- stable versions → `latest`

Do not use a stable-looking version such as `3.1.{height}` for preview releases. Without a prerelease suffix, the publish pipeline treats the package as stable and publishes it with the `latest` npm tag.

## Creating a Preview Release

1. **Prepare the `preview` branch:**

   - Create or update the `preview` branch from the commit you want to ship.
   - Set `version.json` to the preview version line, for example `"3.1-preview.{height}"`.
   - Update docs and install instructions to use the preview package where appropriate:

     ```bash
     npm install -g @microsoft/teams.cli@preview
     ```

2. **Create a PR to `preview`**, get approval, and merge.

3. **Trigger the publish pipeline** for `preview` with **Public** publish type.

   The pipeline stamps versions, packs packages, signs them, and publishes preview packages to npm with the `preview` tag.

4. **Verify the preview release:**

   ```bash
   npm view @microsoft/teams.cli dist-tags
   npm view @microsoft/teams.cli@preview version
   ```

## Creating a Stable Release

1. **Prepare the stable release branch:**

   - Create or update `release/v3` from the commit you want to ship.
   - Set `version.json` to an explicit stable version, for example `"3.0.0"`.
   - For patches, bump the version manually, for example from `"3.0.0"` to `"3.0.1"`.
   - Update package metadata if it still has a prerelease placeholder version.
   - Update docs and install instructions to use the stable package:

     ```bash
     npm install -g @microsoft/teams.cli
     ```

   - Make sure CLI self-update points at npm `latest`.

2. **Create a PR to `release/v3`**, get approval, and merge.

3. **Trigger the publish pipeline** for `release/v3` with **Public** publish type.

   The pipeline stamps versions, packs packages, signs them, and publishes stable packages to npm with the `latest` tag.

4. **Verify the stable release:**

   ```bash
   npm view @microsoft/teams.cli dist-tags
   npm view @microsoft/teams.cli@latest version
   ```

5. **Create a GitHub Release for the CLI stable version:**

   Cut one GitHub Release per stable CLI version so the changes for each patch are discoverable. Tag it with the `cli-<version>` prefix, targeting the merged release commit on `release/v3`. Scope the notes to `@microsoft/teams.cli` changes since the previous stable tag, and mark the newest release as `latest`.

   ```bash
   gh release create "cli-<version>" \
     --target "$(git rev-parse origin/release/v3)" \
     --title "Teams Developer CLI <version>" \
     --notes-file notes.md \
     --latest
   ```

   To find the CLI changes since the previous patch, diff `packages/cli` between the two release commits (for example `git log <prev-tag>..<new-tag> --oneline -- packages/cli`), summarize the notable fixes/features with their PR numbers, and save that summary to `notes.md`.

6. **Bump `main` for the next development cycle** if needed:
   - Edit `version.json` on `main`.
   - For example, move to `"3.1-preview.{height}"` or `"3.1-beta.{height}"`.
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
