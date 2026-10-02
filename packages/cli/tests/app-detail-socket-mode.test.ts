import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetchAppDetailsV2 = vi.fn();
const mockFetchBot = vi.fn();
const mockGetConfig = vi.fn();
const mockIsApiAvailable = vi.fn();

vi.mock('../src/apps/api.js', () => ({
  fetchApp: vi.fn(),
  fetchAppDetailsV2: mockFetchAppDetailsV2,
}));
vi.mock('../src/apps/tdp.js', () => ({ fetchBot: mockFetchBot }));
vi.mock('../src/apps/bot-communication.js', () => ({
  getBotCommunicationConfiguration: mockGetConfig,
  isBotCommunicationApiAvailable: mockIsApiAvailable,
}));
vi.mock('../src/utils/spinner.js', () => ({
  createSilentSpinner: () => ({ start: vi.fn().mockReturnThis(), stop: vi.fn() }),
}));

const { fetchAppDetail } = await import('../src/apps/home.js');

const summary = { teamsAppId: 'app-1' } as Parameters<typeof fetchAppDetail>[0];

describe('fetchAppDetail socketMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchAppDetailsV2.mockResolvedValue({ teamsAppId: 'app-1', bots: [{ botId: 'bot-1' }] });
    mockFetchBot.mockResolvedValue({ messagingEndpoint: '' });
    mockIsApiAvailable.mockReturnValue(true);
  });

  it('reports the stored socket mode for a Teams-managed bot', async () => {
    mockGetConfig.mockResolvedValue({ endpointConfiguration: { supportsSocketMode: true } });

    const result = await fetchAppDetail(summary, 'token', true);

    expect(mockGetConfig).toHaveBeenCalledWith('token', 'bot-1');
    expect(result.socketMode).toBe(true);
  });

  it('treats a missing configuration as HTTP', async () => {
    mockGetConfig.mockResolvedValue(null);

    expect((await fetchAppDetail(summary, 'token', true)).socketMode).toBe(false);
  });

  it('returns null when the read fails', async () => {
    mockGetConfig.mockRejectedValue(new Error('Forbidden'));

    expect((await fetchAppDetail(summary, 'token', true)).socketMode).toBeNull();
  });

  it('skips the lookup when the API is unavailable', async () => {
    mockIsApiAvailable.mockReturnValue(false);

    expect((await fetchAppDetail(summary, 'token', true)).socketMode).toBeNull();
    expect(mockGetConfig).not.toHaveBeenCalled();
  });

  it('skips the lookup for non-Teams-managed bots', async () => {
    mockFetchBot.mockRejectedValue(new Error('Not found'));

    expect((await fetchAppDetail(summary, 'token', true)).socketMode).toBeNull();
    expect(mockGetConfig).not.toHaveBeenCalled();
  });
});
