import { config } from '../config/env.js';

// Fetch app access token using client credentials
export async function getAppAccessToken() {
  const version = config.facebook?.graphVersion || 'v18.0';
  const appId = config.facebook?.appId;
  const appSecret = config.facebook?.appSecret;
  if (!appId || !appSecret) {
    throw new Error('FACEBOOK_APP_ID and FACEBOOK_APP_SECRET must be set');
  }

  const url = `https://graph.facebook.com/${version}/oauth/access_token?client_id=${encodeURIComponent(
    appId
  )}&client_secret=${encodeURIComponent(appSecret)}&grant_type=client_credentials`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch app access token: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.access_token;
}

// Inspect an access token to determine expiry, scopes, and type via debug_token
export async function debugAccessToken(inputToken) {
  const version = config.facebook?.graphVersion || 'v18.0';
  const appAccessToken = await getAppAccessToken();
  const url = `https://graph.facebook.com/${version}/debug_token?input_token=${encodeURIComponent(
    inputToken
  )}&access_token=${encodeURIComponent(appAccessToken)}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to debug token: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data?.data || {};
}

// Exchange a system user token for a page token (permanent style via system user)
// Requires: system user access token with pages_messaging, pages_manage_metadata, etc.
export async function getPageTokenFromSystemUser(pageId, systemUserAccessToken) {
  if (!pageId || !systemUserAccessToken) {
    throw new Error('pageId and systemUserAccessToken are required');
  }
  const version = config.facebook?.graphVersion || 'v18.0';
  const url = `https://graph.facebook.com/${version}/${encodeURIComponent(
    pageId
  )}?fields=access_token&access_token=${encodeURIComponent(systemUserAccessToken)}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch page token via system user: ${res.status} ${text}`);
  }
  const data = await res.json();
  const pageAccessToken = data?.access_token;
  if (!pageAccessToken) {
    throw new Error('No access_token returned for the page using system user');
  }
  return pageAccessToken;
}

// Fetch a Page Access Token using a (long-lived) User Access Token
// Similar to system user flow, but works with a regular user token that has page permissions
export async function getPageTokenFromUser(pageId, userAccessToken) {
  if (!pageId || !userAccessToken) {
    throw new Error('pageId and userAccessToken are required');
  }
  const version = config.facebook?.graphVersion || 'v18.0';
  const url = `https://graph.facebook.com/${version}/${encodeURIComponent(
    pageId
  )}?fields=access_token&access_token=${encodeURIComponent(userAccessToken)}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch page token via user token: ${res.status} ${text}`);
  }
  const data = await res.json();
  const pageAccessToken = data?.access_token;
  if (!pageAccessToken) {
    throw new Error('No access_token returned for the page using user token');
  }
  return pageAccessToken;
}

// Subscribe this app to a Facebook Page to receive webhooks and enable messaging
export async function subscribeAppToPage(pageId, pageAccessToken, subscribedFields = []) {
  if (!pageId || !pageAccessToken) {
    throw new Error('pageId and pageAccessToken are required');
  }
  const version = config.facebook?.graphVersion || 'v18.0';

  // Valid Page webhook fields to subscribe to (do NOT use login scopes here)
  const defaultFields = [
    'messages',
    'message_deliveries',
    'message_reads',
    'messaging_postbacks',
    'messaging_optins',
    'messaging_handovers',
    'standby',
  ];

  const fields = subscribedFields && subscribedFields.length > 0 ? subscribedFields : defaultFields;
  const url = `https://graph.facebook.com/${version}/${encodeURIComponent(
    pageId
  )}/subscribed_apps?subscribed_fields=${encodeURIComponent(fields.join(','))}&access_token=${encodeURIComponent(
    pageAccessToken
  )}`;

  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to subscribe app to page: ${res.status} ${text}`);
  }
  return true;
}

// Exchange short-lived user token for long-lived (60 days)
export async function exchangeForLongLivedToken(shortLivedToken) {
  const version = config.facebook?.graphVersion || 'v18.0';
  const appId = config.facebook?.appId;
  const appSecret = config.facebook?.appSecret;
  if (!appId || !appSecret) {
    throw new Error('FACEBOOK_APP_ID and FACEBOOK_APP_SECRET must be set');
  }
  const url = `https://graph.facebook.com/${version}/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&fb_exchange_token=${encodeURIComponent(shortLivedToken)}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to exchange token: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.access_token;
}
