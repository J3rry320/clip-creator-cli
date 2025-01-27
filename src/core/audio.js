const path = require("path");
const fs = require("fs");
const { promisify } = require("util");
const { Stream } = require("stream");
const { v4: uuidv4 } = require("uuid");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const Logger = require("../utils/logger");

const pipeline = promisify(Stream.pipeline);
ffmpeg.setFfmpegPath(ffmpegPath);

class AudioManager {
  /**
   * Initializes the AudioManager instance with a given configuration.
   * @param {Object} config - Configuration object for the AudioManager.
   * @param {string} config.freesoundApiKey - API key for accessing the FreeSound API.
   * @throws {Error} If the FreeSound API key is not provided.
   */
  constructor(config) {
    if (!config.freesoundApiKey) {
      throw new Error("FreeSound API key is required");
    }

    this.config = {
      ...AudioManager.DEFAULT_CONFIG,
      ...config,
    };

    this.logger = new Logger();
    this.ensureTempDirectory();
    this.FREESOUND_API_URL = "https://freesound.org/apiv2/search/text/";
  }

  /**
   * Default configuration for the AudioManager.
   * @static
   */
  static DEFAULT_CONFIG = {
    defaultVolume: 0.3,
    outputFormat: "mp3",
    tempDir: path.join(process.cwd(), "clip-creator-generated", "audio"),
    fadeInDuration: 2,
    fadeOutDuration: 4,
  };

  /**
   * Category-to-search-term mappings for generating relevant audio.
   */
  CATEGORY_MAPPINGS = {
    "Science & Technology": "futuristic tech sounds", // Reflects innovation and tech
    "Sports & Fitness": "energetic sports sounds", // Suitable for sports or fitness-related content
    "Government & Politics": "serious news music", // Matches the tone of political topics
    "Entertainment & Celebrities": "pop culture music", // Reflects modern and pop culture vibes
    "Education & Learning": "study focus music", // Supports educational environments
    "Video Games & Esports": "gaming action sounds", // Matches gaming and esports intensity
    "Travel & Tourism": "adventure travel music", // Reflects exploration and travel vibes
    "Health & Wellness": "relaxing meditation music", // Matches wellness and mindfulness themes
    "World News": "global news background music", // Appropriate for global news coverage
    "Business & Finance": "corporate office music", // Reflects a formal and financial tone
    "Lifestyle & Culture": "modern lifestyle music", // Fits modern, stylish, and cultural themes
    "Art & Design": "inspirational creative music", // Matches the artistic and innovative mood
    "Environment & Sustainability": "nature ambient sounds", // Reflects environmental and eco-friendly themes
    "Food & Cooking": "cozy kitchen sounds", // Evokes a homely and joyful atmosphere
  };

  /**
   * Ensures the temporary directory for audio processing exists.
   */
  ensureTempDirectory() {
    if (!fs.existsSync(this.config.tempDir)) {
      fs.mkdirSync(this.config.tempDir, { recursive: true });
    }
  }

  /**
   * Retrieves the duration of an audio file.
   * @param {string} filePath - Path to the audio file.
   * @returns {Promise<number>} The duration of the audio file in seconds.
   */
  getAudioDuration(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata.format.duration);
        }
      });
    });
  }

  /**
   * Applies fade-in and fade-out effects to an audio file.
   * @param {string} inputPath - Path to the input audio file.
   * @param {string} outputPath - Path to the output processed audio file.
   * @param {number} fadeInDuration - Duration of the fade-in effect in seconds.
   * @param {number} fadeOutDuration - Duration of the fade-out effect in seconds.
   * @returns {Promise<string>} Path to the processed audio file.
   */
  applyFadeEffects(inputPath, outputPath, fadeInDuration, fadeOutDuration) {
    return new Promise(async (resolve, reject) => {
      const duration = await this.getAudioDuration(inputPath);
      const fadeOutStart = duration - fadeOutDuration;

      ffmpeg(inputPath)
        .toFormat("mp3")
        .audioCodec("libmp3lame")
        .audioFrequency(44100)
        .audioChannels(2)
        .audioFilters([
          `afade=t=in:st=0:d=${fadeInDuration}`,
          `afade=t=out:st=${fadeOutStart}:d=${fadeOutDuration}`,
        ])
        .output(outputPath)
        .on("end", () => resolve(outputPath))
        .on("error", (err) => {
          this.logger.error("FFmpeg error:", err.message);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Generates a music file based on the provided category and parameters.
   * @param {Object} params - Parameters for generating music.
   * @param {string} params.category - Category for the music (e.g., "tech", "sports").
   * @returns {Promise<String>} The path of the generated music file.
   * @throws {Error} If no music is found or an error occurs during processing.
   */
  async generateMusic(params) {
    try {
      this.logger
        .terminal()
        .cyan("[INFO] 🎵 Looking up audio from FreeSound.org...\n");

      const searchTerm =
        this.CATEGORY_MAPPINGS[params.category] || "background music";

      // Search for tracks using Fetch API
      const searchResponse = await fetch(
        `${this.FREESOUND_API_URL}?${new URLSearchParams({
          query: searchTerm,
          token: this.config.freesoundApiKey,
          filter: "duration:[60 TO *]",
          sort: "rating_desc",
          fields: "id,name,previews,duration,username",
        })}`
      );

      if (!searchResponse.ok) {
        throw new Error(`API request failed: ${searchResponse.status}`);
      }

      const data = await searchResponse.json();
      if (!data.results || data.results.length === 0) {
        throw new Error("No music found for the specified category");
      }

      const selectedTrack =
        data.results[Math.floor(Math.random() * data.results.length)];
      this.logger
        .terminal()
        .magenta(
          `[INFO] 🎶 Audio found! Track: "${selectedTrack.name}" by ${selectedTrack.username}.\n`
        );
      const musicId = uuidv4();
      const rawPath = path.join(
        this.config.tempDir,
        `${musicId}_raw.${this.config.outputFormat}`
      );
      const outputPath = path.join(
        this.config.tempDir,
        `${musicId}.${this.config.outputFormat}`
      );
      this.logger
        .terminal()
        .cyan(
          "[INFO] 🎵 Audio is being downloaded from Freesound.org. Please wait...\n"
        );

      // Download the audio file using Fetch
      const audioResponse = await fetch(
        selectedTrack.previews["preview-lq-mp3"]
      );
      if (!audioResponse.ok) {
        throw new Error(`Audio download failed: ${audioResponse.status}`);
      }

      await pipeline(audioResponse.body, fs.createWriteStream(rawPath));
      this.logger
        .terminal()
        .yellow(
          "[INFO] 🎚️ Applying FadeIn and FadeOut effects to the audio...\n"
        );

      // Apply fade effects
      await this.applyFadeEffects(
        rawPath,
        outputPath,
        this.config.fadeInDuration,
        this.config.fadeOutDuration
      );

      // Clean up raw file
      fs.unlinkSync(rawPath);

      return outputPath;
    } catch (error) {
      this.logger.error(`Failed to generate music: ${error.message}`);
      throw error;
    }
  }
}

module.exports = AudioManager;
