import path from 'node:path';

/** @type {import('next').NextConfig} */
export default {
  ...(process.env.NEST_API_BUILD_DIR ? { distDir: process.env.NEST_API_BUILD_DIR } : {}),
  outputFileTracingRoot: path.resolve('.'),
};
