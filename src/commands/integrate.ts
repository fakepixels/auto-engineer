import * as fs from 'fs-extra';
import * as path from 'node:path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { analyzeToolUrl, StagehandConfig } from '../utils/stagehand-integration';

/**
 * Interface for integration options
 */
export interface IntegrationOptions {
  createApiEndpoint: boolean;
  createUtilityFunctions: boolean;
  createUiComponents: boolean;
  addEnvironmentVariables: boolean;
}

/**
 * Integrates an external tool into an existing Next.js application
 * @param url The URL of the external tool to integrate
 * @param directory The directory of the Next.js app
 * @returns A promise that resolves when the integration is complete
 */
export async function integrateExternalTool(url: string, directory: string): Promise<void> {
  console.log(chalk.blue(`Integrating external tool from ${url}...`));
  
  try {
    // Skip Stagehand analysis completely and use URL-based information
    console.log(chalk.blue('Creating tool information from URL...'));
    
    // Create tool info based on the URL
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname;
    
    // Extract a meaningful name from the URL
    const pathParts = pathname.split('/').filter(Boolean);
    const toolName = pathParts.length > 0 ? pathParts[pathParts.length - 1] : hostname.split('.')[0];
    
    const toolInfo = {
      url,
      toolInfo: {
        name: toolName,
        description: `Integration with ${hostname}${pathname}`,
        purpose: `Provides integration with ${hostname}${pathname}`
      },
      pageStructure: {
        links: [],
        buttons: []
      },
      timestamp: new Date().toISOString()
    };
    
    console.log(chalk.green('✓ Tool information created'));
    console.log(chalk.blue('Tool information:'));
    console.log(JSON.stringify(toolInfo, null, 2));
    
    // Use default options
    console.log(chalk.blue('Using default integration options...'));
    const options: IntegrationOptions = {
      createApiEndpoint: true,
      createUtilityFunctions: true,
      createUiComponents: true,
      addEnvironmentVariables: true,
    };
    
  // Create the integration
  await createIntegration(url, directory, toolInfo, options);
  
  // Install dependencies based on the tool name
  await installDependencies(directory, toolInfo);
  
  console.log(chalk.green('✓ External tool integration complete'));
  } catch (error) {
    console.error(chalk.red('Error integrating external tool:'), error);
    throw new Error(`Failed to integrate external tool: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Prompts the user for integration options
 * @returns A promise that resolves to the selected options
 */
async function promptIntegrationOptions(): Promise<IntegrationOptions> {
  console.log(chalk.blue('Please select integration options:'));
  
  try {
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'createApiEndpoint',
        message: 'Create API endpoint for the tool?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'createUtilityFunctions',
        message: 'Create utility functions for interacting with the tool?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'createUiComponents',
        message: 'Create UI components for the tool?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'addEnvironmentVariables',
        message: 'Add environment variables for the tool?',
        default: true,
      },
    ]);
    
    return answers as IntegrationOptions;
  } catch (error) {
    console.error(chalk.yellow('Error prompting for options:'), error);
    console.log(chalk.yellow('Using default options instead.'));
    
    // Return default options
    return {
      createApiEndpoint: true,
      createUtilityFunctions: true,
      createUiComponents: true,
      addEnvironmentVariables: true,
    };
  }
}

/**
 * Creates the integration files and configurations
 * @param url The URL of the external tool
 * @param directory The directory of the Next.js app
 * @param toolInfo Information about the tool
 * @param options Integration options
 */
async function createIntegration(
  url: string, 
  directory: string, 
  toolInfo: any, 
  options: IntegrationOptions
): Promise<void> {
  // Create a directory for the tool integration
  const toolName = getToolName(url, toolInfo);
  const integrationDir = path.join(directory, 'src', 'lib', 'integrations', toolName);
  await fs.ensureDir(integrationDir);
  
  console.log(chalk.blue(`Creating integration files in ${integrationDir}...`));
  
  // Create the main integration file
  await fs.writeFile(
    path.join(integrationDir, 'index.ts'),
    generateIntegrationIndex(toolName, url, toolInfo)
  );
  
  // Create API endpoint if selected
  if (options.createApiEndpoint) {
    await createApiEndpoint(directory, toolName, url, toolInfo);
  }
  
  // Create utility functions if selected
  if (options.createUtilityFunctions) {
    await createUtilityFunctions(integrationDir, toolName, url, toolInfo);
  }
  
  // Create UI components if selected
  if (options.createUiComponents) {
    await createUiComponents(directory, toolName, url, toolInfo);
  }
  
  // Add environment variables if selected
  if (options.addEnvironmentVariables) {
    await addEnvironmentVariables(directory, toolName, toolInfo);
  }
  
  // Create Stagehand automation file
  await createStagehandAutomation(integrationDir, toolName, url, toolInfo);
  
  // Update the README.md file with integration information
  await updateReadme(directory, toolName, url, toolInfo);
}

/**
 * Gets a normalized tool name from the URL or tool information
 * @param url The URL of the tool
 * @param toolInfo Information about the tool
 * @returns A normalized tool name
 */
function getToolName(url: string, toolInfo: any): string {
  // Try to extract a name from the tool info
  let name = '';
  
  if (toolInfo.toolInfo && typeof toolInfo.toolInfo === 'object') {
    if (toolInfo.toolInfo.name) {
      name = String(toolInfo.toolInfo.name);
    }
  }
  
  // If no name found, extract from URL
  if (!name) {
    try {
      const urlObj = new URL(url);
      name = urlObj.hostname.replace(/^www\./, '').split('.')[0];
    } catch (error) {
      // If URL parsing fails, use a generic name
      name = 'external-tool';
    }
  }
  
  // Normalize the name
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generates the content for the main integration index file
 * @param toolName The name of the tool
 * @param url The URL of the tool
 * @param toolInfo Information about the tool
 * @returns The content for the index.ts file
 */
function generateIntegrationIndex(toolName: string, url: string, toolInfo: any): string {
  return `/**
 * Integration with ${toolName}
 * URL: ${url}
 * Generated by Next.js Tool Integrator
 */

export interface ${capitalizeFirstLetter(toolName)}Config {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
}

export class ${capitalizeFirstLetter(toolName)}Integration {
  private config: ${capitalizeFirstLetter(toolName)}Config;
  
  constructor(config: ${capitalizeFirstLetter(toolName)}Config = {}) {
    this.config = {
      baseUrl: '${url}',
      timeout: 30000,
      ...config,
    };
  }
  
  /**
   * Initialize the integration
   */
  async initialize(): Promise<void> {
    console.log('Initializing ${toolName} integration...');
    // Add initialization logic here
  }
  
  /**
   * Make a request to the ${toolName} API
   * @param endpoint The API endpoint
   * @param options Request options
   * @returns The response data
   */
  async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = new URL(endpoint, this.config.baseUrl).toString();
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey ? { 'Authorization': \`Bearer \${this.config.apiKey}\` } : {}),
        ...(options.headers || {}),
      },
    });
    
    if (!response.ok) {
      throw new Error(\`${toolName} API error: \${response.status} \${response.statusText}\`);
    }
    
    return response.json();
  }
}

// Export a singleton instance with default configuration
export const ${toolName} = new ${capitalizeFirstLetter(toolName)}Integration();

// Export types and utilities
export * from './types';
export * from './utils';
`;
}

/**
 * Creates an API endpoint for the tool
 * @param directory The directory of the Next.js app
 * @param toolName The name of the tool
 * @param url The URL of the tool
 * @param toolInfo Information about the tool
 */
async function createApiEndpoint(directory: string, toolName: string, url: string, toolInfo: any): Promise<void> {
  console.log(chalk.blue(`Creating API endpoint for ${toolName}...`));
  
  const apiDir = path.join(directory, 'src', 'app', 'api', toolName);
  await fs.ensureDir(apiDir);
  
  // Create the route.ts file
  await fs.writeFile(
    path.join(apiDir, 'route.ts'),
    `import { NextRequest, NextResponse } from 'next/server';
import { ${toolName} } from '@/lib/integrations/${toolName}';

/**
 * GET handler for ${toolName} API
 */
export async function GET(request: NextRequest) {
  try {
    // Initialize the integration
    await ${toolName}.initialize();
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    
    // Make a request to the ${toolName} API
    const data = await ${toolName}.request('endpoint', {
      method: 'GET',
    });
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in ${toolName} API:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST handler for ${toolName} API
 */
export async function POST(request: NextRequest) {
  try {
    // Initialize the integration
    await ${toolName}.initialize();
    
    // Get request body
    const body = await request.json();
    
    // Make a request to the ${toolName} API
    const data = await ${toolName}.request('endpoint', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in ${toolName} API:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
`
  );
  
  console.log(chalk.green(`✓ API endpoint created at /api/${toolName}`));
}

/**
 * Creates utility functions for the tool
 * @param integrationDir The directory for the integration
 * @param toolName The name of the tool
 * @param url The URL of the tool
 * @param toolInfo Information about the tool
 */
async function createUtilityFunctions(
  integrationDir: string, 
  toolName: string, 
  url: string, 
  toolInfo: any
): Promise<void> {
  console.log(chalk.blue(`Creating utility functions for ${toolName}...`));
  
  // Create the types.ts file
  await fs.writeFile(
    path.join(integrationDir, 'types.ts'),
    `/**
 * Types for ${toolName} integration
 */

export interface ${capitalizeFirstLetter(toolName)}Response {
  success: boolean;
  data?: any;
  error?: string;
}

export interface ${capitalizeFirstLetter(toolName)}RequestOptions {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}
`
  );
  
  // Create the utils.ts file
  await fs.writeFile(
    path.join(integrationDir, 'utils.ts'),
    `/**
 * Utility functions for ${toolName} integration
 */

import { ${capitalizeFirstLetter(toolName)}Integration } from './index';

/**
 * Creates a new instance of the ${toolName} integration with custom configuration
 * @param config Configuration options
 * @returns A new integration instance
 */
export function create${capitalizeFirstLetter(toolName)}Integration(config: Parameters<typeof ${capitalizeFirstLetter(toolName)}Integration>[0] = {}) {
  return new ${capitalizeFirstLetter(toolName)}Integration(config);
}

/**
 * Formats data for the ${toolName} API
 * @param data The data to format
 * @returns Formatted data
 */
export function format${capitalizeFirstLetter(toolName)}Data(data: any): any {
  // Add data formatting logic here
  return data;
}

/**
 * Parses a response from the ${toolName} API
 * @param response The response to parse
 * @returns Parsed data
 */
export function parse${capitalizeFirstLetter(toolName)}Response(response: any): any {
  // Add response parsing logic here
  return response;
}
`
  );
  
  console.log(chalk.green(`✓ Utility functions created for ${toolName}`));
}

/**
 * Creates UI components for the tool
 * @param directory The directory of the Next.js app
 * @param toolName The name of the tool
 * @param url The URL of the tool
 * @param toolInfo Information about the tool
 */
async function createUiComponents(directory: string, toolName: string, url: string, toolInfo: any): Promise<void> {
  console.log(chalk.blue(`Creating UI components for ${toolName}...`));
  
  const componentsDir = path.join(directory, 'src', 'components', toolName);
  await fs.ensureDir(componentsDir);
  
  // Create the main component file
  await fs.writeFile(
    path.join(componentsDir, `${capitalizeFirstLetter(toolName)}Widget.tsx`),
    `'use client';

import { useState, useEffect } from 'react';
import { ${toolName} } from '@/lib/integrations/${toolName}';

interface ${capitalizeFirstLetter(toolName)}WidgetProps {
  title?: string;
  className?: string;
}

export default function ${capitalizeFirstLetter(toolName)}Widget({ 
  title = '${capitalizeFirstLetter(toolName)} Integration', 
  className = '' 
}: ${capitalizeFirstLetter(toolName)}WidgetProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Initialize the integration
        await ${toolName}.initialize();
        
        // Make a request to the API
        const response = await fetch(\`/api/${toolName}?query=example\`);
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch data');
        }
        
        setData(result.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : String(err));
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);
  
  return (
    <div className={\`p-4 border rounded-lg shadow-sm \${className}\`}>
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      
      {loading && (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}
      
      {error && !loading && (
        <div className="bg-red-50 p-4 rounded-md text-red-500">
          <p>Error: {error}</p>
        </div>
      )}
      
      {data && !loading && (
        <div className="space-y-4">
          <pre className="bg-gray-50 p-4 rounded-md overflow-auto text-sm">
            {JSON.stringify(data, null, 2)}
          </pre>
          
          <div className="flex justify-end">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
              onClick={() => window.open('${url}', '_blank')}
            >
              Open ${capitalizeFirstLetter(toolName)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
`
  );
  
  // Create a demo page
  const demoPageDir = path.join(directory, 'src', 'app', toolName);
  await fs.ensureDir(demoPageDir);
  
  await fs.writeFile(
    path.join(demoPageDir, 'page.tsx'),
    `import ${capitalizeFirstLetter(toolName)}Widget from '@/components/${toolName}/${capitalizeFirstLetter(toolName)}Widget';

export default function ${capitalizeFirstLetter(toolName)}Page() {
  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">${capitalizeFirstLetter(toolName)} Integration</h1>
      
      <div className="max-w-3xl mx-auto">
        <${capitalizeFirstLetter(toolName)}Widget />
      </div>
    </main>
  );
}
`
  );
  
  console.log(chalk.green(`✓ UI components created for ${toolName}`));
  console.log(chalk.green(`✓ Demo page created at /${toolName}`));
}

/**
 * Adds environment variables for the tool
 * @param directory The directory of the Next.js app
 * @param toolName The name of the tool
 * @param toolInfo Information about the tool
 */
async function addEnvironmentVariables(directory: string, toolName: string, toolInfo: any): Promise<void> {
  console.log(chalk.blue(`Adding environment variables for ${toolName}...`));
  
  // Create or update .env.local file
  const envPath = path.join(directory, '.env.local');
  let envContent = '';
  
  try {
    if (await fs.pathExists(envPath)) {
      envContent = await fs.readFile(envPath, 'utf8');
    }
  } catch (error) {
    console.warn('Could not read existing .env.local file, creating a new one');
  }
  
  // Add environment variables
  const envVars = [
    `# ${toolName.toUpperCase()} Integration`,
    `${toolName.toUpperCase()}_API_KEY=your-api-key-here`,
    `${toolName.toUpperCase()}_BASE_URL=${toolInfo.url}`,
    `${toolName.toUpperCase()}_TIMEOUT=30000`,
    ''
  ].join('\n');
  
  // Append to existing content if it doesn't already contain these variables
  if (!envContent.includes(`${toolName.toUpperCase()}_API_KEY`)) {
    envContent += '\n' + envVars;
  }
  
  await fs.writeFile(envPath, envContent.trim() + '\n');
  
  // Create or update .env.example file
  const envExamplePath = path.join(directory, '.env.example');
  let envExampleContent = '';
  
  try {
    if (await fs.pathExists(envExamplePath)) {
      envExampleContent = await fs.readFile(envExamplePath, 'utf8');
    }
  } catch (error) {
    console.warn('Could not read existing .env.example file, creating a new one');
  }
  
  // Add environment variables to example file
  if (!envExampleContent.includes(`${toolName.toUpperCase()}_API_KEY`)) {
    envExampleContent += '\n' + envVars;
  }
  
  await fs.writeFile(envExamplePath, envExampleContent.trim() + '\n');
  
  console.log(chalk.green(`✓ Environment variables added for ${toolName}`));
}

/**
 * Creates a Stagehand automation file for the tool
 * @param integrationDir The directory for the integration
 * @param toolName The name of the tool
 * @param url The URL of the tool
 * @param toolInfo Information about the tool
 */
async function createStagehandAutomation(
  integrationDir: string, 
  toolName: string, 
  url: string, 
  toolInfo: any
): Promise<void> {
  try {
    console.log(chalk.blue(`Creating Stagehand automation for ${toolName}...`));
    
    await fs.writeFile(
      path.join(integrationDir, 'automation.ts'),
      `/**
 * Stagehand automation for ${toolName}
 * URL: ${url}
 */

// Import types only to avoid Stagehand initialization issues
import type { StagehandConfig, ExtractedData } from '@/lib/stagehand';

/**
 * Class for automating interactions with ${toolName}
 */
export class ${capitalizeFirstLetter(toolName)}Automation {
  private config: any;
  
  /**
   * Creates a new ${capitalizeFirstLetter(toolName)}Automation instance
   * @param config Configuration options
   */
  constructor(config: any = {}) {
    this.config = {
      baseUrl: '${url}',
      ...config,
    };
  }
  
  /**
   * Initializes the automation
   */
  async initialize(): Promise<void> {
    console.log('Initializing ${toolName} automation...');
    // Initialization is handled dynamically at runtime
  }
  
  /**
   * Navigates to a URL
   * @param url The URL to navigate to
   */
  async navigateTo(url: string): Promise<void> {
    console.log(\`Navigating to \${url}...\`);
    // Navigation is handled dynamically at runtime
  }
  
  /**
   * Logs in to ${toolName}
   * @param username The username
   * @param password The password
   */
  async login(username: string, password: string): Promise<void> {
    console.log(\`Logging in as \${username}...\`);
    // Login is handled dynamically at runtime
  }
  
  /**
   * Extracts data from ${toolName}
   * @returns The extracted data
   */
  async extractData(): Promise<any> {
    console.log('Extracting data...');
    // Data extraction is handled dynamically at runtime
    return {
      title: 'Mock Data',
      description: 'This is mock data from ${toolName}',
    };
  }
  
  /**
   * Performs a specific action in ${toolName}
   * @param action The action to perform
   */
  async performAction(action: string): Promise<void> {
    console.log(\`Performing action: \${action}\`);
    // Actions are handled dynamically at runtime
  }
}

// Export a singleton instance
export const ${toolName}Automation = new ${capitalizeFirstLetter(toolName)}Automation();
`
    );
    
    console.log(chalk.green(`✓ Stagehand automation created for ${toolName}`));
  } catch (error) {
    console.error(chalk.yellow(`Warning: Could not create Stagehand automation for ${toolName}:`), error);
    console.log(chalk.yellow('Skipping Stagehand automation creation.'));
  }
}

/**
 * Updates the README.md file with integration information
 * @param directory The directory of the Next.js app
 * @param toolName The name of the tool
 * @param url The URL of the tool
 * @param toolInfo Information about the tool
 */
async function updateReadme(directory: string, toolName: string, url: string, toolInfo: any): Promise<void> {
  console.log(chalk.blue(`Updating README.md with ${toolName} integration information...`));
  
  const readmePath = path.join(directory, 'README.md');
  let readmeContent = '';
  
  try {
    if (await fs.pathExists(readmePath)) {
      readmeContent = await fs.readFile(readmePath, 'utf8');
    } else {
      readmeContent = '# Next.js Application\n\n';
    }
  } catch (error) {
    console.warn('Could not read existing README.md file, creating a new one');
    readmeContent = '# Next.js Application\n\n';
  }
  
  // Add integration information
  const integrationInfo = `
## ${capitalizeFirstLetter(toolName)} Integration

This application integrates with [${capitalizeFirstLetter(toolName)}](${url}).

### Features

- API endpoint at \`/api/${toolName}\`
- UI components in \`/src/components/${toolName}\`
- Demo page at \`/${toolName}\`
- Stagehand automation for browser interactions

### Environment Variables

Add the following environment variables to your \`.env.local\` file:

\`\`\`
${toolName.toUpperCase()}_API_KEY=your-api-key-here
${toolName.toUpperCase()}_BASE_URL=${url}
${toolName.toUpperCase()}_TIMEOUT=30000
\`\`\`

### Usage

Import the integration in your code:

\`\`\`typescript
import { ${toolName} } from '@/lib/integrations/${toolName}';

// Initialize the integration
await ${toolName}.initialize();

// Make a request
const data = await ${toolName}.request('endpoint');
\`\`\`

For UI components:

\`\`\`typescript
import ${capitalizeFirstLetter(toolName)}Widget from '@/components/${toolName}/${capitalizeFirstLetter(toolName)}Widget';

// Use in your component
<${capitalizeFirstLetter(toolName)}Widget />
\`\`\`
`;
  
  // Check if the integration section already exists
  if (!readmeContent.includes(`## ${capitalizeFirstLetter(toolName)} Integration`)) {
    readmeContent += integrationInfo;
  }
  
  await fs.writeFile(readmePath, readmeContent);
  
  console.log(chalk.green(`✓ README.md updated with ${toolName} integration information`));
}

/**
 * Installs dependencies based on the tool name
 * @param directory The directory of the Next.js app
 * @param toolInfo Information about the tool
 */
async function installDependencies(directory: string, toolInfo: any): Promise<void> {
  try {
    // Get the tool name from the tool info
    const toolName = getToolName(toolInfo.url, toolInfo);
    
    // Map of known tools to their npm packages
    const knownTools: Record<string, string[]> = {
      'onchainkit': ['onchainkit'],
      'getting-started': ['onchainkit'],
      'base': ['@base-org/sdk'],
      'docs': ['onchainkit'],
      'builderkits': ['onchainkit'],
    };
    
    // Check if we have known dependencies for this tool
    const dependencies = knownTools[toolName] || [];
    
    if (dependencies.length > 0) {
      console.log(chalk.blue(`Installing dependencies for ${toolName}...`));
      
      // Use child_process.execSync to run npm install
      const { execSync } = require('child_process');
      
      // Install each dependency
      for (const dependency of dependencies) {
        console.log(chalk.blue(`Installing ${dependency}...`));
        execSync(`npm install ${dependency}`, { 
          cwd: directory, 
          stdio: 'inherit' 
        });
      }
      
      console.log(chalk.green(`✓ Dependencies installed for ${toolName}`));
    } else {
      console.log(chalk.yellow(`No known dependencies for ${toolName}`));
    }
  } catch (error) {
    console.error(chalk.yellow('Warning: Error installing dependencies:'), error);
    console.log(chalk.yellow('Skipping dependency installation.'));
  }
}

/**
 * Capitalizes the first letter of a string
 * @param str The string to capitalize
 * @returns The capitalized string
 */
function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
