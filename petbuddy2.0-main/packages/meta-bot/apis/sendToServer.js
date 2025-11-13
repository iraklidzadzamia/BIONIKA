import axios from "axios";
import { config } from "../config/env.js";

export async function sendToserver(requestBody) {
  const url = config.backend.outboundServerUrl;

  if (!url) {
    throw new Error("OUTBOUND_SERVER_URL is not configured in environment variables");
  }

  try {
    const res = await axios.post(url, requestBody);
    return res.data;
  } catch (err) {
    console.error("Unable to send message:", err.response?.data || err.message);
    throw err;
  }
}
