import axios from "axios";
import { config } from "../config/env.js";

const IMAGE_MODEL = config.openai.imageModel;

/**
 * Downloads an image, encodes to base64, sends to OpenAI Vision (all with axios, no temp file).
 * @param {string} openai_api_key
 * @param {string} imageUrl
 * @returns {Promise<string>} Description from OpenAI
 */
export async function imageInputLLM(openai_api_key, imageUrl) {
  if (!openai_api_key) throw new Error("OpenAI API key is required");
  if (!imageUrl) throw new Error("Image URL is required for LLM image input.");

  // 1. Download image to buffer
  const { data } = await axios.get(imageUrl, { responseType: "arraybuffer" });
  const base64 = Buffer.from(data).toString("base64");
  const dataUrl = `data:image/jpeg;base64,${base64}`;

  // 2. Send to OpenAI Vision using axios
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: IMAGE_MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Describe the image, including the pet's breed, size, color, and other details.",
            },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${openai_api_key}`,
        "Content-Type": "application/json",
      },
    }
  );

  const image_descr = response.data.choices?.[0]?.message?.content || "";
  if (!config.isProduction) {
    console.log("LLM image description:", image_descr);
  }
  return image_descr;
}
