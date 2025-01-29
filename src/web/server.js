const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");
const Logger = require("../utils/logger");
const app = express();
const logger = new Logger();
const fs = require("fs");
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get("/api/create-video", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const config = JSON.parse(decodeURIComponent(req.query.config || "{}"));

  // Convert config object to CLI arguments
  const args = ["create"];
  if (config.freeSoundKey) args.push("--freeSoundKey", config.freeSoundKey);
  if (config.groqKey) args.push("--groqKey", config.groqKey);
  if (config.pexelsKey) args.push("--pexelsKey", config.pexelsKey);
  if (config.category) args.push("--category", `"${config.category}"`);
  if (config.tone) args.push("--tone", `"${config.tone}"`);
  if (config.topic) args.push("--topic", `"${config.topic}"`);
  if (config.duration) args.push("--duration", config.duration);
  if (config.keyTerms && Array.isArray(config.keyTerms)) {
    args.push("--keyTerms", config.keyTerms.join(","));
  }
  if (config.requireFactChecking) args.push("--requireFactChecking");
  if (config.outputDir) args.push("--outputDir", config.outputDir);
  if (config.fontSize) args.push("--fontSize", config.fontSize);
  if (config.font) args.push("--font", config.font);
  if (config.fps) args.push("--fps", config.fps);
  if (config.height) args.push("--height", config.height);
  if (config.width) args.push("--width", config.width);
  if (config.volume) args.push("--volume", config.volume);
  if (config.fadeInDuration)
    args.push("--fadeInDuration", config.fadeInDuration);
  if (config.fadeOutDuration)
    args.push("--fadeOutDuration", config.fadeOutDuration);

  const cliPath = path.resolve(__dirname, "../../bin/cli.js");

  console.log("Executing CLI:", "node", cliPath, ...args);
  const heartbeat = setInterval(() => {
    res.write(
      `data: ${JSON.stringify({ type: "ping", message: "keep-alive" })}\n\n`
    );
  }, 25000);
  // Spawn CLI process
  const cliProcess = spawn("node", [cliPath, ...args, "--webRunner"], {
    stdio: "pipe",
    shell: true,
  });

  let output = "";
  let error = "";
  let videoPath = "";

  cliProcess.stdout.on("data", (data) => {
    const message = data.toString();
    output += message;

    // Extract video path
    const pathMatch = message.match(/Your final video is ready at:\s*(.+)/);
    if (pathMatch && pathMatch[1]) {
      videoPath = pathMatch[1].trim();
    }

    // Send log message
    res.write(`data: ${JSON.stringify({ type: "log", message })}\n\n`);
  });

  cliProcess.stderr.on("data", (data) => {
    error += data.toString();
    console.error("CLI Error:", data.toString());
    res.write(
      `data: ${JSON.stringify({ type: "error", message: data.toString() })}\n\n`
    );
  });

  // Timeout protection
  const timeout = setTimeout(() => {
    cliProcess.kill();
    res.write(
      `data: ${JSON.stringify({
        type: "error",
        message: "Process timed out",
      })}\n\n`
    );
    res.end();
  }, 300000); // 5 minutes timeout

  cliProcess.on("close", (code) => {
    clearTimeout(timeout);
    clearInterval(heartbeat); // Stop heartbeat

    if (code === 0 && videoPath) {
      res.write(`data: ${JSON.stringify({ type: "complete", videoPath })}\n\n`);
    } else {
      res.write(
        `data: ${JSON.stringify({
          type: "error",
          message: error || "Process failed",
        })}\n\n`
      );
    }
    res.end();
  });
});

// Updated route to serve video files with custom output directory support
app.get("/api/video/:filepath", (req, res) => {
  const videoPath = path.resolve(req.params.filepath);

  if (!fs.existsSync(videoPath)) {
    return res.status(404).send("Video not found");
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;
    const fileStream = fs.createReadStream(videoPath, { start, end });

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "video/mp4",
    });
    req.on("close", () => {
      console.log("Client disconnected, stopping stream...");
      fileStream.destroy();
    });

    fileStream.pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
    });

    fs.createReadStream(videoPath).pipe(res);
  }
});

// Routes for categories and tones remain the same
app.get("/api/categories", (req, res) => {
  return getResponseFromCLI("list-categories", res);
});

app.get("/api/tones", (req, res) => {
  // 1. Use absolute path for reliability
  return getResponseFromCLI("list-tones", res);
});

// Helper functions remain the same
function parseOutput(output) {
  const lines = output.split("\n").map((line) => line.trim()); // Split and trim each line

  // Filter out lines that are likely part of ASCII art (based on non-alphabetic content)
  const filteredLines = lines.filter(
    (line) =>
      line.length > 0 && // Ignore empty lines
      /[a-zA-Z]/.test(line) && // Must contain at least one alphabetic character
      !/^[\s\W\d]+$/.test(line) // Ignore lines that are mostly symbols or numbers
  );

  filteredLines.shift();

  return filteredLines;
}
function getResponseFromCLI(command, res) {
  const cliPath = path.resolve(__dirname, "../../bin/cli.js");

  // 2. Create the child process
  const cliProcess = spawn("node", [cliPath, command], {
    stdio: "pipe",
    shell: true, // Needed for Windows environments
  });

  let output = "";
  let errorOutput = "";

  // 3. Handle stdout correctly
  cliProcess.stdout.on("data", (data) => {
    output += data.toString();
  });

  // 4. Handle stderr separately
  cliProcess.stderr.on("data", (data) => {
    errorOutput += data.toString();
  });

  // 5. Handle process closure
  cliProcess.on("close", (code) => {
    if (code !== 0) {
      logger.error(
        `CLI process exited with code ${code}. Error: ${errorOutput}`
      );
      return res.status(500).json({ error: "Failed to retrieve tones" });
    }

    try {
      const parsed = parseOutput(output);
      res.json({ data: parsed });
    } catch (e) {
      logger.error("Output parsing error:", e);
      res.status(500).json({ error: "Failed to parse tones output" });
    }
  });

  // 6. Handle process errors
  cliProcess.on("error", (err) => {
    logger.error("Process error:", err);
    res.status(500).json({ error: "Failed to start CLI process" });
  });
}
const PORT = 3003;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
