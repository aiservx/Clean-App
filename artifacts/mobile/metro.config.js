const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Exclude expo-updates postinstall temp directories.
// During `pnpm install`, expo-updates creates `expo-updates_tmp_XXXX` dirs
// for native code generation then immediately deletes them.
// Metro's watcher crashes when it can't find these already-deleted paths.
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const tmpPattern = new RegExp(
  escape(path.join(__dirname, "../../node_modules/.pnpm")) +
    ".*expo-updates_tmp_\\d+"
);
config.resolver.blockList = [tmpPattern];

module.exports = config;
