"use strict";

const term = require("terminal-kit").terminal;

const figlet = require("figlet");
const { LEGIBLE_FONTS } = require("../config");

class Logger {
  getTimestamp() {
    const now = new Date();
    return now.toISOString().replace("T", " ").replace("Z", "");
  }
  info(message) {
    term.green(`\n[INFO] [${this.getTimestamp()}] ${message}\n`);
  }

  warn(message) {
    term.yellow(`\n[WARN] [${this.getTimestamp()}] ${message}\n`);
  }

  error(message) {
    term.red(`\n[ERROR] [${this.getTimestamp()}] ${message}\n`);
  }

  /**
   * Displays ASCII art using a randomly selected font.
   * @param {string} message - The text to be displayed as ASCII art.
   */
  drawAsciiArt(message) {
    const randomFont =
      LEGIBLE_FONTS[Math.floor(Math.random() * LEGIBLE_FONTS.length)];
    const asciiArt = figlet.textSync(message, { font: randomFont });
    term.bold.magenta("\n" + asciiArt + "\n");
  }

  /**
   * Executes a method with a progress bar.
   * @param {Function} method - The method to execute.
   * @param {string} message - The message to display alongside the progress bar.
   * @returns {Promise<any>}
   */
  async runWithLoader(method, message, expectedDuration = 5000) {
    const progressBar = term.progressBar({
      width: 100,
      title: `Started ${message}`,
      eta: true,
      percent: true,
    });

    const startTime = Date.now();
    let isCompleted = false;

    // Start progress update loop
    const updateLoop = setInterval(() => {
      if (isCompleted) return;

      const elapsedTime = Date.now() - startTime;
      // Use a sigmoid function to create a smooth progress curve
      // This will progress slower at the start and end, faster in the middle
      const progress =
        1 / (1 + Math.exp(-4 * (elapsedTime / expectedDuration - 0.5)));
      progressBar.update(Math.min(progress, 0.99));
    }, 100);

    return new Promise(async (resolve, reject) => {
      try {
        // Execute the method
        const result = await method();

        // Mark as completed and clean up
        isCompleted = true;
        clearInterval(updateLoop);

        // Ensure the progress bar completes
        progressBar.update(1);
        const totalTime = (Date.now() - startTime) / 1000;
        term.green(
          `\n✔ ${message} completed in ${totalTime.toFixed(2)} seconds!\n`
        );
        resolve(result);
      } catch (error) {
        isCompleted = true;
        clearInterval(updateLoop);
        progressBar.stop();
        term.red(`\n✖ ${message} failed: ${error.message}\n`);
        reject(error);
      }
    });
  }
  /**
   * Returns the term method to access outside
   */
  terminal() {
    return term;
  }
}
module.exports = Logger;
