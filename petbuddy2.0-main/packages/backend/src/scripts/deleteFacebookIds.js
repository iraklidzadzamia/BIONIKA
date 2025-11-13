/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { connectDB, disconnectDB } from '../config/database.js';
;
;
;
import BookingHold from '../models/BookingHold.js';
;
import ResourceReservation from '../models/ResourceReservation.js';
import { Appointment, Contact, Pet, Message } from '@petbuddy/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

function parseIds(input) {
  if (!input) return [];
  const trimmed = input.trim();
  try {
    const asJson = JSON.parse(trimmed);
    if (Array.isArray(asJson)) return asJson.map(String);
    if (Array.isArray(asJson.ids)) return asJson.ids.map(String);
  } catch {}
  return trimmed
    .split(/[\r\n,]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function uniq(arr) {
  return [...new Set(arr)];
}

async function deleteForFacebookIds(ids, dryRun = false) {
  const summary = {
    facebookIds: ids.length,
    customersFound: 0,
    customersDeleted: 0,
    messagesDeleted: 0,
    appointmentsDeleted: 0,
    petsDeleted: 0,
    bookingHoldsDeleted: 0,
    reservationsDeleted: 0,
  };

  for (const fbId of ids) {
    const contacts = await Contact.find({ 'social.facebookId': fbId }).select('_id').lean();
    summary.customersFound += contacts.length;
    const contactIds = contacts.map(c => c._id);

    if (contactIds.length === 0) continue;

    const appts = await Appointment.find({ customerId: { $in: contactIds } })
      .select('_id')
      .lean();
    const appointmentIds = appts.map(a => a._id);

    if (!dryRun) {
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

      summary.messagesDeleted += msgRes.deletedCount || 0;
      summary.bookingHoldsDeleted += holdRes.deletedCount || 0;
      summary.petsDeleted += petRes.deletedCount || 0;
      summary.reservationsDeleted += resvRes.deletedCount || 0;
      summary.appointmentsDeleted += apptRes.deletedCount || 0;
      summary.customersDeleted += custRes.deletedCount || 0;
    }
  }

  return summary;
}

async function main() {
  const args = process.argv.slice(2);
  const fileArg = args.find(a => a.startsWith('--file='));
  const idsArg = args.find(a => a.startsWith('--ids='));
  const dryArg = args.find(a => a === '--dry-run');

  let ids = [];
  if (fileArg) {
    const filePath = fileArg.split('=')[1];
    const raw = fs.readFileSync(filePath, 'utf8');
    ids = parseIds(raw);
  } else if (idsArg) {
    ids = parseIds(idsArg.split('=')[1]);
  } else {
    console.error(
      'Usage: node src/scripts/deleteFacebookIds.js --file=PATH_TO_ID_FILE [--dry-run]'
    );
    console.error('   or: node src/scripts/deleteFacebookIds.js --ids=ID1,ID2,ID3 [--dry-run]');
    process.exit(1);
  }

  ids = uniq(ids);
  if (ids.length === 0) {
    console.error('No IDs provided.');
    process.exit(1);
  }

  await connectDB();
  const summary = await deleteForFacebookIds(ids, Boolean(dryArg));
  await disconnectDB();

  console.log(JSON.stringify({ dryRun: Boolean(dryArg), ...summary }, null, 2));
}

main().catch(async err => {
  console.error(err);
  try {
    await disconnectDB();
  } catch {}
  process.exit(1);
});
