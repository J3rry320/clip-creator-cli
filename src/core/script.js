"use strict";
const { Groq } = require("groq-sdk");
const Logger = require("../utils/logger");

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
    this.logger = new Logger();
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
  static SYSTEM_PROMPT = `You are a professional video script writer for social media shorts. 
  Generate a script with these exact requirements:
  - Exactly ${this.SEGMENT_DURATION} seconds per segment
  - Structured format: [Segment X - Timestamp]
  - Fields for each segment:
    * id: Sequential number
    * text: On-screen text/narration
    * duration: ${this.SEGMENT_DURATION} seconds
    * description: Visual context (optional)
    * transition: One of: 'fade', 'slideLeft', 'slideRight', 'dissolve', 'circleWipe', 'pixelize'
  
  Output MUST be parseable JSON with exact structure:
  {
    "segments": [
      {
        "id": 1,
        "text": "Segment text",
        "duration": 5,
        "description": "Optional visual description",
        "transition": "fade"
      }
      // Additional segments...
    ]
  }`;

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

    return `Create a ${config.duration}-second ${config.category} video script:
  - Category: ${config.category}
  - Tone: ${config.tone}
  - Style: ${config.style}
  - Total Segments: ${numSegments}
  - Each Segment: ${this.SEGMENT_DURATION} seconds
  
  Ensure:
  1. Engaging content for ${config.category} audience
  2. ${config.tone} tone throughout
  3. ${
    config.style === "media"
      ? "Include visual descriptions"
      : "Text-focused presentation"
  }
  4. Use specified JSON output format
  5. Varied, dynamic transitions between segments`;
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

      return JSON.parse(completion.choices[0].message.content || "");
    } catch (error) {
      throw new Error(`Script generation failed: ${error}`);
    }
  }
}

module.exports = { PromptGenerator };
