/**
 * @remarks
 * This project is open source under the MIT license.
 * Contributions, improvements, and usage are welcome.
 *
 * For professional inquiries or hiring me, please visit [my LinkedIn](https://www.linkedin.com/in/jerrythejsguy/).
 */
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
module.exports = { getNoiseLessConfig };
