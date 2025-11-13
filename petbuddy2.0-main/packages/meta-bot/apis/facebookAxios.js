//api/facebookAxios.js

import axios from "axios";
import * as dotenv from "dotenv";
dotenv.config();

class FacebookApiError extends Error {
  constructor(message, { type, code, error_subcode, fbtrace_id } = {}) {
    super(message);
    this.name = "FacebookApiError";
    this.type = type;
    this.code = code;
    this.error_subcode = error_subcode;
    this.fbtrace_id = fbtrace_id;
  }
}

export async function facebookAxiosPostMessage(
  requestBody,
  access_token,
  action
) {
  try {
    const res = await axios.post(
      "https://graph.facebook.com/v18.0/me/messages",
      requestBody,
      {
        params: {
          access_token,
        },
      }
    );
    return res.data;
  } catch (err) {
    const apiError = err.response?.data?.error;
    if (apiError) {
      console.error("[Facebook API] Post Message Error:", apiError);
      throw new FacebookApiError(
        apiError.message || "Facebook message send error",
        apiError
      );
    }
    console.error("[Facebook API] Post Message Network Error:", err.message);
    throw err;
  }
}

export async function facebookAxiosGetUser(userId, fields, access_token) {
  try {
    console.log(
      `[Facebook API] Fetching user ${userId} with fields: ${fields}`
    );
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${userId}`,
      {
        params: {
          fields,
          access_token,
        },
      }
    );
    console.log(`[Facebook API] Successfully fetched user ${userId}`);
    return response.data;
  } catch (error) {
    const apiError = error.response?.data?.error;
    if (apiError) {
      console.error(`[Facebook API] Get User Error for ${userId}:`, {
        message: apiError.message,
        type: apiError.type,
        code: apiError.code,
        error_subcode: apiError.error_subcode,
        fbtrace_id: apiError.fbtrace_id,
        fields: fields,
        userId: userId,
      });
      throw new FacebookApiError(
        apiError.message || "Facebook user fetch error",
        apiError
      );
    }
    console.error(
      `[Facebook API] Get User Network Error for ${userId}:`,
      error.message
    );
    throw error;
  }
}

export async function facebookApiGet(url, params) {
  try {
    const response = await axios.get(`https://graph.facebook.com/${url}`, {
      params,
    });
    return response.data;
  } catch (error) {
    const apiError = error.response?.data?.error;
    if (apiError) {
      console.error("[Facebook API] Get Error:", apiError);
    }
    throw error;
  }
}
