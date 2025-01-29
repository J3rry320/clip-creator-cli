const path = require("path");
const nodeExternals = require("webpack-node-externals");
const TerserPlugin = require("terser-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const webpack = require("webpack");

module.exports = {
  mode: "production",
  target: "node",
  entry: "./bin/cli.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "cli.js",
    libraryTarget: "commonjs2",
    publicPath: "/assets/",
  },
  externals: [nodeExternals()], // Prevent bundling node_modules
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
    ],
  },
  resolve: {
    extensions: [".js"],
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
  plugins: [
    // Copy font and other assets to dist/
    new CopyPlugin({
      patterns: [
        { from: "src/assets", to: "assets" },
        { from: "src/web/index.html", to: "" },
      ],
    }),
    new webpack.BannerPlugin({ banner: "#!/usr/bin/env node", raw: true }),
  ],
  stats: "minimal",
};
