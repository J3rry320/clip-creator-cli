const axios = require("axios");
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
    tempDir: path.join(process.cwd(), "temp", "audio"),
    fadeInDuration: 2,
    fadeOutDuration: 2,
  };

  /**
   * Category-to-search-term mappings for generating relevant audio.
   */
  CATEGORY_MAPPINGS = {
    tech: "technology background music",
    sports: "energetic sports music",
    politics: "news background music",
    entertainment: "upbeat entertainment music",
    education: "educational background music",
    gaming: "game music",
    travel: "travel background music",
    wellness: "calm meditation music",
    news: "news background music",
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
   * @returns {Promise<Object>} Metadata and path of the generated music file.
   * @throws {Error} If no music is found or an error occurs during processing.
   */
  async generateMusic(params) {
    try {
      const searchTerm =
        this.CATEGORY_MAPPINGS[params.category] || "background music";

      // Search for tracks
      const searchResponse = await axios.get(this.FREESOUND_API_URL, {
        params: {
          query: searchTerm,
          token: this.config.freesoundApiKey,
          filter: "duration:[0 TO 60]", // Limit to tracks under 1 minute
          sort: "rating_desc",
          fields: "id,name,previews,duration,username",
        },
      });

      if (
        !searchResponse.data.results ||
        searchResponse.data.results.length === 0
      ) {
        throw new Error("No music found for the specified category");
      }

      const selectedTrack =
        searchResponse.data.results[
          Math.floor(Math.random() * searchResponse.data.results.length)
        ];

      const musicId = uuidv4();
      const rawPath = path.join(
        this.config.tempDir,
        `${musicId}_raw.${this.config.outputFormat}`
      );
      const outputPath = path.join(
        this.config.tempDir,
        `${musicId}.${this.config.outputFormat}`
      );

      // Download the audio file
      const audioResponse = await axios({
        method: "get",
        url: selectedTrack.previews["preview-lq-mp3"],
        responseType: "stream",
      });

      await pipeline(audioResponse.data, fs.createWriteStream(rawPath));

      // Apply fade effects
      await this.applyFadeEffects(
        rawPath,
        outputPath,
        this.config.fadeInDuration,
        this.config.fadeOutDuration
      );

      // Optional: remove raw file
      fs.unlinkSync(rawPath);

      return {
        id: musicId,
        duration: selectedTrack.duration,
        format: this.config.outputFormat,
        path: outputPath,
        category: params.category,
        timestamp: Date.now(),
        trackInfo: {
          title: selectedTrack.name,
          artist: selectedTrack.username,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to generate music: ${error.message}`);
      throw error;
    }
  }
}

module.exports = AudioManager;
