import { apiFetch } from '../utils/http.js';

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

export interface AadApp {
  id: string;
  appId: string;
  displayName: string;
}

export interface ClientSecret {
  secretText: string;
  displayName: string;
  endDateTime: string;
}

export async function createAadApp(token: string, displayName: string): Promise<AadApp> {
  const response = await apiFetch(`${GRAPH_BASE_URL}/applications`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      displayName,
      signInAudience: 'AzureADMultipleOrgs',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create AAD app: ${response.status} ${error}`);
  }

  return response.json();
}

export async function getAadAppByClientId(token: string, clientId: string): Promise<AadApp> {
  const response = await apiFetch(`${GRAPH_BASE_URL}/applications?$filter=appId eq '${clientId}'`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to look up AAD app: ${response.status} ${error}`);
  }

  const data = (await response.json()) as { value: AadApp[] };
  if (data.value.length === 0) {
    throw new Error(`No AAD app found with clientId ${clientId}`);
  }

  return data.value[0];
}

/**
 * Get the full AAD application object by Graph object ID.
 * Returns all fields (unlike getAadAppByClientId which returns a subset).
 */
export async function getAadAppFull(
  token: string,
  appObjectId: string
): Promise<Record<string, unknown>> {
  const response = await apiFetch(`${GRAPH_BASE_URL}/applications/${appObjectId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get AAD app: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * PATCH an AAD application with partial updates.
 */
export async function updateAadApp(
  token: string,
  appObjectId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const response = await apiFetch(`${GRAPH_BASE_URL}/applications/${appObjectId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update AAD app: ${response.status} ${error}`);
  }
}

export async function createClientSecret(
  token: string,
  appRegistrationId: string
): Promise<ClientSecret> {
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 2);

  const response = await apiFetch(
    `${GRAPH_BASE_URL}/applications/${appRegistrationId}/addPassword`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        passwordCredential: {
          displayName: 'default',
          endDateTime: expiryDate.toISOString(),
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create client secret: ${response.status} ${error}`);
  }

  return response.json();
}
