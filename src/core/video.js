"use strict";

/**
 * @typedef {Object} VideoSegment
 * @property {number} id - Unique identifier for the video segment.
 * @property {string} text - Text content to display in the segment.
 * @property {number} duration - Duration of the segment in seconds.
 * @property {string} [description] - Optional description to help find media assets for the segment.
 * @property {'fade' | 'slideLeft' | 'slideRight' | 'zoomIn' | 'zoomOut' | 'dissolve' | 'circleWipe' | 'pixelize'} [transition] - Optional transition effect between segments.
 */

// src/core/video.js

const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
const { createCanvas } = require("canvas");
const { createClient } = require("pexels");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const Logger = require("../utils/logger");

ffmpeg.setFfmpegPath(ffmpegPath);

class VideoGenerator {
  /**
   * Creates an instance of VideoGenerator.
   *
   * @param {Object} config - Configuration for video generation.
   * @param {number} config.width - Width of the video in pixels.
   * @param {number} config.height - Height of the video in pixels.
   * @param {number} config.fps - Frames per second for the video.
   * @param {string} config.outputDir - Directory where the generated video and temporary files will be stored.
   * @param {{
   *   type: 'gradient' | 'media',
   *   font: string,
   *   fontSize: number,
   *   gradients?: {
   *     colors: string[],
   *     direction: 'vertical' | 'horizontal'
   * }} config.style - Style configuration for the video, including fonts and gradient properties.
   * @param {string} [config.pexelsApiKey] - API key for the Pexels service (required for media-based videos).
   */
  constructor(config) {
    this.config = { ...VideoGenerator.DEFAULT_CONFIG, ...config };
    this.logger = new Logger();
    this.tempDir = path.join(this.config.outputDir, "temp");

    if (config.style.type === "media" && !config.pexelsApiKey) {
      throw new Error("Pexels API key is required for media-based videos");
    }
    if (this.config.fps <= 0 || this.config.fps > 60) {
      throw new Error(`Invalid FPS value: ${this.config.fps}`);
    }

    if (config.pexelsApiKey) {
      this.pexelsClient = createClient(config.pexelsApiKey);
    }

    this.TRANSITION_DURATION = 0.5; // seconds

    this.TRANSITION_MAPPING = {
      fade: "fade",
      dissolve: "fadeblack",

      slideLeft: "slideleft",
      slideRight: "slideright",
      circleWipe: "circleopen",
      pixelize: "pixelize",
    };

    this.ffmpegBaseOptions = ["-hide_banner", "-loglevel error", "-y"];

    this.ensureDirectories();
  }

  /**
   * Default configuration for the VideoGenerator.
   * @static
   */
  static DEFAULT_CONFIG = {
    width: 720,
    height: 1280,
    fps: 30,
    outputDir: path.join(process.cwd(), "clip-creator-generated"),
    style: {
      type: "gradient",
      font: "Arial",
      fontSize: 24,
      gradients: {
        colors: ["#ff7eb3", "#ff758c"],
        direction: "vertical",
      },
    },
  };

