// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure fonts are properly included in web builds
config.resolver.assetExts.push('ttf', 'otf', 'woff', 'woff2');

module.exports = config;

