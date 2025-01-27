"use strict";
const { Groq } = require("groq-sdk");
const Logger = require("../utils/logger");
const { z } = require("zod");

const SegmentSchema = z.object({
  id: z.number().int().positive(),
  text: z.string().min(15),
  duration: z.literal(5),
  description: z.string().min(5),
  transition: z.enum([
    "fade",
    "slideLeft",
    "slideRight",
    "dissolve",
    "circleWipe",
    "pixelize",
    "panLeft",
    "panRight",
    "scaleUp",
    "scaleDown",
    "rotate",
    "directionalWipe",
  ]),
});
/**
 * Zod schema for the full script structure
 * @type {z.ZodSchema}
 */
const ScriptSchema = z.object({
  segments: z.array(SegmentSchema).min(3),
});

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
  static SEGMENT_DURATION = 5;
  /**
   * Maximum number of retry attempts for API calls
   * @static
   * @type {number}
   */
  static MAX_RETRIES = 3;
  /**
   * Default error message for LLM failures
   * @static
   * @type {string}
   */
  static LLM_ERROR_MESSAGE =
    "Failed to generate valid response from AI model. Please try again later.";

  /**
   * The system prompt for generating scripts.
   * Provides instructions for the AI model to generate engaging scripts.
   * @static
   * @type {string}
   */
  static SYSTEM_PROMPT = `You are a professional video script writer for social media shorts. 
  Generate a script with these exact requirements:
  - Exactly ${PromptGenerator.SEGMENT_DURATION} seconds per segment
  - Structured format: [Segment X - Timestamp]
  - Fields for each segment:
    * id: Sequential number
    * text: Concise, factual on-screen text/narration (Min 20-30 words). Ensure the text flows logically from the previous segment and transitions seamlessly into the next.
    * duration: ${PromptGenerator.SEGMENT_DURATION} seconds
    * description: Visual context matching the text
    * transition: One of: "fade", "slideLeft","slideRight","dissolve", "circleWipe","pixelize","panLeft","panRight","scaleUp","scaleDown","rotate","directionalWipe"
  
  Content Guidelines:
  - When specific terms are provided: 
    * Maintain factual accuracy
    * Include relevant statistics/dates
    * Contextualize importance
  - Ensure logical continuity between segments by maintaining a cohesive narrative or flow of ideas.
  - Verify all factual claims against known information
  - For political content: Maintain neutral tone
  
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

    return `Create a ${config.duration}-second ${
      config.category
    } video about: ${config.topic}
    
    Requirements:
    1. Target audience: ${config.category} viewers
    2. Tone: ${config.tone}${
      config.style === "media"
        ? "\n3. Include specific visual references"
        : "\n3. Focus on text presentation"
    }
    4. Key elements: ${config.keyTerms.join(", ") || "None provided"}
    5. Transitions: Vary between segments
    6. Accuracy: ${
      config.requireFactChecking
        ? "Verify all facts"
        : "Basic factual correctness"
    }
    
    Output: Strict JSON format with ${numSegments} segments`;
  }

  /**
   * Determines if a failed request should be retried
   * @param {Error} error - Error object from previous attempt
   * @returns {boolean} True if request should be retried
   */
  shouldRetry(error) {
    const retryableErrors = [
      "Invalid JSON response",
      "Empty response from model",
      "Unexpected end of JSON input",
    ];
    return retryableErrors.some((e) => error.message.includes(e));
  }

  /**
   * Validates the configuration object for script generation
   * @param {Object} config - Configuration object to validate
   * @param {number} config.duration - Total video duration in seconds
   * @param {string} config.category - Video category/type
   * @param {string} config.tone - Desired narrative tone
   * @param {string} config.style - Visual presentation style
   * @throws {Error} For invalid configuration parameters
   */
  validateConfig(config) {
    const requiredFields = ["duration", "category", "tone", "style"];
    const missing = requiredFields.filter((field) => !config[field]);

    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(", ")}`);
    }

    if (config.duration % PromptGenerator.SEGMENT_DURATION !== 0) {
      throw new Error(
        `Duration must be divisible by ${PromptGenerator.SEGMENT_DURATION}`
      );
    }
  }

  /**
   * Validates and parses the AI model response
   * @param {Object} completion - Raw response from Groq API
   * @returns {Object} Validated script structure
   * @throws {Error} For invalid response structures
   */
  validateResponse(completion) {
    const rawContent = completion.choices[0]?.message?.content?.trim();

    // Check for empty response
    if (!rawContent || rawContent === "{}") {
      throw new Error("Empty response from model");
    }

    try {
      const parsed = JSON.parse(rawContent);
      const result = ScriptSchema.safeParse(parsed);

      if (!result.success) {
        this.logger.error("Validation errors:", result.error.format());
        throw new Error("Invalid JSON structure");
      }
      this.logger
        .terminal()
        .green(
          "[INFO] ✍️  The script from the LLM has been successfully generated.\n"
        );

      return result.data;
    } catch (error) {
      this.logger.error("JSON parsing failed:", error.message);
      throw new Error(`Invalid JSON response: ${error.message}`);
    }
  }
  /**
   * Creates a delay promise for retry backoff
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>} Promise that resolves after delay
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generates a video script through AI model completion
   * @param {Object} config - Configuration for script generation
   * @param {number} config.duration - Total duration in seconds
   * @param {string} config.category - Video category/type
   * @param {string} config.tone - Desired narrative tone
   * @param {string} config.style - Visual presentation style
   * @param {string} config.topic - Main video topic/theme
   * @param {string[]} config.keyTerms - Key terms to include
   * @param {boolean} config.requireFactChecking - Fact verification flag
   * @param {number} [attempt=0] - Current retry attempt count
   * @returns {Promise<Object>} Generated script object
   * @throws {Error} After maximum retries or fatal errors
   */
  async generateScript(config, attempt = 0) {
    try {
      this.validateConfig(config);
      const groq = new Groq({ apiKey: this.API_KEY, timeout: 30000 });

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
      return this.validateResponse(completion);
    } catch (error) {
      this.logger.error(`Attempt ${attempt + 1} failed: ${error.message}`);
      //Sometimes the LLM hallucinates and returns bad response which cannot be parsed. So we retry
      if (this.shouldRetry(error) && attempt < PromptGenerator.MAX_RETRIES) {
        await this.delay(1000 * (attempt + 1)); // Exponential backoff
        return this.generateScript(config, attempt + 1);
      }

      throw new Error(PromptGenerator.LLM_ERROR_MESSAGE);
    }
  }
}

module.exports = { PromptGenerator };
