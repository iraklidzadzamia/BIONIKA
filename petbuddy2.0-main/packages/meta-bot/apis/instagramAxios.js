import axios from "axios";
import * as dotenv from "dotenv";
dotenv.config();

/**
 * Send a message via the Instagram Graph API.
 * @param {Object} requestBody - The message payload.
 * @param {string} access_token - Instagram page access token.
 * @returns {Promise<any>} Response data or throws error.
 */
export async function instagramAxiosPostMessage(requestBody, access_token) {
  try {
    const response = await axios.post(
      "https://graph.facebook.com/v18.0/me/messages",
      requestBody,
      { params: { access_token } }
    );
    return response.data;
  } catch (err) {
    const apiError = err.response?.data?.error;
    if (apiError) {
      console.error("[Instagram API] Post Message Error:", apiError);
      throw new Error(apiError.message || "Instagram message send error");
    }
    console.error("[Instagram API] Post Message Network Error:", err.message);
    throw err;
  }
}

export async function instagramApiGet(url, params) {
  try {
    const response = await axios.get(`https://graph.facebook.com/${url}`, {
      params,
    });
    return response.data;
  } catch (error) {
    if (error.response?.data?.error) {
      console.error("[Instagram API] Get Error:", error.response.data.error);
    }
    throw error;
  }
}

/**
 * Fetch Instagram user info via the Instagram Graph API.
 * @param {string} instagramUserId - Instagram User ID.
 * @param {string} fields - Comma-separated field names.
 * @param {string} access_token - Instagram page access token.
 * @returns {Promise<any>} User data or throws error.
 */
export async function instagramAxiosGetUser(
  instagramUserId,
  fields,
  access_token
) {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${instagramUserId}`,
      {
        params: {
          fields,
          access_token,
        },
      }
    );
    return response.data;
  } catch (err) {
    const apiError = err.response?.data?.error;
    if (apiError) {
      console.error("[Instagram API] Get User Error:", apiError);
      throw new Error(apiError.message || "Instagram user fetch error");
    }
    console.error("[Instagram API] Get User Network Error:", err.message);
    throw err;
  }
}
