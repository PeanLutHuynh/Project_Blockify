/**
 * Configuration Initializer
 * This must be loaded FIRST before any other modules
 */

import { loadConfig } from './env.js';

// Immediately load config when this module is imported
export const configPromise = loadConfig();

// Wait for config to be loaded before continuing
export async function waitForConfig(): Promise<void> {
  await configPromise;
}
