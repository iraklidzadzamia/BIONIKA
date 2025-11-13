import { google } from 'googleapis';
;
import CompanyIntegration from '../models/CompanyIntegration.js';
import { getAuthedClientByCompany, getSelectedCalendarId, markLastSync } from './googleService.js';
import { Appointment } from '@petbuddy/shared';

function buildEventBody(appointment) {
  const summaryParts = [];
  if (appointment.serviceId?.name) summaryParts.push(appointment.serviceId.name);
  if (appointment.petId?.name) summaryParts.push(`- ${appointment.petId.name}`);
  if (appointment.customerId?.fullName) summaryParts.push(`(${appointment.customerId.fullName})`);

  const descriptionLines = [];
  if (appointment.notes) descriptionLines.push(appointment.notes);
  if (appointment.customerId?.phone)
    descriptionLines.push(`Phone: ${appointment.customerId.phone}`);

  return {
    summary: summaryParts.join(' ') || 'Appointment',
    description: descriptionLines.join('\n').slice(0, 8000),
    start: { dateTime: new Date(appointment.start).toISOString() },
    end: { dateTime: new Date(appointment.end).toISOString() },
  };
}

export async function upsertGoogleEvent(companyId, appointmentId) {
  // Check if auto-sync is enabled
  const integration = await CompanyIntegration.findOne({ companyId }).lean();
  if (!integration?.googleAutoSync) {
    return null; // Auto-sync disabled
  }

  const appointment = await Appointment.findOne({ _id: appointmentId, companyId })
    .populate('customerId', 'fullName email phone')
    .populate('petId', 'name')
    .populate('serviceId', 'name')
    .populate('staffId', 'fullName');
  if (!appointment) return null;

  const calendarId = await getSelectedCalendarId(companyId);
  if (!calendarId) return null;

  const auth = await getAuthedClientByCompany(companyId);
  const calendar = google.calendar({ version: 'v3', auth });

  const requestBody = buildEventBody(appointment);

  if (appointment.googleCalendarEventId) {
    const { data } = await calendar.events.update({
      calendarId,
      eventId: appointment.googleCalendarEventId,
      requestBody,
    });
    await markLastSync(companyId);
    return data.id;
  }

  const { data } = await calendar.events.insert({
    calendarId,
    requestBody,
  });
  await markLastSync(companyId);
  return data.id;
}

export async function deleteGoogleEvent(companyId, appointmentId) {
  // Check if auto-sync is enabled
  const integration = await CompanyIntegration.findOne({ companyId }).lean();
  if (!integration?.googleAutoSync) {
    return; // Auto-sync disabled
  }

  const appointment = await Appointment.findOne({ _id: appointmentId, companyId }).lean();
  if (!appointment?.googleCalendarEventId) return;

  const calendarId = await getSelectedCalendarId(companyId);
  if (!calendarId) return;

  const auth = await getAuthedClientByCompany(companyId);
  const calendar = google.calendar({ version: 'v3', auth });

  try {
    await calendar.events.delete({ calendarId, eventId: appointment.googleCalendarEventId });
  } catch (err) {
    // Event might already be deleted or not found - this is acceptable
    if (err?.code === 404 || err?.response?.status === 404) {
      console.warn(`Google Calendar event ${appointment.googleCalendarEventId} not found (already deleted)`);
    } else {
      throw err; // Re-throw other errors
    }
  }

  await markLastSync(companyId);
}
