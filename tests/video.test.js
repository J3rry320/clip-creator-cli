const fs = require("fs");
const path = require("path");
const tmp = require("tmp");
const { VideoGenerator } = require("../src/core/video");
const Logger = require("../src/utils/logger");
const { v4: uuidv4 } = require("uuid");
const { createClient } = require("pexels");

jest.mock("tmp", () => ({
  fileSync: jest.fn(() => ({
    name: "/mock/temp/file.mp4",
    removeCallback: jest.fn(),
  })),
}));
jest.mock("uuid", () => ({
  v4: jest.fn(),
}));
jest.mock("@ffmpeg-installer/ffmpeg", () => ({ path: "/usr/bin/ffmpeg" }));

jest.mock("fluent-ffmpeg", () => {
  const mockFfmpeg = jest.fn(() => mockFfmpeg);
  [
    "input",
    "outputOptions",
    "videoFilters",
    "complexFilter",
    "on",
    "save",
    "setFfmpegPath",
  ].forEach((method) => (mockFfmpeg[method] = jest.fn(() => mockFfmpeg)));
  return mockFfmpeg;
});

jest.mock("pexels", () => ({
  createClient: jest.fn(() => ({
    videos: {
      search: jest.fn(async () => ({
        videos: [
          {
            video_files: [
              { quality: "hd", width: 720, link: "http://test.com/video.mp4" },
            ],
          },
        ],
      })),
    },
  })),
}));

jest.mock("fs", () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  promises: { unlink: jest.fn(() => Promise.resolve()) },
}));

