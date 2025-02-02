const { spawn } = require("child_process");
const os = require("os");
const path = require("path");
const SimpleBatchProcessor = require("../src/utils/batchProcessor");
const Logger = require("../src/utils/logger");

jest.mock("child_process", () => ({
  spawn: jest.fn(() => ({
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    on: jest.fn((event, callback) => {
      if (event === "close") {
        setTimeout(() => callback(0), 10); // Simulate async close
      }
    }),
    kill: jest.fn(),
  })),
}));

jest.mock("../src/utils/logger", () => {
  const mockLogger = {
    terminal: jest.fn(() => mockLogger),
    green: jest.fn(() => mockLogger),
    red: jest.fn(() => mockLogger),
    white: jest.fn(() => mockLogger),
    blue: jest.fn(() => mockLogger),
    cyan: jest.fn(() => mockLogger),
    gray: jest.fn(() => mockLogger),
    info: jest.fn(),
    error: jest.fn(),
    drawAsciiArt: jest.fn(),
  };
  return jest.fn(() => mockLogger);
});

jest.mock("dotenv", () => ({
  config: jest.fn(),
}));

describe("SimpleBatchProcessor", () => {
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = new Logger();
    process.env.NODE_ENV = "test";
  });

  it("initializes with correct maxConcurrent", () => {
    const cpus = os.cpus().length;
    const processor = new SimpleBatchProcessor();
    expect(processor.maxConcurrent).toBe(Math.max(1, cpus - 1));
  });

  it("uses provided maxConcurrent", () => {
    const processor = new SimpleBatchProcessor({ maxConcurrent: 3 });
    expect(processor.maxConcurrent).toBe(3);
  });

  it("generates correct CLI path in dev", () => {
    process.env.NODE_ENV = "dev";
    const processor = new SimpleBatchProcessor();
    const { cliPath } = processor.createCommandArgs({});
    expect(cliPath).toMatch(/bin\/cli\.js$/);
  });

  it("generates correct CLI path in production", () => {
    process.env.NODE_ENV = "production";
    const processor = new SimpleBatchProcessor();
    const { cliPath } = processor.createCommandArgs({});
    expect(cliPath).toMatch(/cli\.js$/);
  });

  it("creates correct command args from config", () => {
    const processor = new SimpleBatchProcessor();
    const config = {
      template: "news",
      topic: "Tech News",
      silent: true,
      images: ["img1.jpg", "img2.jpg"],
    };
    const { args } = processor.createCommandArgs(config);
    expect(args).toEqual([
      "create",
      "--template",
      "news",
      "--topic",
      '"Tech News"',
      "--silent",
      "--images",
      '"img1.jpg,img2.jpg"',
      "--webRunner",
    ]);
  });

  it("processes tasks with concurrency", async () => {
    const processor = new SimpleBatchProcessor({ maxConcurrent: 2 });
    const processPromise = processor.process({}, 3);

    expect(spawn).toHaveBeenCalledTimes(2);
    expect(processor.activeProcesses.size).toBe(2);
    expect(processor.queue.length).toBe(1);

    // Resolve all processes
    await processPromise;
    expect(processor.results).toHaveLength(3);
  });

  it("emits complete event with results", async () => {
    const processor = new SimpleBatchProcessor();
    const completeListener = jest.fn();
    processor.on("complete", completeListener);

    const processPromise = processor.process({}, 2);
    await processPromise;

    expect(completeListener).toHaveBeenCalledWith({
      results: expect.arrayContaining([
        { taskId: expect.any(String), duration: expect.any(String) },
      ]),
      errors: [],
      totalDuration: expect.any(String),
    });
  });

  it("handles task errors", async () => {
    spawn.mockImplementationOnce(() => ({
      stdout: { on: jest.fn() },
      stderr: {
        on: jest.fn((event, callback) => callback(Buffer.from("error"))),
      },
      on: jest.fn((event, callback) => {
        if (event === "close") callback(1);
      }),
      kill: jest.fn(),
    }));

    const processor = new SimpleBatchProcessor();

    try {
      await processor.processTask({ id: "1", config: {} });
    } catch (error) {
      expect(error.message).toMatch(/Process failed after/);
    }

    expect(processor.errors).toContainEqual({
      taskId: "1",
      error: expect.any(String),
      duration: expect.any(String),
    });
  });

  it("getStatus logs correctly", () => {
    const processor = new SimpleBatchProcessor();
    processor.queue.push({}, {});
    processor.activeProcesses.add("1");
    processor.results.push({});
    processor.errors.push({});

    processor.getStatus();
    expect(mockLogger.gray).toHaveBeenCalledWith("├─ 🔄 Queued: 2\n");
    expect(mockLogger.green).toHaveBeenCalledWith("├─ ⚡ Active: 1\n");
    expect(mockLogger.green).toHaveBeenCalledWith("├─ ✓ Completed: 1\n");
    expect(mockLogger.red).toHaveBeenCalledWith("└─ ✖ Errors: 1\n");
  });
});
