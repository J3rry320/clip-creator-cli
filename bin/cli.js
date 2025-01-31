#!/usr/bin/env node
/**
 * @remarks
 * This project is open source under the MIT license. 
 * Contributions, improvements, and usage are welcome.
 * 
 * For professional inquiries or hiring me, please visit [my LinkedIn](https://www.linkedin.com/in/jerrythejsguy/).
 */

const { Command } = require("commander");
const term = require("terminal-kit").terminal;
const fs = require("fs");
const path = require("path");
const Logger = require("../src/utils/logger");
const { CATEGORIES, TONES } = require("../src/config");
const {
  getCategoryDescription,
  getToneDescription,
} = require("../src/utils/messageGenerator");
const { createVideo } = require("../src/");
const { getNoiseLessConfig } = require("../src/utils");
require("dotenv").config();

const logger = new Logger();

const program = new Command();

const STYLES = {
  title: term.bold.cyan,
  subtitle: term.white,
  prompt: term.bold.yellow,
  input: term.white.bgBlack,
  error: term.bold.red,
  success: term.bold.green,
  highlight: term.bold.cyan,
  option: term.bold.magenta,
  dim: term.white,
};

term.grabInput(true);
term.on("key", (name) => {
  if (name === "CTRL_C") {
    term.processExit(0);
  }
});
logger.drawAsciiArt("Clip Creator CLI");

program
  .name("clip-creator")
  .description(
    "A powerful CLI tool for creating engaging video clips with AI-generated audio and scripts. " +
      "Supports multiple content categories, tones, and customizable parameters for perfect content generation."
  )
  .version("1.0.0");

program
  .command("create")
  .description("Create a new video clip with customizable parameters")
  .option("--config <path>", "Path to configuration file (JSON)")
  .option("--freeSoundKey <key>", "FreeSound API Key")
  .option("--groqKey <key>", "GROQ API Key")
  .option("--pexelsKey <key>", "Pexels API Key")
  .option(
    "--category <category>",
    "Content category (use list-categories to see options)"
  )
  .option("--tone <tone>", "Content tone (use list-tones to see options)")
  .option("--topic <topic>", "Main topic or subject of the video")
  .option(
    "--keyTerms <terms...>",
    "Key terms to include in the content (comma-separated)"
  )
  .option("--duration <seconds>", "Duration of the video in seconds", parseInt)
  .option(
    "--requireFactChecking",
    "Enable fact-checking in content generation",
    false
  )
  .option(
    "--outputDir <path>",
    "Directory to store generated media (default: clip-creator-media)"
  )
  .option(
    "--fontSize <size>",
    "Font size of the text (defaults to 24)",
    parseInt
  )
  .option(
    "--font <path>",
    "Path to the font file (.ttf), defaults to Open Sans"
  )
  .option(
    "--fps <fps>",
    "Frames per second of the video (0-60, defaults to 30)",
    parseInt
  )
  .option(
    "--height <height>",
    "Height of the video in pixels (defaults to 1280)",
    parseInt
  )
  .option(
    "--width <width>",
    "Width of the video in pixels (defaults to 720)",
    parseInt
  )

  .option(
    "--volume <level>",
    "Audio volume (0 to mute, 0-1 for volume level)",
    parseFloat
  )
  .option(
    "--fadeInDuration <seconds>",
    "Duration for fade-in effect in seconds",
    parseFloat
  )
  .option(
    "--fadeOutDuration <seconds>",
    "Duration for fade-out effect in seconds",
    parseFloat
  )
  .option("--webRunner", "Command for the web runner to skip CLI inputs")

  .action(async (options) => {
    try {
      if (options.webRunner) {
        await validateCoreConfig(options);
        await processVideoCreation(options);
      } else {
        const config = await loadConfig(options.config);
        const finalConfig = await getConfiguration(options, config);
        await validateCoreConfig(finalConfig);
        await processVideoCreation(finalConfig);
      }
    } catch (error) {
      STYLES.error(`\n⚠️  Error: ${error.message}\n`);
      process.exit(1);
    }
  });

program
  .command("list-categories")
  .option("-v, --verbose", "Display available content tones with descriptions")
  .description("Display available content categories with descriptions")
  .action((option) => {
    term.bold.cyan("Available Categories:\n");
    CATEGORIES.forEach((category) => {
      term.bold(`\n${category}`);
      (option.verbose || option.v) &&
        term(`\n${getCategoryDescription(category)}\n`);
    });
    process.exit(0);
  });

program
  .command("list-tones")
  .option("-v, --verbose", "Display available content tones with descriptions")
  .description("Display available content tones")
  .action((option) => {
    term.bold.cyan("Available Tones:\n");
    TONES.forEach((tone) => {
      term.bold(`\n${tone}`);
      (option.verbose || option.v) && term(`\n${getToneDescription(tone)}\n`);
    });
    process.exit(0);
  });
