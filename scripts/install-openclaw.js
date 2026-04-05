#!/usr/bin/env node
const { install } = require('../packages/lifecoach-installer/install-openclaw');

try {
  install();
} catch (error) {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
}
