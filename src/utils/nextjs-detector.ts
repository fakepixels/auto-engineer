import * as fs from 'fs-extra';
import * as path from 'node:path';

/**
 * Checks if the given directory contains a Next.js application
 * @param directory The directory to check
 * @returns A promise that resolves to true if a Next.js app is detected, false otherwise
 */
export async function isNextJsApp(directory: string): Promise<boolean> {
  try {
    // Check for package.json
    const packageJsonPath = path.join(directory, 'package.json');
    if (!await fs.pathExists(packageJsonPath)) {
      return false;
    }

    // Read package.json and check for Next.js dependency
    const packageJson = await fs.readJson(packageJsonPath);
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (!dependencies.next) {
      return false;
    }

    // Check for next.config.js or next.config.mjs
    const nextConfigPath = path.join(directory, 'next.config.js');
    const nextConfigMjsPath = path.join(directory, 'next.config.mjs');
    
    if (!(await fs.pathExists(nextConfigPath)) && !(await fs.pathExists(nextConfigMjsPath))) {
      // If no config file, check for pages or app directory
      const pagesDir = path.join(directory, 'pages');
      const appDir = path.join(directory, 'app');
      
      if (!(await fs.pathExists(pagesDir)) && !(await fs.pathExists(appDir))) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error checking for Next.js app:', error);
    return false;
  }
}
