import { Message } from '@petbuddy/shared';

;

export async function createMessage(messageData) {
  const message = new Message({
    company_id: messageData.company_id,
    contact_id: messageData.contact_id,
    role: messageData.role,
    platform: messageData.platform,
    content: messageData.content || "",
    direction: messageData.direction,
    external_message_id: messageData.external_message_id,
    attachments: Array.isArray(messageData.attachments)
      ? messageData.attachments
      : [],
    created_at: messageData.created_at || new Date(),
    updated_at: messageData.updated_at || new Date(),
    read: messageData.read || false,
    delivered: messageData.delivered || false,
  });
  await message.save();
  return message;
}

export async function getMessagesByCustomer({
  customerId,
  platform,
  limit = 50,
  skip = 0,
}) {
  // Now using unified contact_id field
  const filter = {};
  if (customerId) {
    filter.contact_id = customerId;
  }
  if (platform) {
    filter.platform = platform;
  }

  // Fetch newest-first from DB for efficiency, then reverse to chronological
  const messagesDesc = await Message.find(filter)
    .sort({ created_at: -1 })
    .skip(Number(skip))
    .limit(Number(limit));
  return messagesDesc.reverse();
}
