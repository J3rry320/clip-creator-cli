const { PromptGenerator } = require("../src/core/script");
const { Groq } = require("groq-sdk");

jest.mock("groq-sdk", () => ({
  Groq: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  })),
}));
jest.mock("../src/utils/logger.js", () => {
  return jest.fn().mockImplementation(() => ({
    error: jest.fn(),
    terminal: jest.fn().mockReturnThis(),
    green: jest.fn().mockReturnThis(),
  }));
});

describe("PromptGenerator Test Suite", () => {
  let promptGenerator;
  let groqMock;

  beforeEach(() => {
    promptGenerator = new PromptGenerator("valid-api-key", groqMock);
  });
  test("Constructor initializes correctly", () => {
    expect(promptGenerator).toBeInstanceOf(PromptGenerator);
    expect(promptGenerator.API_KEY).toBe("valid-api-key");
  });

  test("Constructor throws error when API key is missing", () => {
    expect(() => new PromptGenerator()).toThrow(
      "API key is required to use the PromptGenerator"
    );
  });

  test("validateConfig throws error for missing fields", () => {
    const config = { duration: 30 };
    expect(() => promptGenerator.validateConfig(config)).toThrow(
      "Missing required fields: category, tone"
    );
  });

  test("validateConfig passes with valid config", () => {
    const config = { duration: 30, category: "education", tone: "informative" };
    expect(() => promptGenerator.validateConfig(config)).not.toThrow();
  });

  test("generateUserPrompt constructs prompt correctly", () => {
    const config = {
      duration: 30,
      category: "education",
      tone: "informative",
      topic: "AI in Healthcare",
      keyTerms: ["AI", "Healthcare", "Future"],
      requireFactChecking: true,
    };

    const prompt = PromptGenerator.generateUserPrompt(config);
    expect(prompt).toContain(
      "Create a 30-second education video about: AI in Healthcare"
    );
    expect(prompt).toContain("Verify all facts");
  });

  test("validateResponse throws error on empty response", () => {
    const completion = { choices: [{ message: { content: "{}" } }] };
    expect(() => promptGenerator.validateResponse(completion)).toThrow(
      "Empty response from model"
    );
  });

  test("validateResponse correctly parses valid API response", () => {
    const validCompletion = {
      choices: [
        {
          message: {
            content:
              '{"segments":[{"id":1,"text":"Segment 1 text","duration":5,"description":"description","transition":"fade"}]}',
          },
        },
      ],
    };

    const validatedScript = promptGenerator.validateResponse(validCompletion);
    expect(validatedScript.segments).toBeInstanceOf(Array);
    expect(validatedScript.segments[0].id).toBe(1);
    expect(validatedScript.segments[0].transition).toBe("fade");
  });

  test("shouldRetry returns correct values for different errors", () => {
    expect(
      promptGenerator.shouldRetry(new Error("Invalid JSON response"))
    ).toBe(true);
    expect(
      promptGenerator.shouldRetry(new Error("Unexpected end of JSON input"))
    ).toBe(true);
    expect(promptGenerator.shouldRetry(new Error("400"))).toBe(true);
    expect(promptGenerator.shouldRetry(new Error("Some other error"))).toBe(
      false
    );
  });

  test("generateScript retries on failure and succeeds on third attempt", async () => {
    const config = { duration: 30, category: "education", tone: "informative" };

    const validResponse = {
      choices: [
        {
          message: {
            content:
              '{"segments":[{"id":1,"text":"Test segment","duration":5,"description":"Test description","transition":"fade"}]}',
          },
        },
      ],
    };

    const groqMock = {
      chat: {
        completions: {
          create: jest
            .fn()
            .mockImplementationOnce(() => {
              return Promise.reject(new Error("Invalid JSON response"));
            })
            .mockImplementationOnce(() => {
              return Promise.reject(new Error("Empty response from model"));
            })
            .mockImplementationOnce(() => {
              return Promise.resolve(validResponse);
            }),
        },
      },
    };

    promptGenerator.groq = groqMock;

    promptGenerator.validateConfig = jest.fn();
    promptGenerator.validateResponse = jest.fn().mockReturnValue({
      segments: [{ id: 1, text: "Test segment" }],
    });

    promptGenerator.delay = jest.fn();

    const result = await promptGenerator.generateScript(config);

    expect(promptGenerator.validateConfig).toHaveBeenCalledWith(config);
    expect(groqMock.chat.completions.create).toHaveBeenCalledTimes(3);
    expect(promptGenerator.validateResponse).toHaveBeenCalledWith(
      validResponse
    );
    expect(promptGenerator.delay).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ segments: [{ id: 1, text: "Test segment" }] });
  });

  test("generateScript handles invalid API key", async () => {
    const invalidApiKeyPromptGenerator = new PromptGenerator("invalid-api-key");
    const config = { duration: 30, category: "education", tone: "informative" };

    const groqMock = {
      chat: {
        completions: {
          create: jest.fn().mockRejectedValue(new Error("Invalid API key")),
        },
      },
    };

    invalidApiKeyPromptGenerator.groq = groqMock;

    await expect(
      invalidApiKeyPromptGenerator.generateScript(config)
    ).rejects.toThrow(PromptGenerator.LLM_ERROR_MESSAGE);
  });

  test("generateScript logs errors and retries on failure", async () => {
    const config = { duration: 30, category: "education", tone: "informative" };
    const unexpectedError = new Error("Unexpected API error");

    const groqMock = {
      chat: {
        completions: {
          create: jest.fn().mockRejectedValue(unexpectedError),
        },
      },
    };

    promptGenerator.groq = groqMock;
    promptGenerator.logger.error = jest.fn();

    await expect(promptGenerator.generateScript(config)).rejects.toThrow(
      PromptGenerator.LLM_ERROR_MESSAGE
    );

    expect(promptGenerator.logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Attempt 1 failed:")
    );
  });
});