  /**
   * Ensures the required directories exist.
   */
  ensureDirectories() {
    [this.config.outputDir, this.tempDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Generates a video with the given segments and audio.
   *
   * @param {VideoSegment[]} segments - Array of video segments.
   * @param {string} audioPath - Path to the background audio file.
   * @returns {Promise<string>} - Path to the generated video.
   */
  async generateVideo(segments, audioPath) {
    try {
      const segmentPaths = await Promise.all(
        segments.map((segment) => this.createSegment(segment))
      );

      const withTransitions = await this.combineVideosWithTransitions(
        segmentPaths,
        segments
      );

      const outputPath = path.join(
        this.config.outputDir,
        `final_${uuidv4()}.mp4`
      );
      this.logger.info(withTransitions + " video path");
      this.logger.info(audioPath + " audio path");

      await this.combineVideoAndAudio(audioPath, withTransitions, outputPath);

      await this.cleanup(segmentPaths);

      return outputPath;
    } catch (error) {
      this.logger.error(`Failed to generate video: ${error.message}`);
      throw error;
    }
  }

  /**
   * Creates a single video segment.
   *
   * @param {VideoSegment} segment - The video segment to create.
   * @returns {Promise<string>} - Path to the created segment.
   */
  async createSegment(segment) {
    const outputPath = path.join(this.tempDir, `segment_${segment.id}.mp4`);

    if (this.config.style.type === "gradient") {
      return this.createGradientSegment(segment, outputPath);
    } else {
      return this.createMediaSegment(segment, outputPath);
    }
  }

  /**
   * Creates a gradient-based video segment.
   *
   * @param {VideoSegment} segment - The segment details.
   * @param {string} outputPath - Path to save the generated segment.
   * @returns {Promise<string>} - Path to the gradient video segment.
   */
  async createGradientSegment(segment, outputPath) {
    const canvas = createCanvas(this.config.width, this.config.height);
    const ctx = canvas.getContext("2d");
    const frameCount = Math.floor(segment.duration * this.config.fps);

    const gradient = ctx.createLinearGradient(
      0,
      0,
      this.config.style.gradients.direction === "horizontal"
        ? this.config.width
        : 0,
      this.config.style.gradients.direction === "vertical"
        ? this.config.height
        : 0
    );

    this.config.style.gradients.colors.forEach((color, index) => {
      gradient.addColorStop(
        index / (this.config.style.gradients.colors.length - 1),
        color
      );
    });

    return new Promise((resolve, reject) => {
      const command = ffmpeg();

      for (let i = 0; i < frameCount; i++) {
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.config.width, this.config.height);

        ctx.font = `${this.config.style.fontSize}px ${this.config.style.font}`;
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const progress = i / frameCount;
        const words = segment.text.split(" ");
        const visibleWords = Math.ceil(words.length * progress);
        const text = words.slice(0, visibleWords).join(" ");

        ctx.fillText(text, this.config.width / 2, this.config.height / 2);

        command.input(canvas.toBuffer("image/png"));
      }

      command
        .fps(this.config.fps)
        .on("end", () => resolve(outputPath))
        .on("error", (err) => reject(err))
        .save(outputPath);
    });
  }

  async findSuitableVideo(segment) {
    const searchQueries = [
      segment.description,
      segment.text,
      "background",
      "nature",
      "landscape",
      "abstract",
      "minimalist",
    ];

    const searchOptions = {
      orientation: "portrait",
      size: "medium",
      per_page: 5,
    };

    for (const query of searchQueries) {
      try {
        const searchResults = await this.pexelsClient.videos.search({
          query,
          ...searchOptions,
        });

        if (searchResults.videos && searchResults.videos.length > 0) {
          const videoFile = searchResults.videos[0].video_files.find(
            (file) => file.quality === "hd" && file.width === this.config.width
          );

          if (videoFile) {
            return {
              videoFile,
              query: query,
            };
          }
        }
      } catch (error) {
        this.logger.warn(
          `Search failed for query '${query}': ${error.message}`
        );
      }
    }

    throw new Error("No suitable media found after multiple search attempts");
  }

  /**
   * Creates a media-based video segment.
   *
   * @param {VideoSegment} segment - The segment details.
   * @param {string} outputPath - Path to save the generated segment.
   * @returns {Promise<string>} - Path to the media video segment.
   */
  async createMediaSegment(segment, outputPath) {
    if (!this.pexelsClient) {
      throw new Error("Pexels client not initialized");
    }

    const { videoFile } = await this.findSuitableVideo(segment);

    const response = await fetch(videoFile.link);
    const buffer = await response.arrayBuffer();
    const tempVideoPath = path.join(this.tempDir, `temp_${uuidv4()}.mp4`);
    fs.writeFileSync(tempVideoPath, Buffer.from(buffer));

    return new Promise((resolve, reject) => {
      const escapedText = segment.text.replace(/([':])/g, "\\$1");

      ffmpeg(tempVideoPath)
        .inputOptions(this.ffmpegBaseOptions)
        .videoFilters([
          {
            filter: "drawtext",
            options: {
              text: escapedText,
              fontfile: path.resolve(
                __dirname,
                "../../assets/fonts/OpenSans-Regular.ttf"
              ),
              fontsize: this.config.style.fontSize || 48,
              fontcolor: "white",
              x: "(w-text_w)/2",
              y: "(h-text_h)/2",
              shadowcolor: "black",
              shadowx: 2,
              shadowy: 2,
            },
          },
        ])
        .outputOptions([
          `-t ${segment.duration}`,
          "-c:v libx264",
          "-preset medium",
          "-crf 23",
        ])
        .on("end", () => {
          this.cleanup([tempVideoPath]);
          resolve(outputPath);
        })
        .on("error", (err, stdout, stderr) => {
          this.logger.error(`Segmentation Error: ${err.message}`);
          this.logger.error(`FFmpeg stderr: ${stderr}`);
          reject(err);
        })

        .save(outputPath);
    });
  }

  /**
   * Applies transitions between segments.
   *
   * @param {string[]} videoFiles - Paths to the segments.
   * @param {VideoSegment[]} transitions - Segment details with transitions.
   * @returns {Promise<string>} - Path to the combined video with transitions.
   */

  async combineVideosWithTransitions(videoFiles, transitions) {
    try {
      this.logger.info("Applying transitions to combine video segments");
      const outputPath = path.join(
        this.tempDir,
        `with_transitions_${uuidv4()}.mp4`
      );

      // Input validation
      if (!Array.isArray(videoFiles) || videoFiles.length === 0) {
        throw new Error(
          "First argument must be a non-empty array of video file paths"
        );
      }
      if (transitions.length !== videoFiles.length) {
        throw new Error("Transitions array length must match number of videos");
      }

      const command = ffmpeg();
      let filterString = "";
      let accumulatedDuration = 0;
      const transitionDuration = this.TRANSITION_DURATION;
      let previousStream;

      videoFiles.forEach((filePath, index) => {
        this.logger.info(
          `Processing segment ${index + 1}/${
            videoFiles.length
          }: ${path.basename(filePath)}`
        );
        command.input(filePath);
        const duration = transitions[index].duration;

        // Video processing chain
        filterString +=
          `[${index}:v]trim=duration=${duration},` +
          `fps=fps=${this.config.fps},` +
          `scale=w=${this.config.width}:h=${this.config.height}:force_original_aspect_ratio=decrease,` +
          `pad=${this.config.width}:${this.config.height}:(ow-iw)/2:(oh-ih)/2,setsar=1,` +
          `format=yuv420p[vid${index}]; `;

        if (index === 0) {
          previousStream = `vid${index}`;
          accumulatedDuration = duration;
        } else {
          // Handle missing transitions with fallback
          const segmentTransition = transitions[index - 1].transition || "fade";
          const transitionType =
            this.TRANSITION_MAPPING[segmentTransition] || "fade";

          let offset = accumulatedDuration - transitionDuration;
          if (offset < 0) {
            this.logger.warn(
              `Negative offset clamped to 0 for segment ${index}`
            );
            offset = 0;
          }

          filterString +=
            `[${previousStream}][vid${index}]` +
            `xfade=transition=${transitionType}:` +
            `duration=${transitionDuration}:` +
            `offset=${offset}[xfade${index}]; `;

          previousStream = `xfade${index}`;
          accumulatedDuration += duration - transitionDuration;
        }
      });

      filterString += `[${previousStream}]format=yuv420p[outv]`;
      const filters = filterString.split("; ").filter((f) => f.trim() !== "");
      if (filters.some((f) => !/^\[.+\]/.test(f))) {
        throw new Error("Invalid filter syntax: " + filters.join("\n"));
      }
      this.logger.warn("Final Filter Graph:\n" + filters.join("\n"));

      return new Promise((resolve, reject) => {
        command
          .complexFilter(filters, "outv")
          .outputOptions([
            `-t ${accumulatedDuration}`,
            "-movflags +faststart",
            "-c:v libx264",
            `-r ${this.config.fps}`,
          ])

          .on("progress", (progress) => {
            this.logger.info(`Processing: ${progress.timemark}`);
          })
          .on("end", () => {
            this.logger.info(
              `Successfully combined ${videoFiles.length} segments`
            );
            resolve(outputPath);
          })
          .on("error", (err, stdout, stderr) => {
            this.logger.error(`FFmpeg failed: ${err.message}`);
            this.logger.error(`Error details: ${stderr}`);
            reject(new Error(`Video combining failed: ${err.message}`));
          })
          .save(outputPath);
      });
    } catch (error) {
      this.logger.error(`Sync Error: ${err.message}`);
      reject(err);
    }
  }

  /**
   * Combines video and audio into a single output file.
   *
   * @param {string} audioPath - Path to the audio file.
   * @param {string} videoPath - Path to the video file.
   * @param {string} outputPath - Path to save the combined file.
   * @returns {Promise<void>}
   */

  async combineVideoAndAudio(
    audioPath,
    videoPath,
    outputPath = path.join(process.cwd(), "output.mp4")
  ) {
    // Validate inputs
    const validatePath = (filePath, type) => {
      if (!filePath?.endsWith(type === "video" ? ".mp4" : ".mp3")) {
        throw new Error(`Invalid ${type} file format`);
      }
      if (!fs.existsSync(filePath)) {
        throw new Error(`${type} file not found`);
      }
    };

    try {
      // Check input files
      console.log(audioPath);
      validatePath(audioPath, "audio");
      validatePath(videoPath, "video");

      return new Promise((resolve, reject) => {
        ffmpeg()
          // Input handling
          .input(videoPath)
          .input(audioPath)

          // Output configuration
          .outputOptions([
            "-map 0:v", // Take video from first input
            "-map 1:a", // Take audio from second input
            "-c:v copy", // Copy video stream without re-encoding
            "-c:a aac", // Encode audio to AAC format
            "-shortest", // Match duration to shortest input
            "-movflags +faststart", // Optimize for web playback
          ])

          // Event handlers
          .on("start", (commandLine) => {
            console.log("FFmpeg command:", commandLine);
          })
          .on("progress", (progress) => {
            console.log(`Processing: ${progress.timemark}`);
          })
          .on("end", () => {
            console.log("Successfully combined audio/video");
            resolve(outputPath);
          })
          .on("error", (err, stdout, stderr) => {
            reject(
              new Error(
                [`FFmpeg error: ${err.message}`, `Stderr: ${stderr}`].join("\n")
              )
            );
          })
          .save(outputPath);
      });
    } catch (err) {
      throw new Error(`Combination failed: ${err.message}`);
    }
  }

  /**
   * Cleans up temporary files.
   *
   * @param {string[]} paths - Paths to the files to be deleted.
   * @returns {Promise<void>}
   */
  async cleanup(paths) {
    await Promise.all(
      paths.map((path) =>
        fs.promises
          .unlink(path)
          .catch((err) =>
            this.logger.error(`Failed to delete ${path}: ${err.message}`)
          )
      )
    );
  }
}

module.exports = { VideoGenerator };
