const fs = require("fs");
const path = require("path");
const { AudioManager } = require("../src/core/audio");
const Logger = require("../src/utils/logger");
const { pipeline } = require("stream/promises"); // ✅ Import pipeline
const { Readable } = require("stream");
const ffmpeg = require("fluent-ffmpeg");
const secrets = require("../secrets/config");
//TODO Why do we need to pass the timeout? Something is wrong
jest.mock("@ffmpeg-installer/ffmpeg", () => ({
  path: "/opt/homebrew/bin/ffmpeg",
}));
jest.mock("fluent-ffmpeg", () => ({
  setFfmpegPath: jest.fn(),
  ffprobe: jest.fn((_, cb) => cb(null, { format: { duration: 120 } })), // Mock audio metadata
  applyFadeEffects: jest.fn().mockResolvedValue("mock-output.mp3"),
}));

jest.mock("node-fetch", () => jest.fn());
jest.mock("fs", () => ({
  existsSync: jest.fn(() => false),
  mkdirSync: jest.fn(),
  createWriteStream: jest.fn(() => ({
    write: jest.fn(),
    end: jest.fn(),
  })),
  unlinkSync: jest.fn(),
}));

jest.mock("stream/promises", () => ({
  pipeline: jest.fn().mockResolvedValue(), // ✅ Mock pipeline
}));

jest.mock("../src/utils/logger");

describe("AudioManager", () => {
  let audioManager;
  let fetch;
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();

    Logger.mockImplementation(() => ({
      error: jest.fn(),
      terminal: jest.fn(() => ({
        cyan: jest.fn(),
        magenta: jest.fn(),
        yellow: jest.fn(),
      })),
    }));

    fetch = mockFetch;
    jest.mock("node-fetch", () => mockFetch);

    audioManager = new AudioManager({
      freeSoundKey: secrets.freeSoundApiKey,
      outputDir: path.join(__dirname, "test-output"),
      fadeInDuration: 2,
      fadeOutDuration: 4,
      volume: 0.3,
      outputFormat: "mp3",
    });
  });

  test("should throw error if FreeSound API key is missing", () => {
    expect(() => new AudioManager({})).toThrow("FreeSound API key is required");
  });

  test("should create output directory if it does not exist", () => {
    expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), {
      recursive: true,
    });
  });

  test("should return search terms for a given category", () => {
    expect(audioManager.getSearchTerms("Science & Technology")).toEqual([
      "electronic futuristic",
      "ambient digital",
    ]);
  });

  test("should return default search terms if category not found", () => {
    expect(audioManager.getSearchTerms("Unknown Category")).toEqual([
      "background music",
      "cinematic instrumental",
    ]);
  });

  test("should handle API request failure with retries", async () => {
    fetch.mockResolvedValue({ ok: false, status: 500 });
    await expect(
      audioManager.generateMusic({ category: "Science & Technology" })
    ).rejects.toThrow("Max retries reached");
  }, 20000);

  test("should handle API returning no results", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ results: [] }),
    });
    await expect(
      audioManager.generateMusic({ category: "Science & Technology" })
    ).rejects.toThrow("Max retries reached. Failed to generate music.");
  }, 20000);

  test("should handle audio download failure and retry", async () => {
    const mockTrack = {
      name: "Test Track",
      username: "Test User",
      previews: { "preview-lq-mp3": "http://example.com/audio.mp3" },
    };

    fetch.mockImplementation((url) => {
      if (url.includes(audioManager.FREESOUND_API_URL)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ results: [mockTrack] }),
        });
      } else if (url === mockTrack.previews["preview-lq-mp3"]) {
        return Promise.resolve({
          ok: false,
          status: 401,
        });
      }
    });

    const mockUuid = "mock-uuid";
    jest.spyOn(require("uuid"), "v4").mockReturnValue(mockUuid);

    await expect(
      audioManager.generateMusic({ category: "Science & Technology" })
    ).rejects.toThrow("Max retries reached. Failed to generate music.");

    expect(audioManager.logger.error).toHaveBeenCalledTimes(3);
    expect(audioManager.logger.error).toHaveBeenCalledWith(
      expect.stringMatching(/Attempt \d+ failed: /)
    );
  }, 20000);
});