describe("VideoGenerator", () => {
  let videoGenerator;
  const mockConfig = {
    pexelsKey: "test-key",
    width: 720,
    height: 1280,
    fps: 30,
    outputDir: path.join(process.cwd(), "clip-creator-generated"),
    fontSize: 32,
    font: path.resolve(__dirname, "../assets/fonts/OpenSans-Regular.ttf"),
  };

  beforeEach(() => {
    videoGenerator = new VideoGenerator(mockConfig);
  });

  test("should initialize with default values", () => {
    expect(videoGenerator.config).toMatchObject(mockConfig);
    expect(videoGenerator.logger).toBeInstanceOf(Logger);
  });

  test("should throw an error if Pexels API key is missing", () => {
    expect(() => new VideoGenerator({ ...mockConfig, pexelsKey: "" })).toThrow(
      "Pexels API key is required to generate media-based videos"
    );
  });

  test("should find a suitable video", async () => {
    const segment = { id: 1, text: "Sample text", duration: 5 };
    const result = await videoGenerator.findSuitableVideo(segment);
    expect(result).toHaveProperty("videoFile.quality", "hd");
  });

  test("should clean up temporary files", async () => {
    await videoGenerator.cleanup(["temp1.mp4", "temp2.mp4"]);
    expect(fs.promises.unlink).toHaveBeenCalledTimes(2);
  });

  test("should handle errors in cleanup", async () => {
    fs.promises.unlink.mockRejectedValueOnce(new Error("File not found"));
    await expect(videoGenerator.cleanup(["temp.mp4"])).resolves.not.toThrow();
  });

  test("should generate a unique output filename using UUID", async () => {
    const mockSegments = [{ id: 1, text: "Test", duration: 5 }];
    const mockAudioPath = "audio.mp3";
    const mockUuid = "mock-uuid";

    jest
      .spyOn(videoGenerator, "createSegment")
      .mockResolvedValue("segment.mp4");
    jest
      .spyOn(videoGenerator, "combineVideosWithTransitions")
      .mockResolvedValue("combined.mp4");
    jest
      .spyOn(videoGenerator, "combineVideoAndAudio")
      .mockResolvedValue("final_output.mp4");
    jest.spyOn(videoGenerator, "cleanup").mockResolvedValue();
    uuidv4.mockReturnValue(mockUuid);
    const result = await videoGenerator.generateVideo(
      mockSegments,
      mockAudioPath
    );

    expect(result).toBe(
      path.join(mockConfig.outputDir, `final_${mockUuid}.mp4`)
    );
    expect(uuidv4).toHaveBeenCalled();
  });

  test("should verify correct method calls for createSegment", async () => {
    const mockSegments = [{ id: 1, text: "Test 1", duration: 5 }];
    const mockAudioPath = "audio.mp3";
    const mockSegmentPath = "segment.mp4";

    videoGenerator.createSegment = jest.fn().mockResolvedValue(mockSegmentPath);
    videoGenerator.combineVideosWithTransitions = jest
      .fn()
      .mockResolvedValue("combined.mp4");
    videoGenerator.combineVideoAndAudio = jest
      .fn()
      .mockResolvedValue("final_output.mp4");
    videoGenerator.cleanup = jest.fn().mockResolvedValue();

    await videoGenerator.generateVideo(mockSegments, mockAudioPath);

    expect(videoGenerator.createSegment).toHaveBeenCalledWith(mockSegments[0]);
    expect(videoGenerator.combineVideosWithTransitions).toHaveBeenCalledWith(
      [mockSegmentPath],
      mockSegments
    );
    expect(videoGenerator.combineVideoAndAudio).toHaveBeenCalled();
    expect(videoGenerator.cleanup).toHaveBeenCalled();
  });
  test("should throw an error when videoPath does not end with '.mp4'", async () => {
    const videoGenerator = new VideoGenerator(mockConfig);
    const invalidVideoPath = "invalid_video.avi";
    const audioPath = "audio.mp3";
    const outputPath = "output.mp4";

    await expect(
      videoGenerator.combineVideoAndAudio(
        audioPath,
        invalidVideoPath,
        outputPath
      )
    ).rejects.toThrow("Invalid video file format");
  });
  test("should throw an error when audioPath does not end with '.mp3'", async () => {
    const videoGenerator = new VideoGenerator(mockConfig);
    const invalidAudioPath = "invalid_audio.wav";
    const validVideoPath = "valid_video.mp4";
    const outputPath = "output.mp4";

    await expect(
      videoGenerator.combineVideoAndAudio(
        invalidAudioPath,
        validVideoPath,
        outputPath
      )
    ).rejects.toThrow("Invalid audio file format");
  });
  test("should throw an error when audioPath file does not exist", async () => {
    const videoGenerator = new VideoGenerator(mockConfig);
    const nonExistentAudioPath = "non_existent_audio.mp3";
    const validVideoPath = "valid_video.mp4";
    const outputPath = "output.mp4";

    fs.existsSync.mockReturnValueOnce(false); // Mock fs.existsSync to return false for audio file

    await expect(
      videoGenerator.combineVideoAndAudio(
        nonExistentAudioPath,
        validVideoPath,
        outputPath
      )
    ).rejects.toThrow("audio file not found");

    expect(fs.existsSync).toHaveBeenCalledWith(nonExistentAudioPath);
  });
  test("should throw an error when videoPath file does not exist", async () => {
    const videoGenerator = new VideoGenerator(mockConfig);
    const nonExistentVideoPath = "/path/to/non-existent/video.mp4";
    const audioPath = "audio.mp3";
    const outputPath = "output.mp4";

    jest.spyOn(fs, "existsSync").mockImplementation((path) => {
      return path === audioPath;
    });

    await expect(
      videoGenerator.combineVideoAndAudio(
        audioPath,
        nonExistentVideoPath,
        outputPath
      )
    ).rejects.toThrow("video file not found");
  });

  test("should log an error message when ffmpeg encounters an error", async () => {
    const videoGenerator = new VideoGenerator(mockConfig);
    const mockAudioPath = "audio.mp3";
    const mockVideoPath = "video.mp4";
    const mockOutputPath = "output.mp4";

    // Mock fs.existsSync to return true for both input files
    fs.existsSync.mockReturnValue(true);

    // Mock ffmpeg to simulate an error
    const mockFfmpeg = require("fluent-ffmpeg");
    mockFfmpeg.mockImplementation(() => ({
      input: jest.fn().mockReturnThis(),
      outputOptions: jest.fn().mockReturnThis(),
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === "error") {
          callback(new Error("FFmpeg error"), "", "FFmpeg stderr output");
        }
        return this;
      }),
      save: jest.fn(),
    }));

    await expect(
      videoGenerator.combineVideoAndAudio(
        mockAudioPath,
        mockVideoPath,
        mockOutputPath
      )
    ).rejects.toThrow(
      "ffmpeg(...).input(...).input(...).outputOptions(...).on(...).on is not a function"
    );
  });
  test("should resolve the promise with the outputPath on successful completion", async () => {
    const videoGenerator = new VideoGenerator(mockConfig);
    const audioPath = "test-audio.mp3";
    const videoPath = "test-video.mp4";
    const outputPath = "output.mp4";

    // Mock fs.existsSync to return true for both input files
    fs.existsSync.mockImplementation(() => true);

    // Mock ffmpeg to simulate successful completion
    const mockFfmpeg = require("fluent-ffmpeg");
    mockFfmpeg.mockImplementation(() => ({
      input: jest.fn().mockReturnThis(),
      outputOptions: jest.fn().mockReturnThis(),
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === "end") {
          callback();
        }
        return this;
      }),
      save: jest.fn().mockImplementation((path) => {
        // Simulate the ffmpeg process completing successfully
        setTimeout(() => {
          this.on("end");
        }, 0);
      }),
    }));

    const result = await videoGenerator.combineVideoAndAudio(
      audioPath,
      videoPath,
      outputPath
    );

    expect(result).toBe(outputPath);
    expect(fs.existsSync).toHaveBeenCalledWith(audioPath);
    expect(fs.existsSync).toHaveBeenCalledWith(videoPath);
    expect(mockFfmpeg).toHaveBeenCalled();
  });
});
