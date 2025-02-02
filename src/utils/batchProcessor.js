const os = require("os");
const path = require("path");
const { EventEmitter } = require("events");
const { spawn } = require("child_process");
const Logger = require("./logger");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

class SimpleBatchProcessor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxConcurrent =
      options.maxConcurrent || Math.max(1, os.cpus().length - 1);
    this.activeProcesses = new Set();
    this.queue = [];
    this.results = [];
    this.errors = [];
    this.logger = new Logger();
  }

  createCommandArgs(config) {
    const cliPath = path.resolve(
      __dirname,
      process.env.NODE_ENV === "dev" ? "../../bin/cli.js" : "cli.js"
    );

    const args = ["create"];
    Object.entries(config).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      if (Array.isArray(value)) {
        args.push(`--${key}`, `"${value.join(",")}"`);
      } else if (typeof value === "boolean") {
        if (value) args.push(`--${key}`);
      } else if (key === "topic" || key === "tone" || key === "category") {
        args.push(`--${key}`, `"${value.toString()}"`);
      } else {
        args.push(`--${key}`, value.toString());
      }
    });
    args.push("--webRunner");

    return { cliPath, args };
  }

  extractLastLines(output, count = 3) {
    const lines = output.split("\n").filter((line) => line.trim());
    return lines.slice(-count)[0];
  }

  async processTask(task) {
    const { cliPath, args } = this.createCommandArgs(task.config);
    let outputBuffer = [];

    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      // Create a task header
      this.logger
        .terminal()
        .blue("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
        .white(`📹 Processing Task: ${task.id}\n`);
      console.log("Executing", cliPath, args.join(" "));
      const childProcess = spawn("node", [cliPath, ...args], {
        stdio: ["pipe", "pipe", "pipe"],
        shell: true,
      });
      childProcess.stdout.on("data", (data) => {
        outputBuffer.push(data);
      });

      childProcess.stderr.on("data", (data) => {
        const error = data.toString();
        outputBuffer.push(error);

        this.logger.error(`⚠️  ${error.trim()}\n`);
      });

      childProcess.on("close", (code) => {
        this.activeProcesses.delete(task.id);
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        if (code === 0) {
          // Success case
          const lastLine = this.extractLastLines(outputBuffer.join("\n"));

          this.logger
            .terminal()
            .white(`\n⏱️ Duration: ${duration}s\n`)
            .cyan("\nOutput Received from Task:\n");
          this.logger.terminal().green(`\n${lastLine?.trim()}\n`);

          this.logger
            .terminal()
            .blue("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

          this.results.push({
            taskId: task.id,
            duration: duration,
          });

          this.emit("progress", {
            taskId: task.id,
            status: "complete",
            duration,
          });

          resolve();
        } else {
          // Error case
          this.logger
            .terminal()
            .red("\n✖ Task Failed\n")
            .white(`⏱️  Duration: ${duration}s\n`)
            .red(`Error Code: ${code}\n`);

          const errorMessage = `Process failed after ${duration}s`;
          this.errors.push({
            taskId: task.id,
            error: errorMessage,
            duration: duration,
          });

          this.emit("error", {
            taskId: task.id,
            error: errorMessage,
            duration,
          });

          reject(new Error(errorMessage));
        }

        this.processQueue();
      });

      childProcess.on("error", (error) => {
        this.activeProcesses.delete(task.id);
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        this.logger
          .terminal()
          .red("\n✖ Task Error\n")
          .white(`⏱️  Duration: ${duration}s\n`)
          .red(`${error.message}\n`);

        this.errors.push({
          taskId: task.id,
          error: error.message,
          duration,
        });

        reject(error);
        this.processQueue();
      });
    });
  }

  async processQueue() {
    while (
      this.queue.length > 0 &&
      this.activeProcesses.size < this.maxConcurrent
    ) {
      const task = this.queue.shift();
      this.activeProcesses.add(task.id);
      this.logger.info(
        `▶️  Starting task ${task.id} (${this.activeProcesses.size}/${this.maxConcurrent} active)`
      );
      this.processTask(task);
    }

    if (this.queue.length === 0 && this.activeProcesses.size === 0) {
      const successCount = this.results.length;
      const errorCount = this.errors.length;
      const totalDuration = this.results
        .reduce((acc, r) => acc + parseFloat(r.duration), 0)
        .toFixed(2);

      this.logger.drawAsciiArt("Complete!");

      this.logger
        .terminal()
        .green(`\n✓ Successfully completed: ${successCount} videos\n`)
        .white(`⏱️  Total processing time: ${totalDuration}s\n`);

      if (errorCount > 0) {
        this.logger.terminal().red(`✖ Failed: ${errorCount} videos\n`);
      }

      this.emit("complete", {
        results: this.results,
        errors: this.errors,
        totalDuration,
      });
    }
  }

  async process(baseConfig, count) {
    const batchId = Date.now().toString();

    this.logger.drawAsciiArt("Starting Batch");
    this.logger
      .terminal()
      .white(`\n📦 Batch ID: ${batchId}\n`)
      .white(`🎯 Videos to create: ${count}\n`)
      .white(`⚡ Concurrent processes: ${this.maxConcurrent}\n`);

    const tasks = Array(count)
      .fill()
      .map((_, index) => ({
        id: `${batchId}-${index}`,
        config: { ...baseConfig },
      }));

    this.queue.push(...tasks);
    this.processQueue();

    return new Promise((resolve) => {
      this.once("complete", resolve);
    });
  }

  getStatus() {
    this.logger
      .terminal()
      .white("\n📊 Current Status\n")
      .gray(`├─ 🔄 Queued: ${this.queue.length}\n`)
      .green(`├─ ⚡ Active: ${this.activeProcesses.size}\n`)
      .green(`├─ ✓ Completed: ${this.results.length}\n`)
      .red(`└─ ✖ Errors: ${this.errors.length}\n`);
  }
}

module.exports = SimpleBatchProcessor;
