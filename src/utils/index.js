const getNoiseLessConfig = (config) =>
  Object.fromEntries(
    Object.entries(config).filter(
      ([, value]) => value !== undefined && value !== null
    )
  );
module.exports = { getNoiseLessConfig };
