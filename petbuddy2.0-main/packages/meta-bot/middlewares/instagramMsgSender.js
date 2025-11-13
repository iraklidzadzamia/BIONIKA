import {
  instagramAxiosGetUser,
  instagramAxiosPostMessage,
} from "../apis/instagramAxios.js";

/**
 * Send a message to an Instagram user via Instagram Graph API.
 * Automatically splits messages longer than 1000 characters.
 * @param {string} senderPsid - Instagram user ID.
 * @param {string} messageText - Text to send.
 * @param {string} insta_page_access_token - Page access token.
 * @returns {Promise<any>} - Returns the last message response
 */
export async function instagramMsgSender(
  senderPsid,
  messageText,
  insta_page_access_token
) {
  const INSTAGRAM_MAX_LENGTH = 1000; // Instagram's character limit

  // If message is within limit, send it directly
  if (messageText.length <= INSTAGRAM_MAX_LENGTH) {
    const requestBody = {
      messaging_product: "instagram",
      recipient: { id: senderPsid },
      message: { text: messageText },
    };
    return instagramAxiosPostMessage(requestBody, insta_page_access_token);
  }

  // Message is too long - split it intelligently
  console.log(`[Instagram] Message is ${messageText.length} characters, splitting into chunks...`);

  const chunks = [];
  let currentChunk = "";

  // Split by sentences first (period, exclamation, question mark)
  const sentences = messageText.split(/([.!?]\s+)/);

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];

    // If adding this sentence would exceed limit, save current chunk and start new one
    if (currentChunk.length + sentence.length > INSTAGRAM_MAX_LENGTH) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }

  // Add remaining chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // If a single sentence is still too long, split it by words
  const finalChunks = [];
  for (const chunk of chunks) {
    if (chunk.length <= INSTAGRAM_MAX_LENGTH) {
      finalChunks.push(chunk);
    } else {
      // Split long chunk by words
      const words = chunk.split(/\s+/);
      let wordChunk = "";
      for (const word of words) {
        if (wordChunk.length + word.length + 1 > INSTAGRAM_MAX_LENGTH) {
          if (wordChunk.trim()) {
            finalChunks.push(wordChunk.trim());
          }
          wordChunk = word;
        } else {
          wordChunk += (wordChunk ? " " : "") + word;
        }
      }
      if (wordChunk.trim()) {
        finalChunks.push(wordChunk.trim());
      }
    }
  }

  console.log(`[Instagram] Split message into ${finalChunks.length} chunks`);

  // Send all chunks
  let lastResponse = null;
  for (let i = 0; i < finalChunks.length; i++) {
    const requestBody = {
      messaging_product: "instagram",
      recipient: { id: senderPsid },
      message: { text: finalChunks[i] },
    };

    lastResponse = await instagramAxiosPostMessage(requestBody, insta_page_access_token);

    // Add small delay between messages to prevent rate limiting
    if (i < finalChunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return lastResponse;
}

/**
 * Fetch Instagram user information via Instagram Graph API.
 * @param {string} instagramUserId - User ID.
 * @param {string} fields - Comma-separated field names.
 * @param {string} access_token - Page access token.
 * @returns {Promise<any>}
 */
export async function getCustomerInstagramInfo(
  instagramUserId,
  fields,
  access_token
) {
  return instagramAxiosGetUser(instagramUserId, fields, access_token);
}

/**
 * Send typing indicators or mark messages as seen on Instagram.
 * @param {string} instagramUserId
 * @param {string} action - 'typing_on', 'typing_off', 'mark_seen'
 * @param {string} insta_page_access_token
 * @returns {Promise<any>}
 */
export async function callInstaTypingAPI(
  instagramUserId,
  action,
  insta_page_access_token
) {
  const requestBody = {
    recipient: { id: instagramUserId },
    sender_action: action,
  };
  return instagramAxiosPostMessage(requestBody, insta_page_access_token);
}
