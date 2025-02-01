/**
 * @remarks
 * This project is open source under the MIT license.
 * Contributions, improvements, and usage are welcome.
 *
 * For professional inquiries or hiring me, please visit [my LinkedIn](https://www.linkedin.com/in/jerrythejsguy/).
 */

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
const { createClient } = require("pexels");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const Logger = require("../utils/logger");
const tmp = require("tmp");

ffmpeg.setFfmpegPath(ffmpegPath);

class VideoGenerator {
  /**
   * Creates an instance of VideoGenerator.
   *
   * @param {Object} config - Configuration for video generation.
   * @param {string} config.pexelsKey - API key for the Pexels service (required).
   * @param {number} config.width - Width of the video in pixels.
   * @param {number} config.height - Height of the video in pixels.
   * @param {number} config.fps - Frames per second for the video.
   * @param {string} config.outputDir - Directory where the generated video and temporary files will be stored.
   * @param {number} config.fontSize - Size of the font in pixels.
   * @param {string} config.font - Path to the font file (provide absolute path to the font)
   */
  constructor(config) {
    this.config = { ...VideoGenerator.DEFAULT_CONFIG, ...config };
    this.logger = new Logger();
    this.tempDir = path.join(this.config.outputDir, "temp");

    if (!config.pexelsKey) {
      throw new Error(
        "Pexels API key is required to generate media-based videos"
      );
    }
    if (this.config.fps <= 0 || this.config.fps > 60) {
      throw new Error(`Invalid FPS value: ${this.config.fps}`);
    }

    if (config.pexelsKey) {
      this.pexelsClient = createClient(config.pexelsKey);
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
    fontSize: 32,
    font:
      process.env.NODE_ENV === "dev"
        ? path.resolve(__dirname, "../assets/fonts/OpenSans-Regular.ttf")
        : path.resolve(__dirname, "./assets/fonts/OpenSans-Regular.ttf"),
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

      await this.combineVideoAndAudio(audioPath, withTransitions, outputPath);

      await this.cleanup([...segmentPaths, withTransitions]);

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
    //Not using tmp as it will mess up the cleaning process. Now this.cleanup method works
    const outputPath = path.join(this.tempDir, `segment_${segment.id}.mp4`);
    return this.createMediaSegment(segment, outputPath);
  }

  async findSuitableVideo(segment) {
    try {
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
        size: "medium",
        //For more choices and to avoid rate limits

        per_page: 15,

        orientation:
          this.config.width >= this.config.height ? "landscape" : "portrait",
      };
      //TODO: Implement cache with redis to avoid monthly API quotas
      for (const query of searchQueries) {
        try {
          const searchResults = await this.pexelsClient.videos.search({
            query,
            ...searchOptions,
          });
          //TODO Refine the logic here
          if (searchResults.videos && searchResults.videos.length > 0) {
            const videoFile = searchResults.videos[0].video_files.find(
              (file) => file.quality === "hd"
              // file.width === this.config.width &&
              // file.height === this.config.height
            );

            if (videoFile) {
              return {
                videoFile,
                query: query,
              };
            }
          }
        } catch (error) {
          this.logger.error(
            `Search failed for query '${query}': ${error.message}`
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error while searching for query '${query}': ${error}`);
      throw new Error(
        "No suitable media found after multiple searches. Please try again with different parameters."
      );
    }
  }
  
  /**
   * Creates a media-based video segment.
   *
   * @param {VideoSegment} segment - The segment details.
   * @param {string} outputPath - Path to save the generated segment.
   * @returns {Promise<string>} - Path to the media video segment.
   */
  async createMediaSegment(segment, outputPath) {
    try {
      if (!this.pexelsClient) {
        throw new Error("Pexels client not initialized");
      }

      // Fetch video
      const { videoFile } = await this.findSuitableVideo(segment);

      const response = await fetch(videoFile.link);
      if (!response.ok) {
        throw new Error(
          `Failed to download video. HTTP Status: ${response.status}`
        );
      }

      // Create temporary video file
      const tempVideoFile = tmp.fileSync({
        postfix: ".mp4",
        discardDescriptor: true,
      });
      if (!tempVideoFile.name) {
        throw new Error("Failed to create temporary video file");
      }

      // Write video buffer to file
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(tempVideoFile.name, Buffer.from(buffer));

      const maxCharsPerLine = Math.floor(
        this.config.width / (this.config.fontSize * 0.6)
      ); // Estimate max chars per line

      let processedText = segment.text;

      if (processedText.length > maxCharsPerLine) {
        const words = processedText.split(" ");
        const mid = Math.ceil(words.length / 2);
        processedText = `${words.slice(0, mid).join(" ")}\n${words
          .slice(mid)
          .join(" ")}`;
      }

      // Create text file
      const textFile = tmp.fileSync({
        postfix: ".txt",
        discardDescriptor: true,
      });
      if (!textFile.name) {
        throw new Error("Failed to create temporary text file");
      }

      // Write formatted text to file as ffmpeg complains directly passing the text
      fs.writeFileSync(textFile.name, processedText);
      return new Promise((resolve, reject) => {
        try {
          // Resolve font path
          const font = path.resolve(this.config.font);
          if (!font) {
            throw new Error(
              "Font file not found. Please check your configuration."
            );
          }

          const calculatedBoxBorderWidth = this.config.height * 0.025;

          // Run FFmpeg
          ffmpeg(tempVideoFile.name)
            .inputOptions(this.ffmpegBaseOptions)
            .videoFilters([
              {
                filter: "drawtext",
                options: {
                  textfile: textFile.name,
                  fontfile: font,
                  fontsize: this.config.fontSize || 24,
                  fontcolor: "black",
                  box: 1,
                  boxcolor: "white@0.9",
                  boxborderw: calculatedBoxBorderWidth,
                  x: "(w-text_w)/2",
                  y: "(h-text_h)/2",
                  borderw: 2,
                  bordercolor: "black@0.2",
                  enable: `between(t,0,${segment.duration})`,
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
              textFile.removeCallback();
              tempVideoFile.removeCallback();
              resolve(outputPath);
            })
            .on("error", (err, _, stderr) => {
              this.logger.error(`Segmentation error: ${err}`);
              this.logger.error(`Ffmpeg error: ${stderr}`);
              textFile.removeCallback();
              tempVideoFile.removeCallback();
              reject(new Error(`FFmpeg failed: ${err.message}`));
            })
            .save(outputPath);
        } catch (ffmpegError) {
          this.logger.error(`Unexpected FFmpeg error: ${ffmpegError}`);
          reject(ffmpegError);
        }
      });
    } catch (error) {
      this.logger.error(`createMediaSegment error: ${error}`);
      throw error;
    }
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
      this.logger
        .terminal()
        .brightBlue(
          "[INFO] ✂️  Combining multiple video clips with transitions...\n"
        );

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

      return new Promise((resolve, reject) => {
        command
          .complexFilter(filters, "outv")
          .outputOptions([
            `-t ${accumulatedDuration}`,
            "-movflags +faststart",
            "-c:v libx264",
            `-r ${this.config.fps}`,
          ])

          .on("end", () => {
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
      this.logger.error(`Sync Error: ${error.message}`);
      reject(error);
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
      this.logger
        .terminal()
        .cyan("[INFO] 🎧 Adding the selected audio track to the video...\n");

      validatePath(audioPath, "audio");
      validatePath(videoPath, "video");

      return new Promise((resolve, reject) => {
        ffmpeg()
          .input(videoPath)
          .input(audioPath)
          .outputOptions([
            "-map 0:v", // Take video from first input
            "-map 1:a", // Take audio from second input
            "-c:v copy", // Copy video stream without re-encoding
            "-c:a aac", // Encode audio to AAC format
            "-shortest", // Match duration to shortest input
            "-movflags +faststart", // Optimize for web playback
          ])
          .on("end", () => {
            resolve(outputPath);
          })
          .on("error", (err, stdout, stderr) => {
            this.logger.error(`Error mergin audio into video: ${err.message}`);
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
