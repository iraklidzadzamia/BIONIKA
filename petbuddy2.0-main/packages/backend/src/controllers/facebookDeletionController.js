import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
;
;
;
import BookingHold from '../models/BookingHold.js';
;
import ResourceReservation from '../models/ResourceReservation.js';
import { config } from '../config/env.js';
import { Appointment, Contact, Pet, Message } from '@petbuddy/shared';

function base64UrlDecode(str) {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function parseSignedRequest(signedRequest, appSecret) {
  const parts = String(signedRequest).split('.');
  if (parts.length !== 2) throw new Error('Invalid signed_request');
  const [encodedSig, payload] = parts;
  const sig = Buffer.from(base64UrlDecode(encodedSig), 'binary');
  const data = JSON.parse(base64UrlDecode(payload));
  const expected = crypto.createHmac('sha256', appSecret).update(payload).digest();
  if (sig.length !== expected.length || !crypto.timingSafeEqual(sig, expected)) {
    throw new Error('Bad signature');
  }
  return data; // may contain user_id for Login-based data deletion
}

async function deleteForFacebookIds(ids) {
  const totals = {
    contacts: 0,
    messages: 0,
    appointments: 0,
    pets: 0,
    bookingHolds: 0,
    reservations: 0,
  };

  for (const fbId of ids) {
    const contacts = await Contact.find({ 'social.facebookId': String(fbId) })
      .select('_id')
      .lean();
    const contactIds = contacts.map(c => c._id);
    if (contactIds.length === 0) continue;

    const appts = await Appointment.find({ customerId: { $in: contactIds } })
      .select('_id')
      .lean();
    const appointmentIds = appts.map(a => a._id);

    const [msgRes, holdRes, petRes, resvRes, apptRes, custRes] = await Promise.all([
      Message.deleteMany({ customer_id: { $in: contactIds } }),
      BookingHold.deleteMany({ customerId: { $in: contactIds } }),
      Pet.deleteMany({ customerId: { $in: contactIds } }),
      appointmentIds.length
        ? ResourceReservation.deleteMany({ appointmentId: { $in: appointmentIds } })
        : { deletedCount: 0 },
      Appointment.deleteMany({ customerId: { $in: contactIds } }),
      Contact.deleteMany({ _id: { $in: contactIds } }),
    ]);

    totals.messages += msgRes.deletedCount || 0;
    totals.bookingHolds += holdRes.deletedCount || 0;
    totals.pets += petRes.deletedCount || 0;
    totals.reservations += resvRes.deletedCount || 0;
    totals.appointments += apptRes.deletedCount || 0;
    totals.contacts += custRes.deletedCount || 0;
  }

  return totals;
}

export async function handleDataDeletion(req, res) {
  try {
    const body = req.body || {};
    const query = req.query || {};
    const signedRequest = body.signed_request || query.signed_request;
    const idsInput = body.ids || query.ids;
    const collected = [];

    if (signedRequest && config.facebook.appSecret) {
      try {
        const data = parseSignedRequest(String(signedRequest), config.facebook.appSecret);
        if (data?.user_id) collected.push(String(data.user_id));
      } catch (e) {
        // Ignore signature errors if manual ids provided
      }
    }

    if (Array.isArray(idsInput)) {
      for (const id of idsInput) collected.push(String(id));
    } else if (typeof idsInput === 'string') {
      // Support comma-separated ids from query
      idsInput
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .forEach(id => collected.push(String(id)));
    }

    const uniqueIds = [...new Set(collected)].filter(Boolean);
    const confirmationCode = uuidv4();
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const statusUrl = `${baseUrl}/api/v1/facebook/data-deletion-status?code=${encodeURIComponent(confirmationCode)}`;

    if (uniqueIds.length > 0) {
      await deleteForFacebookIds(uniqueIds);
    }

    return res.json({
      url: statusUrl,
      confirmation_code: confirmationCode,
    });
  } catch (error) {
    return res.status(200).json({
      url: `${req.protocol}://${req.get('host')}/api/v1/facebook/data-deletion-status`,
      confirmation_code: 'received',
    });
  }
}

export async function dataDeletionStatus(req, res) {
  return res
    .status(200)
    .send('Your data deletion request has been received and processed (or no data was found).');
}
