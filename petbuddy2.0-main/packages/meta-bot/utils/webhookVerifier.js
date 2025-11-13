// utils/webhookVerifier.js
export const verifyFacebookWebhook = (req, res, VERIFY_TOKEN) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("🔍 Facebook Webhook Verification Debug:");
  console.log("Mode:", mode);
  console.log("Token received:", token);
  console.log("Expected token:", VERIFY_TOKEN);
  console.log("Token match:", token === VERIFY_TOKEN);
  console.log("Mode check:", mode === "subscribe");

  if (mode && token === VERIFY_TOKEN && mode === "subscribe") {
    console.log("✅ Facebook WEBHOOK_VERIFIED");
    return res.status(200).send(challenge);
  }

  console.log("❌ Facebook webhook verification failed");
  return res.sendStatus(403);
};

export const verifyInstagramWebhook = (req, res, VERIFY_TOKEN) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN && mode === "subscribe") {
    console.log("INSTAGRAM_WEBHOOK_VERIFIED");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};
