import * as fs from 'fs-extra';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import chalk from 'chalk';

/**
 * Bootstraps a new Next.js application
 * @param directory The directory to create the Next.js app in
 * @returns A promise that resolves when the app is created
 */
export async function bootstrapNextApp(directory: string): Promise<void> {
  console.log(chalk.blue('Bootstrapping a new Next.js application...'));
  
  try {
    // Check if the directory is empty
    const files = await fs.readdir(directory);
    const nonHiddenFiles = files.filter(file => !file.startsWith('.') && file !== 'node_modules');
    
    if (nonHiddenFiles.length > 0) {
      console.log(chalk.yellow('Directory is not empty. Creating a new directory for the Next.js app...'));
      const appName = 'nextjs-app';
      const appDir = path.join(directory, appName);
      
      // Create the app directory
      await fs.ensureDir(appDir);
      
      // Create the Next.js app
      console.log(chalk.blue(`Creating Next.js app in ${appDir}...`));
      createNextApp(appDir);
      
      console.log(chalk.green(`✓ Next.js application created in ${appName} directory`));
      return;
    }
    
    // Create the Next.js app in the current directory
    console.log(chalk.blue(`Creating Next.js app in ${directory}...`));
    createNextApp(directory);
    
    console.log(chalk.green('✓ Next.js application created'));
  } catch (error) {
    console.error(chalk.red('Error bootstrapping Next.js app:'), error);
    throw new Error(`Failed to bootstrap Next.js app: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Creates a new Next.js app using create-next-app
 * @param directory The directory to create the app in
 */
function createNextApp(directory: string): void {
  try {
    // Use create-next-app to bootstrap a new Next.js app
    console.log(chalk.blue('Running create-next-app...'));
    
    // Use npx to run create-next-app with the latest version
    execSync(
      'npx create-next-app@latest . --ts --eslint --app --src-dir --import-alias "@/*" --tailwind --use-npm', 
      { 
        cwd: directory, 
        stdio: 'inherit' 
      }
    );
    
    // Add additional dependencies for full-stack development
    console.log(chalk.blue('Adding additional dependencies for full-stack development...'));
    execSync(
      'npm install axios prisma @prisma/client next-auth', 
      { 
        cwd: directory, 
        stdio: 'inherit' 
      }
    );
    
    // Initialize Prisma
    console.log(chalk.blue('Initializing Prisma...'));
    execSync(
      'npx prisma init', 
      { 
        cwd: directory, 
        stdio: 'inherit' 
      }
    );
    
    // Create API directory structure
    console.log(chalk.blue('Setting up API directory structure...'));
    const apiDir = path.join(directory, 'src', 'app', 'api');
    fs.ensureDirSync(apiDir);
    
    // Create a basic API route
    const exampleApiDir = path.join(apiDir, 'example', 'route.ts');
    fs.ensureDirSync(path.dirname(exampleApiDir));
    fs.writeFileSync(
      exampleApiDir,
      `
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Hello from the API!' });
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ 
    message: 'Data received!', 
    data: body 
  });
}
`
    );
    
    console.log(chalk.green('✓ Full-stack Next.js application created successfully'));
  } catch (error) {
    console.error(chalk.red('Error creating Next.js app:'), error);
    throw new Error(`Failed to create Next.js app: ${error instanceof Error ? error.message : String(error)}`);
  }
}