program
  .command("web")
  .description("Start web interface")
  .option("-p, --port <number>", "Port to run the server on", 3003)
  .action(async (options) => {
    try {
      require("../src/web/server").initializeServer(options.port);
      STYLES.success(
        `\n✅ Web interface running at http://localhost:${options.port}/index.html\n`
      );
    } catch (error) {
      STYLES.error(`\n⚠️  Error starting web interface: ${error.message}\n`);
      process.exit(1);
    }
  });
program.parse(process.argv);

process.on("exit", () => {
  term.red.bold("\n\nExiting Clip-Creator CLI... Goodbye!\n");

  term.grabInput(false);
});
async function loadConfig(configPath) {
  if (!configPath) return {};

  try {
    const resolvedPath = path.resolve(configPath);

    const config = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));

    validateConfigStructure(config);
    return config;
  } catch (error) {
    logger.error(`Error reading config file: ${error.message}`);

    process.exit(1);
  }
}

function validateConfigStructure(config) {
  const validKeys = ["freeSoundApiKey", "groqApiKey", "pexelsApiKey"];
  const invalidKeys = Object.keys(config).filter(
    (key) => !validKeys.includes(key)
  );
  if (invalidKeys.length > 0) {
    throw new Error(
      `Invalid keys provided in config for these keys: ${invalidKeys.join(
        ", "
      )}`
    );
  }
}

