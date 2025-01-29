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
   * @param {string} config.freeSoundKey - API key for accessing the FreeSound API.
   * @param {string} [config.outputDir] - Directory Path to store the output. Defaults to the current_working_directory/clip-creator-generated/audio
   * @param {number} [config.fadeInDuration] - The audio fade In Duration in seconds. Defaults to 2 seconds
   * @param {number} [config.fadeOutDuration] - The audio fade Out Duration in seconds. Defaults to 4 seconds
   * @param {number} [config.volume] - The default volume. Defaults to 0.3. Maximum value 1.
   * @param {string} [config.outputFormat] - The output format of the audio output. Defaults to .mp3
   * @throws {Error} If the FreeSound API key is not provided.
   */
  constructor(config) {
    if (!config.freeSoundKey) {
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
    volume: 0.3,
    outputFormat: "mp3",
    outputDir: path.join(process.cwd(), "clip-creator-generated", "audio"),
    fadeInDuration: 2,
    fadeOutDuration: 4,
  };

  /**
   * Category-to-search-term mappings with mapping to multiple set of terms for generating relevant audio.
   */
  CATEGORY_MAPPINGS = {
    "Science & Technology": ["electronic futuristic", "ambient digital"],
    "Sports & Fitness": ["energetic upbeat", "fast rhythmic"],
    "Government & Politics": ["serious news", "dramatic orchestral"],
    "Entertainment & Celebrities": ["trendy upbeat", "pop dance"],
    "Education & Learning": ["calm acoustic", "soft background"],
    "Video Games & Esports": ["retro chiptune", "intense cinematic"],
    "Travel & Tourism": ["adventure nature", "world upbeat"],
    "Health & Wellness": ["meditation relaxing", "calm ambient"],
    "World News": ["news background", "broadcast serious"],
    "Business & Finance": ["corporate serious", "tech background"],
    "Lifestyle & Culture": ["lo-fi chill", "smooth modern"],
    "Art & Design": ["creative atmospheric", "abstract instrumental"],
    "Environment & Sustainability": ["nature sounds", "peaceful ambient"],
    "Food & Cooking": ["warm jazzy", "cozy kitchen"],
  };

  /**
   * Retrieves a list of search terms for a category to allow retries.
   * @param {string} category - The category name.
   * @returns {Array<string>} - Array of search terms for retries.
   */
  getSearchTerms(category) {
    return (
      this.CATEGORY_MAPPINGS[category] || [
        "background music",
        "cinematic instrumental",
      ]
    );
  }

  /**
   * Ensures the temporary directory for audio processing exists.
   */
  ensureTempDirectory() {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
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
          `volume=${this.config.volume}`,
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
   * Generates a music file based on the provided category and parameters. Attempts to retry calling the function if the API returns 404 or errors out
   * @param {Object} params - Parameters for generating music.
   * @param {string} params.category - Category for the music (e.g., "tech", "sports").
   * @returns {Promise<String>} The path of the generated music file.
   * @throws {Error} If no music is found or an error occurs during processing.
   */
  async generateMusic(params) {
    const MAX_RETRIES = 3;
    let attempt = 0;

    // Generate alternative search terms for retries
    const searchTerms = this.getSearchTerms(params.category);

    while (attempt < MAX_RETRIES) {
      try {
        const searchTerm =
          searchTerms[attempt] || "background music cinematic instrumental"; // Use the best available term
        this.logger
          .terminal()
          .cyan(
            `[INFO] 🎵 Searching for: "${searchTerm}" (Attempt ${
              attempt + 1
            })\n`
          );

        const searchResponse = await fetch(
          `${this.FREESOUND_API_URL}?${new URLSearchParams({
            query: searchTerm,
            token: this.config.freeSoundKey,
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
          throw new Error("No results found");
        }

        // Select a random track from the results
        const selectedTrack =
          data.results[Math.floor(Math.random() * data.results.length)];
        this.logger
          .terminal()
          .magenta(
            `[INFO] 🎶 Found track: "${selectedTrack.name}" by ${selectedTrack.username}\n`
          );

        // Generate file paths
        const musicId = uuidv4();
        const rawPath = path.join(
          this.config.outputDir,
          `${musicId}_raw.${this.config.outputFormat}`
        );
        const outputPath = path.join(
          this.config.outputDir,
          `${musicId}.${this.config.outputFormat}`
        );

        // Download the audio
        const audioResponse = await fetch(
          selectedTrack.previews["preview-lq-mp3"]
        );
        if (!audioResponse.ok) {
          throw new Error(`Audio download failed: ${audioResponse.status}`);
        }
        await pipeline(audioResponse.body, fs.createWriteStream(rawPath));

        this.logger
          .terminal()
          .yellow("[INFO] 🎚️ Applying FadeIn and FadeOut effects...\n");

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
        this.logger.error(`Attempt ${attempt + 1} failed: ${error.message}`);

        attempt++;
        if (attempt >= MAX_RETRIES) {
          throw new Error("Max retries reached. Failed to generate music.");
        }
      }
    }
  }
}

module.exports = AudioManager;
