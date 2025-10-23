<!-- managed-identity-setup -->

In your `main.py`, replace the initialization:
```python
app = App(plugins=[DevToolsPlugin()])
```
with the following code to enable User Assigned Managed Identity authentication: 
```python
# Create token factory function for Azure Identity
def create_token_factory():
    def get_token(scopes, tenant_id=None):
        credential = ManagedIdentityCredential(client_id=os.environ.get("CLIENT_ID"))
        if isinstance(scopes, str):
            scopes_list = [scopes]
        else:
            scopes_list = scopes
        token = credential.get_token(*scopes_list)
        return token.token
    return get_token

app = App(
    token=create_token_factory(),
    plugins=[DevtoolsPlugin()]
)
```
The `create_token_factory` function provides a method to retrieve access tokens from Azure on demand, and `token_credentials` passes this method to the app.

<!-- service-principal-error -->

```sh
[ERROR] @teams/app Failed to refresh bot token: Client error '401 Unauthorized' for url 'https://login.microsoftonline.com/aaaabbbb-0000-cccc-1111-dddd2222eeee/oauth2/v2.0/token'
[ERROR] @teams/app For more information check: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401
```