// middlewares/facebookMsgSender.js

import {
  facebookAxiosGetUser,
  facebookAxiosPostMessage,
} from "../apis/facebookAxios.js";

// Send a message to a Facebook user
export async function facebookMsgSender(
  senderPsid,
  messageText,
  fb_page_access_token,
  message_tag = ""
) {
  if (!fb_page_access_token) {
    throw new Error(
      "Facebook Page access token is missing. Ensure facebookAccessToken is set in CompanyIntegration or FB_PAGE_ACCESS_TOKEN in env."
    );
  }
  const requestBody = {
    recipient: { id: senderPsid },
    messaging_type: "RESPONSE",
    message: { text: messageText },
    ...(message_tag && { tag: message_tag }),
  };
  try {
    const response = await facebookAxiosPostMessage(requestBody, fb_page_access_token);
    return response; // Return the response containing message_id
  } catch (error) {
    console.error("Error sending Facebook message:", error);
    throw error;
  }
}

// Fetch user info from Facebook
export async function getCustomerFbInfo(sender_psid, fields, access_token) {
  try {
    return await facebookAxiosGetUser(sender_psid, fields, access_token);
  } catch (error) {
    console.error("Error fetching customer FB info:", error);
    throw error;
  }
}

// Trigger Facebook typing/seen actions
export async function callTypingAPI(sender_psid, action, fb_page_access_token) {
  const requestBody = {
    recipient: { id: sender_psid },
    sender_action: action, // 'typing_on', 'typing_off', 'mark_seen'
  };
  try {
    await facebookAxiosPostMessage(requestBody, fb_page_access_token, action);
  } catch (error) {
    console.warn(
      `[Facebook] Ignoring sender_action failure for ${action}:`,
      error?.message || error
    );
    // Do not throw; allow main flow to continue so replies are not blocked
  }
}
