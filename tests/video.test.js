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
});
