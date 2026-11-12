// Expo finds the other packages in this pnpm workspace (like @talaan/shared)
const { getDefaultConfig } = require("expo/metro-config");

module.exports = getDefaultConfig(__dirname);
