"use strict";
const winston = require('winston');
const { createLogger, format, transports } = winston;
const DailyRotateFile = require('winston-daily-rotate-file');

class Logger {
  constructor(logDir = 'logs', enableFileLogs = false) {
    const { combine, timestamp, printf, colorize } = format;

    const logFormat = printf(({ level, message, timestamp }) => {
      return `[${timestamp}] ${level}: ${message}`;
    });

    const transportOptions = [
      new transports.Console()
    ];

    if (enableFileLogs) {
      transportOptions.push(
        new DailyRotateFile({
          filename: `${logDir}/application-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxFiles: '14d',
          zippedArchive: true
        })
      );
    }

    this.logger = createLogger({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      ),
      transports: transportOptions
    });
  }

  // Info level log
  info(message) {
    this.logger.info(message);
  }

  // Warn level log
  warn(message) {
    this.logger.warn(message);
  }

  // Error level log
  error(message) {
    this.logger.error(message);
  }

  // Debug level log
  debug(message) {
    this.logger.debug(message);
  }

  // Log method to log messages with custom level
  log(level, message) {
    this.logger.log({ level, message });
  }

  // Verbose level log
  verbose(message) {
    this.logger.verbose(message);
  }

  // Silly level log
  silly(message) {
    this.logger.silly(message);
  }
}



module.exports = Logger;
