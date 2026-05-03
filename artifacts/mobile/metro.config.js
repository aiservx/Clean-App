const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Exclude pnpm postinstall temp directories.
// During `pnpm install`, some packages (expo-updates, ajv, etc.) create
// `<pkg>_tmp_XXXX` dirs for postinstall work then immediately delete them.
// Metro's watcher crashes when it can't find these already-deleted paths.
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pnpmStore = escape(path.join(__dirname, "../../node_modules/.pnpm"));
const tmpPattern = new RegExp(pnpmStore + ".*_tmp_\\d+");

config.resolver.blockList = [tmpPattern];

module.exports = config;
