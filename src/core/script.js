"use strict";
const { Groq } = require("groq-sdk");

class PromptGenerator {
  /**
   * Creates an instance of PromptGenerator.
   * @param {string} apiKey - API key for the Groq SDK.
   * @throws {Error} If the API key is not provided.
   */
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error("API key is required to use the PromptGenerator");
    }
    this.API_KEY = apiKey;
  }

  /**
   * The duration of each video segment in seconds.
   * @static
   * @type {number}
   */
  static SEGMENT_DURATION = 5; // seconds per segment

  /**
   * The system prompt for generating scripts.
   * Provides instructions for the AI model to generate engaging scripts.
   * @static
   * @type {string}
   */
  static SYSTEM_PROMPT = `You are a professional video script writer for social media shorts (YouTube/Instagram).
Your task is to create engaging, concise scripts that are:
- Broken into ${this.SEGMENT_DURATION}-second segments
- Optimized for vertical video format
- Engaging within the first 3 seconds
- Written in a conversational style
- Includes clear timing for transitions
- Maintains consistent pacing throughout

Each segment should be formatted as:
[Segment X - Timestamp]
Text: (what appears on screen)
Description: (brief context for visual elements, if media is used)
Transition: (transition effect to next segment)`;

  /**
   * Generates a user prompt based on the provided configuration.
   * @static
   * @param {Object} config - The configuration for generating the user prompt.
   * @param {number} config.duration - Total duration of the video in seconds.
   * @param {string} config.category - The category of the video (e.g., "education", "entertainment").
   * @param {string} config.tone - The tone of the video (e.g., "informative", "humorous").
   * @param {string} config.style - The style of the video (e.g., "media", "text-based").
   * @returns {string} The generated user prompt.
   */
  static generateUserPrompt(config) {
    const numSegments = Math.floor(config.duration / this.SEGMENT_DURATION);

    return `Create a ${config.duration}-second ${
      config.category
    } video script with a ${config.tone} tone.
${
  config.style === "media"
    ? "Include visual descriptions for each segment."
    : "Focus on text presentation with gradient backgrounds."
}
Break it into ${numSegments} segments of ${this.SEGMENT_DURATION} seconds each.
Make it engaging for ${config.category} enthusiasts while maintaining the ${
      config.tone
    } tone throughout.`;
  }

  /**
   * Generates a script using the Groq SDK.
   * @param {Object} config - The configuration for the video script.
   * @param {number} config.duration - Total duration of the video in seconds.
   * @param {string} config.category - The category of the video (e.g., "education", "entertainment").
   * @param {string} config.tone - The tone of the video (e.g., "informative", "humorous").
   * @param {string} config.style - The style of the video (e.g., "media", "text-based").
   * @returns {Promise<Object>} The generated video script, formatted into segments.
   * @throws {Error} If the script generation fails.
   */
  async generateScript(config) {
    const groq = new Groq({ apiKey: this.API_KEY });

    try {
      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: PromptGenerator.SYSTEM_PROMPT },
          { role: "user", content: PromptGenerator.generateUserPrompt(config) },
        ],
        model: "mixtral-8x7b-32768",
        temperature: 1,
        max_completion_tokens: 1024,
        top_p: 1,
        stream: false,
        stop: null,
      });

      return this.parseResponse(completion.choices[0].message.content || "");
    } catch (error) {
      throw new Error(`Script generation failed: ${error}`);
    }
  }

  /**
   * Parses the AI-generated response into structured segments.
   * @param {string} response - The raw response from the AI model.
   * @returns {Object} An object containing structured segments.
   */
  parseResponse(response) {
    const segments = response.split(/\[Segment \d+/).filter(Boolean);

    return {
      segments: segments.map((segment, index) => ({
        id: index + 1,
        timestamp: index * PromptGenerator.SEGMENT_DURATION,
        text: this.extractField(segment, "Text"),
        description: this.extractField(segment, "Description"),
        transition: this.extractField(segment, "Transition"),
      })),
    };
  }

  /**
   * Extracts a specific field from a segment.
   * @param {string} segment - The segment string to extract the field from.
   * @param {string} field - The field to extract (e.g., "Text", "Description", "Transition").
   * @returns {string} The extracted field value, or an empty string if not found.
   */
  extractField(segment, field) {
    const regex = new RegExp(`${field}: (.+)(\n|$)`);
    const match = segment.match(regex);
    return match ? match[1].trim() : "";
  }
}

module.exports = { PromptGenerator };
