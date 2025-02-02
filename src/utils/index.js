/**
 * @remarks
 * This project is open source under the MIT license.
 * Contributions, improvements, and usage are welcome.
 *
 * For professional inquiries or hiring me, please visit [my LinkedIn](https://www.linkedin.com/in/jerrythejsguy/).
 */

const { Command } = require("commander");

/**
 * A method to clean objects of udnefined and null properties
 * @param {Object} config
 * @returns {Object} Cleaned config object
 */
const getNoiseLessConfig = (config) =>
  Object.fromEntries(
    Object.entries(config).filter(
      ([, value]) => value !== undefined && value !== null
    )
  );
/**
 *
 * @param {Command} sourceCommand The source command to copy the options from
 * @param {Command} targetCommand The target command to copy the options to
 * @returns {Command} The target command to add actions and other options
 */
const copyCommandOptions = (sourceCommand, targetCommand) => {
  sourceCommand.options.forEach((option) => {
    targetCommand.option(option.flags, option.description, option.defaultValue);
  });
  return targetCommand;
};
module.exports = { getNoiseLessConfig, copyCommandOptions };