async function validateCoreConfig(config) {
  const required = {
    "FreeSound API Key": config.freeSoundKey,
    "GROQ API Key": config.groqKey,
    "Pexels API Key": config.pexelsKey,
    Category: config.category,
    Tone: config.tone,
    Topic: config.topic,
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(", ")}`);
  }
}
function formatConfigValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "✅ Enabled" : "❌ Disabled";
  if (typeof value === "number")
    return Number.isInteger(value) ? value : value.toFixed(2);
  return value;
}

async function getConfiguration(cliOptions, fileConfig) {
  const config = {
    // Required parameters
    freeSoundKey: cliOptions.freeSoundKey || fileConfig.freeSoundApiKey,
    groqKey: cliOptions.groqKey || fileConfig.groqApiKey,
    pexelsKey: cliOptions.pexelsKey || fileConfig.pexelsApiKey,
    category: cliOptions.category || fileConfig.category,
    tone: cliOptions.tone || fileConfig.tone,
    topic: cliOptions.topic || fileConfig.topic,

    duration: cliOptions.duration || fileConfig.duration,
    // Optional parameters
    keyTerms: cliOptions.keyTerms ?? fileConfig.keyTerms,
    requireFactChecking:
      cliOptions.requireFactChecking ?? fileConfig.requireFactChecking,
    outputDir: cliOptions.outputDir ?? fileConfig.outputDir,
    volume: cliOptions.volume ?? fileConfig.volume,
    fadeInDuration: cliOptions.fadeInDuration ?? fileConfig.fadeInDuration,
    fadeOutDuration: cliOptions.fadeOutDuration ?? fileConfig.fadeOutDuration,
    fontSize: cliOptions.fontSize ?? fileConfig.fontSize,
    font: cliOptions.font ?? fileConfig.font,
    fps: cliOptions.fps ?? fileConfig.fps,
    height: cliOptions.height ?? fileConfig.height,
    width: cliOptions.width ?? fileConfig.width,
  };

  await collectRequiredConfig(config);
  if (await promptBoolean("Configure advanced options?")) {
    await collectOptionalConfig(config);
  }

  return config;
}

async function collectRequiredConfig(config) {
  if (!config.freeSoundKey)
    config.freeSoundKey = await promptText("FreeSound API Key:", "", true);

  if (!config.groqKey)
    config.groqKey = await promptText("GROQ API Key:", "", true);

  if (!config.pexelsKey)
    config.pexelsKey = await promptText("Pexels API Key:", "", true);

  if (!config.duration) {
    config.duration = await promptNumber("Duration (seconds):", 10, 60);
  }
  if (!config.category) config.category = await promptCategory();
  if (!config.tone) config.tone = await promptTone();
  if (!config.topic)
    config.topic = await promptText(
      "Video topic:",
      "e.g., AI advancements",
      true
    );
}

async function collectOptionalConfig(config) {
  if (!config.keyTerms) {
    if (await promptBoolean("Add key terms?")) {
      config.keyTerms = await promptKeyTerms();
    }
  }

  config.requireFactChecking = await promptBoolean("Enable fact-checking?");

  if (!config.outputDir) {
    config.outputDir = await promptText(
      "Output directory:",
      "Defaults to current_working_dir/clip-creator-media (press Enter to skip)"
    );
  }

  if (!config.volume) {
    config.volume = await promptNumber("Volume (0-1):", 0.3, 1);
  }

  if (!config.fadeInDuration) {
    config.fadeInDuration = await promptNumber(
      "Fade-in duration (seconds):",
      0,
      5
    );
  }

  if (!config.fadeOutDuration) {
    config.fadeOutDuration = await promptNumber(
      "Fade-out duration (seconds):",
      0,
      5
    );
  }
  if (!config.fontSize) {
    config.fontSize = await promptNumber("Font size of the text:", 12, 72);
  }

  if (!config.font) {
    config.font = await promptText(
      "Path to the font file:",
      "Defaults to Open Sans (press Enter to skip)"
    );
  }

  if (!config.fps) {
    config.fps = await promptNumber("Frames per second (FPS):", 1, 60);
  }

  if (!config.height) {
    config.height = await promptNumber("Height of the video (px):", 240, 1920);
  }

  if (!config.width) {
    config.width = await promptNumber("Width of the video (px):", 240, 1920);
  }
}

async function promptMenuSelection(items) {
  const screen = term.gridMenu(items, {
    y: 4,
    left: 2,

    width: term.width - 4,
    selectedLeftPadding: "▶ ",
    unselectedLeftPadding: "  ",
    style: term.inverse,
    selectedStyle: term.bold.bgBrightGreen.black,
  });

  const response = await screen.promise;
  return items[response.selectedIndex];
}

async function promptCategory() {
  term.clear();
  STYLES.title(`📺 Content Category Selection \n`);
  STYLES.subtitle("Use arrow keys to navigate • Enter to select\n\n");

  return promptMenuSelection(CATEGORIES);
}

async function promptTone() {
  term.clear();
  STYLES.title(`🎭 Content Tone Selection  \n`);
  STYLES.subtitle("Use arrow keys to navigate • Enter to select\n");

  return promptMenuSelection(TONES);
}

async function promptText(message, placeholder = "", required) {
  let input;
  while (true) {
    term("\n");
    STYLES.prompt(`➤ ${message}`);
    placeholder && STYLES.dim(` (${placeholder})`);
    term("\n");

    input = await term.inputField({
      style: STYLES.input,
      hintStyle: STYLES.dim,
      placeholder: placeholder,
      maxLength: 100,
    }).promise;

    input = input.trim();

    if (!required || input) break;
    STYLES.error("✖ This field is required\n");
  }
  return input;
}

async function promptKeyTerms() {
  term.clear();
  STYLES.title(`\n  🏷️  Key Terms Entry  \n`);
  STYLES.subtitle(
    `Enter comma-separated terms • Press Return/Enter key when done\n`
  );

  const terms = await term.inputField({
    style: STYLES.input,
    hintStyle: STYLES.dim,
    placeholder: "e.g., artificial intelligence, machine learning",
    maxLength: 200,
  }).promise;

  return terms
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

async function promptNumber(message, min, max) {
  let value;
  while (true) {
    term("\n");
    STYLES.prompt(`➤ ${message} `);
    STYLES.dim(`[${min}-${max}]\n`);

    const input = await term.inputField({
      style: STYLES.input,
      default: min.toString(),
    }).promise;

    value = Number(input);

    if (!isNaN(value) && value >= min && value <= max) break;

    STYLES.error(`\n✖ Please enter a number between ${min} and ${max}\n`);
  }
  return value;
}

async function promptBoolean(message) {
  term("\n");
  STYLES.prompt(`➤ ${message}\n`);

  const response = await term.singleLineMenu([" Yes ", " No "], {
    leftPadding: "  ",
    selectedLeftPadding: "▶ ",
    selectedStyle: term.bold.bgGreen.black,
    style: term.inverse,
  }).promise;

  return response.selectedIndex === 0;
}

async function processVideoCreation(config) {
  term.clear();
  STYLES.title(`\n  🎬  Video Creation Summary  \n`);

  const rows = [
    ["Parameter", "Value"],
    ["API Keys", "✅ Configured"],
    ...Object.entries(config)
      .filter(
        ([key]) =>
          !key.toLowerCase().includes("key") ||
          key.toLowerCase().includes("keyterms")
      )
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key.padEnd(10), formatConfigValue(value)]),
  ];

  term.table(rows, {
    hasBorder: true,
    borderChars: "rounded",
    borderAttr: STYLES.dim,
    firstCellTextAttr: { bold: true },
    width: 60,
    fit: true,
  });

  term("\n\n");
  STYLES.success("✅  Starting video creation process...\n");
  const noiseLessConfig = getNoiseLessConfig(config);
  const output = await createVideo(noiseLessConfig);
  logger.terminal().green(logger.drawAsciiArt("Success !"));
  logger
    .terminal()
    .bold.brightGreen(`\n📂 Your final video is ready at: ${output}\n`);
  logger
    .terminal()
    .bgBlue()
    .brightWhite(
      "\n✔ Thankyou for using Clip-Creator CLI. Please provide your valuable feedback to us online.\n"
    );
  process.exit(0);
}
