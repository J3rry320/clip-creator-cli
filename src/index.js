/**
 * @remarks
 * This project is open source under the MIT license.
 * Contributions, improvements, and usage are welcome.
 *
 * For professional inquiries or hiring me, please visit [my LinkedIn](https://www.linkedin.com/in/jerrythejsguy/).
 */
const { AudioManager } = require("./core/audio.js");
const { PromptGenerator } = require("./core/script.js");
const { VideoGenerator } = require("./core/video.js");

const Logger = require("./utils/logger.js");
const { getNoiseLessConfig } = require("./utils/index.js");

const logger = new Logger();

/** The core method for generating methods from CLI
 * @param {Object} config - Configuration for script generation
 * @param {number} config.duration - Total duration in seconds
 * @param {string} config.category - Video category/type
 * @param {string} config.tone - Desired narrative tone
 * @param {string} config.outputDir - Output directory
 * @param {number} config.volume - Audio volume (0-1)
 * @param {number} config.fadeInDuration - Audio fade-in duration in seconds
 * @param {number} config.fadeOutDuration - Audio fade-out
 * @param {string} config.topic - Main video topic/theme
 * @param {string[]} config.keyTerms - Key terms to include
 * @param {boolean} config.requireFactChecking - Fact verification flag
 * @param {string} config.groqApiKey - GROQ LLM API KEY
 * @param {string} config.pexelsApiKey - Pexels Open Source Media API KEY
 * @param {string} config.freeSoundApiKey - Free Sound Open Source Audio API KEY
 */
const createVideo = async (config) => {
  const {
    category,
    tone,
    topic,
    duration,
    keyTerms,
    groqKey,
    pexelsKey,
    freeSoundKey,
    outputDir,
    volume,
    fadeInDuration,
    fadeOutDuration,
    requireFactChecking,
    width,
    height,
    fps,
    font,
    fontSize,
  } = config;

  if (!groqKey || !pexelsKey || !freeSoundKey) {
    logger.error("Missing API keys. Please check your configuration");
    process.exit(1);
  }
  if (!category || !tone) {
    logger.error("Category or Tone Missing from the config");
    process.exit(1);
  }
  const scriptGenerator = new PromptGenerator(groqKey);

  const audioGenerator = new AudioManager(
    getNoiseLessConfig({
      freeSoundKey,
      volume,
      fadeInDuration,
      fadeOutDuration,
      outputDir,
    })
  );
  //TODO Get the remaining optional configuration from CLI
  const videoGenerator = new VideoGenerator(
    getNoiseLessConfig({
      outputDir,
      pexelsKey,
      width,
      height,
      font,
      fontSize,
      fps,
    })
  );
  let generatedScriptSegments, generatedMusicPath, generatedVideoPath;
  await logger.runWithLoader(
    async () => {
      generatedScriptSegments = await scriptGenerator.generateScript(
        getNoiseLessConfig({
          duration,
          tone,
          topic,
          category,
          keyTerms,
          requireFactChecking,
        })
      );
    },
    "Script Generation",
    5000
  );
  await logger.runWithLoader(
    async () => {
      generatedMusicPath = await audioGenerator.generateMusic({
        category,
      });
    },
    "Audio Generation",
    25000
  );
  await logger.runWithLoader(
    async () => {
      logger
        .terminal()
        .yellow(
          "[INFO] 🎥 Searching Pexels for video assets and adding text overlays...\n"
        );

      generatedVideoPath = await videoGenerator.generateVideo(
        generatedScriptSegments.segments,
        generatedMusicPath
      );
    },
    "Video Generation",
    50000
  );

  return generatedVideoPath;
};
module.exports = { createVideo };
