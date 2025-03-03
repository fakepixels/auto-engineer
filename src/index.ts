#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import chalk from 'chalk';
import { bootstrapNextApp } from './commands/bootstrap';
import { integrateExternalTool } from './commands/integrate';
import { isNextJsApp } from './utils/nextjs-detector';

// Create a new command instance
const program = new Command();

// Set up CLI metadata
program
  .name('nextjs-integrator')
  .description('CLI tool to bootstrap or integrate Next.js applications with external tools')
  .version('1.0.0');

// Define the main command
program
  .argument('<url>', 'URL to the external tool to integrate')
  .option('-f, --force', 'Force integration even if Next.js app is not detected', false)
  .action(async (url: string, options: { force: boolean }) => {
    console.log(chalk.blue('Next.js Tool Integrator'));
    console.log(chalk.gray('----------------------------'));
    
    try {
      // Check if a Next.js app exists in the current directory
      const isNextJs = await isNextJsApp(process.cwd());
      
      if (isNextJs) {
        console.log(chalk.green('✓ Next.js application detected'));
        console.log(chalk.yellow('Integrating external tool from URL:', url));
        
        // Integrate the external tool into the existing Next.js app
        await integrateExternalTool(url, process.cwd());
        
        console.log(chalk.green('✓ Integration complete!'));
      } else {
        if (options.force) {
          console.log(chalk.yellow('No Next.js application detected, but --force flag is set'));
          console.log(chalk.yellow('Proceeding with integration anyway...'));
          
          // Integrate the external tool into the current directory
          await integrateExternalTool(url, process.cwd());
          
          console.log(chalk.green('✓ Integration complete!'));
        } else {
          console.log(chalk.yellow('No Next.js application detected'));
          console.log(chalk.blue('Bootstrapping a new Next.js application...'));
          
          // Bootstrap a new Next.js app and integrate the external tool
          await bootstrapNextApp(process.cwd());
          await integrateExternalTool(url, process.cwd());
          
          console.log(chalk.green('✓ Next.js application created and external tool integrated!'));
        }
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Parse command-line arguments
program.parse(process.argv);
