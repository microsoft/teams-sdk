# Troubleshooting Guide

Common errors and solutions for Teams bot infrastructure.

---

## Cannot Install App (Sideloading Disabled)

**Symptom:** Install link shows "Permission denied", "Custom apps are blocked", or similar message

**Cause:** Tenant administrator has disabled custom app upload (sideloading)

**Solution:**

1. Contact your tenant administrator
2. Request they enable custom app upload
3. Reference documentation: https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/prepare-your-o365-tenant#enable-custom-teams-apps-and-configure-custom-app-upload-settings

**Admin steps:** Admin must enable "Allow interaction with custom apps" in Teams admin center.

---

## "This app cannot be found" Error

**Symptom:** Install link shows "This app cannot be found", "App not found", or "We couldn't find this app" when trying to install

**Cause:** The app was created in a different Microsoft 365 tenant than where you're trying to install it

**Common scenario:** App was created in the Microsoft 365 Developer Program tenant (https://developer.microsoft.com/en-us/microsoft-365/dev-program) but you're trying to install it in your work/organization tenant

**Solution:**

1. Open Teams in the same tenant where you created the app
2. If using M365 Developer Program, sign into Teams with your developer account
3. Use the install link - it will now work

---

## Transient Installation Error After Creation

**Symptom:** Install link fails immediately after creating the app, but works after waiting a few minutes

**Cause:** App registration is still propagating through Microsoft's backend systems

**Solution:**

1. Wait 1-2 minutes after app creation
2. Retry the install link
3. The app should install successfully once propagation completes

**Note:** This is a known transient issue that resolves itself. If the issue persists beyond 5 minutes, check for other causes above.

---

## AUTH_REQUIRED Error

**Symptom:** Command fails with "Not logged in", "AUTH_REQUIRED", or "authentication required" message

**Cause:** Not authenticated or authentication token expired

**Solution:**

1. Run: `teams login`
2. Complete authentication flow
3. Verify: Run `teams status` and confirm authenticated
4. Retry the original command

---

## AUTH_TOKEN_FAILED Error

**Symptom:** Command fails with "Failed to get token" or "AUTH_TOKEN_FAILED" message

**Cause:** Token acquisition failed (expired, corrupted, or network issue)

**Solution:**

1. Run: `teams login` again to refresh tokens
2. Verify: Run `teams status` shows authenticated
3. Retry the original command

---

## SSO Configuration Issues

If you're experiencing SSO-related errors during or after setup:

1. Run the diagnostic: `teams app doctor <teamsAppId>`
2. Review which checks are failing
3. Common issues:
   - **Missing identifier URI**: Re-run PATCH 1 from the SSO guide
   - **Scope not found**: Wait 15 seconds for AAD replication, then retry PATCH 2
   - **Pre-authorized apps missing**: Re-run PATCH 2
   - **OAuth connection mismatch**: Verify `tokenExchangeUrl` matches `api://botid-<botId>`

---

## Bot Migration Issues

If bot migration fails or you need to check migration status:

**Check current bot location:**
```bash
teams app bot get <teamsAppId>
```

**Common migration errors:**
- **Resource group doesn't exist**: Re-run migration with `teams app bot migrate <teamsAppId> --create-resource-group --region <azureRegion>`, or create it manually with `az group create --name <resourceGroupName> --location <azureRegion>`
- **Insufficient permissions**: Ensure you have Contributor role on the subscription
- **Region mismatch**: Bot, resource group, and the `--region <azureRegion>` passed to migration must all use the same Azure region

---

## Next Steps

If your issue isn't listed here:
1. Check the command's error message for specific guidance
2. Verify prerequisites are met (authentication, CLI version, etc.)
3. Consult the Teams SDK repository: https://github.com/microsoft/teams-sdk
4. For Teams platform issues, see: https://learn.microsoft.com/en-us/microsoftteams/platform/
