import { google } from 'googleapis';
import CompanyIntegration from '../models/CompanyIntegration.js';
import { Company } from '@petbuddy/shared';
import { config } from '../config/env.js';

function assertEnv() {
  const { clientId, clientSecret, redirectUri } = config.google;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Missing Google OAuth env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI'
    );
  }
}

export function createOAuth2Client() {
  assertEnv();
  const { clientId, clientSecret, redirectUri } = config.google;
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function generateAuthUrl(companyId) {
  const oauth2 = createOAuth2Client();
  const statePayload = JSON.stringify({ companyId });
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: config.google.scopes,
    state: Buffer.from(statePayload).toString('base64'),
  });
}

export async function exchangeCodeForTokens(code) {
  const oauth2 = createOAuth2Client();
  const { tokens } = await oauth2.getToken(code);
  return tokens;
}

export async function saveTokens(companyId, tokens) {
  const update = {};
  if (tokens.access_token) update.googleAccessToken = tokens.access_token;
  if (tokens.refresh_token) update.googleRefreshToken = tokens.refresh_token;
  // Try to fetch account email
  try {
    const oauth2 = createOAuth2Client();
    oauth2.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });
    const oauth2api = google.oauth2({ version: 'v2', auth: oauth2 });
    const me = await oauth2api.userinfo.get();
    if (me?.data?.email) update.googleAccountEmail = me.data.email;
  } catch (err) {
    console.warn('Failed to fetch Google account email (non-fatal):', err?.message);
  }

  await CompanyIntegration.findOneAndUpdate(
    { companyId },
    { $set: update },
    { upsert: true, new: true }
  );
}

export async function getAuthedClientByCompany(companyId) {
  const integ = await CompanyIntegration.findOne({ companyId }).lean();
  if (!integ?.googleRefreshToken) {
    const err = new Error('GOOGLE_NOT_CONNECTED');
    err.code = 'GOOGLE_NOT_CONNECTED';
    throw err;
  }
  const oauth2 = createOAuth2Client();
  oauth2.setCredentials({
    access_token: integ.googleAccessToken || undefined,
    refresh_token: integ.googleRefreshToken,
  });
  return oauth2;
}

async function persistNewAccessTokenIfChanged(companyId, oauth2) {
  const current = await CompanyIntegration.findOne({ companyId }).lean();
  const newToken = oauth2.credentials?.access_token;
  if (newToken && newToken !== current?.googleAccessToken) {
    await CompanyIntegration.updateOne({ companyId }, { $set: { googleAccessToken: newToken } });
  }
}

async function markLastSync(companyId) {
  await CompanyIntegration.updateOne({ companyId }, { $set: { lastGoogleSyncAt: new Date() } });
}

export async function listCalendars(companyId) {
  const auth = await getAuthedClientByCompany(companyId);
  const calendar = google.calendar({ version: 'v3', auth });
  const { data } = await calendar.calendarList.list();
  await persistNewAccessTokenIfChanged(companyId, auth);
  const items = Array.isArray(data.items) ? data.items : [];
  return items.map(it => ({ id: it.id, summary: it.summary, primary: !!it.primary }));
}

export async function setSelectedCalendar(companyId, calendarId) {
  // Also store human summary for UI
  let summary = '';
  try {
    const auth = await getAuthedClientByCompany(companyId);
    const calendar = google.calendar({ version: 'v3', auth });
    const { data } = await calendar.calendars.get({ calendarId });
    summary = data?.summary || '';
    await persistNewAccessTokenIfChanged(companyId, auth);
  } catch (err) {
    console.warn('Failed to fetch calendar summary (non-fatal):', err?.message);
  }

  await CompanyIntegration.findOneAndUpdate(
    { companyId },
    { $set: { googleCalendarId: calendarId, googleCalendarSummary: summary } },
    { upsert: true, new: true }
  );
}

export async function getSelectedCalendarId(companyId) {
  const integ = await CompanyIntegration.findOne({ companyId }, 'googleCalendarId').lean();
  return integ?.googleCalendarId || null;
}

export async function revokeCompanyTokens(companyId) {
  const integ = await CompanyIntegration.findOne({ companyId }).lean();
  if (!integ) return;
  const oauth2 = createOAuth2Client();
  try {
    if (integ.googleAccessToken) {
      await oauth2.revokeToken(integ.googleAccessToken);
    }
  } catch {}
  try {
    if (integ.googleRefreshToken) {
      await oauth2.revokeToken(integ.googleRefreshToken);
    }
  } catch {}
  await CompanyIntegration.updateOne(
    { companyId },
    {
      $unset: {
        googleAccessToken: '',
        googleRefreshToken: '',
        googleCalendarId: '',
        googleCalendarSummary: '',
      },
    }
  );
}

export async function getGoogleSettings(companyId) {
  const integ = await CompanyIntegration.findOne({ companyId }).lean();
  return {
    autoSync: integ?.googleAutoSync ?? true,
    calendarId: integ?.googleCalendarId || '',
    calendarName: integ?.googleCalendarSummary || '',
    accountEmail: integ?.googleAccountEmail || '',
    connected: !!integ?.googleRefreshToken,
    lastSync: integ?.lastGoogleSyncAt || null,
  };
}

export async function setGoogleAutoSync(companyId, autoSync) {
  await CompanyIntegration.findOneAndUpdate(
    { companyId },
    { $set: { googleAutoSync: !!autoSync } },
    { upsert: true }
  );
}

export { markLastSync };
