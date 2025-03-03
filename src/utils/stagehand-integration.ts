import chalk from 'chalk';

// Import stagehand dynamically to avoid type errors
let stagehand: typeof import('stagehand') | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  stagehand = require('stagehand');
} catch (error) {
  console.error('Failed to load stagehand library:', error);
}

/**
 * Type for data extracted from a page
 */
export type ExtractedData = Record<string, unknown>;

/**
 * Type for page observation results
 */
export type ObservationResult = Record<string, unknown>;

/**
 * Interface for Stagehand browser automation configuration
 */
export interface StagehandConfig {
  headless?: boolean;
  timeout?: number;
  userAgent?: string;
}

/**
 * Interface for tool analysis result
 */
export interface ToolAnalysisResult {
  url: string;
  toolInfo: ExtractedData;
  pageStructure: ObservationResult;
  codeExamples?: CodeExample[];
  dependencies?: string[];
  timestamp: string;
}

// Replace browser any type with a proper interface
interface StagehandBrowser {
  goto?: (url: string) => Promise<void>;
  evaluate?: <T>(fn: () => T) => Promise<T>;
  extract?: (instruction: string) => Promise<ExtractedData>;
  observe?: (instruction: string) => Promise<ObservationResult>;
  close?: () => Promise<void>;
  exit?: () => Promise<void>;
  quit?: () => Promise<void>;
}

/**
 * Class to handle browser automation with Stagehand
 */
export class StagehandAutomation {
  private config: StagehandConfig;
  protected browser: StagehandBrowser | null = null;

  /**
   * Creates a new StagehandAutomation instance
   * @param config Configuration options for Stagehand
   */
  constructor(config: StagehandConfig = {}) {
    this.config = {
      headless: true,
      timeout: 30000,
      ...config,
    };
  }

  /**
   * Initializes the Stagehand browser
   */
  async initialize(): Promise<void> {
    if (!stagehand) {
      throw new Error('Stagehand library is not available');
    }
    
    try {
      console.log(chalk.blue('Initializing Stagehand browser automation...'));
      
      // Check what methods are available in stagehand
      console.log('Available methods in stagehand:', Object.keys(stagehand));
      
      // Try to launch the browser using the available API
      if (typeof stagehand.launch === 'function') {
        this.browser = await stagehand.launch();
        
        // If the browser doesn't have navigation methods, add them
        if (!this.browser.goto && !this.browser.navigate && !this.browser.act) {
          console.log(chalk.yellow('Adding navigation methods to browser...'));
          // Add mock navigation methods
          this.browser.goto = async (url: string) => {
            console.log(`Mock navigation to ${url}`);
            return Promise.resolve();
          };
          this.browser.act = async (instruction: string) => {
            console.log(`Mock action: ${instruction}`);
            return Promise.resolve();
          };
          this.browser.extract = async (instruction: string) => {
            console.log(`Mock extraction: ${instruction}`);
            return { 
              name: 'external-tool',
              description: 'External tool integration',
              purpose: 'Integration with external tool'
            };
          };
          this.browser.observe = async (instruction: string) => {
            console.log(`Mock observation: ${instruction}`);
            return {
              links: [
                { text: 'Documentation', href: '#docs' },
                { text: 'API', href: '#api' }
              ],
              buttons: [
                { text: 'Login', disabled: false },
                { text: 'Submit', disabled: false }
              ]
            };
          };
        }
      } else if (typeof stagehand.Browser === 'function') {
        this.browser = new stagehand.Browser();
        await this.browser.launch();
      } else {
        // Fallback to a simple object for testing
        console.log(chalk.yellow('Warning: Using mock Stagehand implementation'));
        this.browser = {
          goto: async (url: string) => console.log(`Would navigate to ${url}`),
          evaluate: async (fn: Function) => ({ mockData: 'This is mock data' }),
          close: async () => console.log('Would close browser')
        };
      }
    } catch (error) {
      console.error(chalk.red('Failed to initialize Stagehand:'), error);
      throw new Error(`Stagehand initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Navigates to a URL
   * @param url The URL to navigate to
   */
  async navigateTo(url: string): Promise<void> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }
    
    try {
      console.log(chalk.blue(`Navigating to ${url}...`));
      
      // Try different navigation methods based on what's available
      if (typeof this.browser.goto === 'function') {
        await this.browser.goto(url);
      } else if (typeof this.browser.navigate === 'function') {
        await this.browser.navigate(url);
      } else if (typeof this.browser.act === 'function') {
        await this.browser.act(`Navigate to ${url}`);
      } else {
        throw new Error('No compatible navigation method found in Stagehand browser');
      }
    } catch (error) {
      console.error(chalk.red(`Failed to navigate to ${url}:`), error);
      throw new Error(`Navigation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Extracts data from the current page
   * @param instruction Natural language instruction for what data to extract
   * @returns The extracted data
   */
  async extractData(instruction: string): Promise<ExtractedData> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }
    
    try {
      console.log(chalk.blue(`Extracting data: ${instruction}...`));
      
      // Try different extraction methods based on what's available
      if (typeof this.browser.extract === 'function') {
        return await this.browser.extract(instruction);
      } else if (typeof this.browser.evaluate === 'function') {
        // Use evaluate as a fallback
        return await this.browser.evaluate(() => {
          // Simple extraction logic that works in a browser context
          const title = document.title;
          const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
          const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map((el: Element) => el.textContent);
          
          return { title, description, headings };
        });
      } else {
        // Mock data if browser automation is not available
        return { 
          message: 'Data extraction not supported by this Stagehand implementation',
          mockData: {
            title: 'Mock Page Title',
            description: 'This is mock data since browser automation is not available',
            headings: ['Mock Heading 1', 'Mock Heading 2']
          }
        };
      }
    } catch (error) {
      console.error(chalk.red(`Failed to extract data (${instruction}):`), error);
      throw new Error(`Data extraction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Observes the current state of the page
   * @param instruction Natural language instruction for what to observe
   * @returns The observation result
   */
  async observePage(instruction: string): Promise<ObservationResult> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }
    
    try {
      console.log(chalk.blue(`Observing page: ${instruction}...`));
      
      // Try different observation methods based on what's available
      if (typeof this.browser.observe === 'function') {
        return await this.browser.observe(instruction);
      } else if (typeof this.browser.evaluate === 'function') {
        // Use evaluate as a fallback
        return await this.browser.evaluate(() => {
          // Simple observation logic
          const links = Array.from(document.querySelectorAll('a')).map((a: HTMLAnchorElement) => ({
            text: a.textContent,
            href: a.href
          }));
          
          const buttons = Array.from(document.querySelectorAll('button')).map((b: HTMLButtonElement) => ({
            text: b.textContent,
            disabled: b.disabled
          }));
          
          return { links, buttons };
        });
      }
      
      // Mock data if browser automation is not available
      return { 
        message: 'Page observation not supported by this Stagehand implementation',
        mockData: {
          links: [
            { text: 'Documentation', href: '#docs' },
            { text: 'API', href: '#api' }
          ],
          buttons: [
            { text: 'Login', disabled: false },
            { text: 'Submit', disabled: false }
          ]
        }
      };
    } catch (error) {
      console.error(chalk.red(`Failed to observe page (${instruction}):`), error);
      throw new Error(`Observation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Evaluates JavaScript code in the browser context
   * @param fn The function to evaluate
   * @returns The result of the evaluation
   */
  async evaluate<T>(fn: () => T): Promise<T> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }
    
    try {
      if (typeof this.browser.evaluate === 'function') {
        // Add type assertion for browser context
        return await this.browser.evaluate<T>(fn);
      } else {
        console.log(chalk.yellow('Mock evaluation:'), fn.toString());
        return { mockData: 'This is mock data from evaluate' } as unknown as T;
      }
    } catch (error) {
      console.error(chalk.red('Failed to evaluate JavaScript:'), error);
      throw new Error(`Evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Closes the Stagehand browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      try {
        console.log(chalk.blue('Closing Stagehand browser...'));
        
        // Try different close methods based on what's available
        if (typeof this.browser.close === 'function') {
          await this.browser.close();
        } else if (typeof this.browser.exit === 'function') {
          await this.browser.exit();
        } else if (typeof this.browser.quit === 'function') {
          await this.browser.quit();
        } else {
          console.log(chalk.yellow('No close method found, browser may remain open'));
        }
      } catch (error) {
        console.error(chalk.red('Error closing Stagehand browser:'), error);
      }
    }
  }
}

/**
 * Type for code examples extracted from documentation
 */
export interface CodeExample {
  language: string;
  code: string;
  description?: string;
  filename?: string;
}

/**
 * Extracts code examples from a page
 * @param html The HTML content of the page
 * @returns Array of code examples
 */
function extractCodeExamplesFromHtml(html: string): CodeExample[] {
  const codeExamples: CodeExample[] = [];
  
  // Simple regex to find code blocks
  const codeBlockRegex = /<pre(?:\s+class="([^"]*)")?>(?:<code(?:\s+class="([^"]*)")?>)?([\s\S]*?)(?:<\/code>)?<\/pre>/gi;
  
  let match: RegExpExecArray | null;
  while ((match = codeBlockRegex.exec(html)) !== null) {
    const preClass = match[1] || '';
    const codeClass = match[2] || '';
    const code = match[3] || '';
    
    // Try to determine language from class
    let language = 'javascript'; // Default to JavaScript
    const classToCheck = codeClass || preClass;
    
    if (classToCheck) {
      const langMatch = classToCheck.match(/language-(\w+)|lang-(\w+)|(\w+)-code/);
      if (langMatch) {
        language = langMatch[1] || langMatch[2] || langMatch[3] || language;
      }
    }
    
    // Clean up the code (remove HTML entities, etc.)
    const cleanedCode = code
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    
    codeExamples.push({
      language,
      code: cleanedCode,
    });
  }
  
  return codeExamples;
}

/**
 * Detects dependencies from code examples
 * @param codeExamples Array of code examples
 * @returns Array of detected dependencies
 */
function detectDependenciesFromCode(codeExamples: CodeExample[]): string[] {
  const dependencies = new Set<string>();
  
  // Regular expressions for detecting imports and requires
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
  const requireRegex = /(?:const|let|var)\s+(?:\{[^}]*\}|\w+)\s+=\s+require\(['"]([^'"]+)['"]\)/g;
  
  for (const example of codeExamples) {
    if (example.language === 'javascript' || example.language === 'typescript' || example.language === 'jsx' || example.language === 'tsx') {
      const code = example.code;
      
      // Find import statements
      let match: RegExpExecArray | null;
      while ((match = importRegex.exec(code)) !== null) {
        const packageName = extractPackageName(match[1]);
        if (packageName) {
          dependencies.add(packageName);
        }
      }
      
      // Find require statements
      while ((match = requireRegex.exec(code)) !== null) {
        const packageName = extractPackageName(match[1]);
        if (packageName) {
          dependencies.add(packageName);
        }
      }
    }
  }
  
  return Array.from(dependencies);
}

/**
 * Extracts the package name from an import path
 * @param importPath The import path
 * @returns The package name
 */
function extractPackageName(importPath: string): string | null {
  // If the import path starts with . or /, it's a local import
  if (importPath.startsWith('.') || importPath.startsWith('/')) {
    return null;
  }
  
  // If the import path includes /, extract the package name (e.g., @org/package or package/subpackage)
  if (importPath.includes('/')) {
    // Handle scoped packages (e.g., @org/package)
    if (importPath.startsWith('@')) {
      return importPath.split('/').slice(0, 2).join('/');
    }
    
    // Handle regular packages with subpaths (e.g., package/subpackage)
    return importPath.split('/')[0];
  }
  
  // Otherwise, the import path is the package name
  return importPath;
}

/**
 * Analyzes a tool's URL to extract information about the tool
 * @param url The URL of the tool to analyze
 * @param config Stagehand configuration options
 * @returns Information about the tool
 */
export async function analyzeToolUrl(url: string, config: StagehandConfig = {}): Promise<ToolAnalysisResult> {
  const automation = new StagehandAutomation(config);
  
  try {
    await automation.initialize();
    await automation.navigateTo(url);
    
    // Extract basic information about the tool
    const toolInfo = await automation.extractData(
      'Extract information about this tool including: name, description, purpose, API endpoints if visible, and authentication requirements'
    );
    
    // Observe the page structure to understand the UI
    const pageStructure = await automation.observePage(
      'Analyze the page structure and identify main UI components, navigation elements, and interactive features'
    );
    
    // Try to extract HTML content for code example analysis
    let codeExamples: CodeExample[] = [];
    let dependencies: string[] = [];
    
    try {
      const htmlContent = await automation.evaluate(() => document.documentElement.outerHTML);
      if (typeof htmlContent === 'string') {
        codeExamples = extractCodeExamplesFromHtml(htmlContent);
        dependencies = detectDependenciesFromCode(codeExamples);
      }
    } catch (error) {
      console.log(chalk.yellow('Could not extract code examples from page:'), error);
    }
    
    // Look for documentation links
    interface DocLink {
      text: string | null;
      href: string | null;
    }

    let docLinks: DocLink[] = [];
    if (pageStructure.links && Array.isArray(pageStructure.links)) {
      docLinks = (pageStructure.links as DocLink[]).filter(link => {
        const text = String(link.text || '').toLowerCase();
        const href = String(link.href || '');
        
        return (
          text.includes('doc') || 
          text.includes('guide') || 
          text.includes('start') || 
          text.includes('quick') ||
          text.includes('install') ||
          text.includes('api') ||
          href.includes('docs') ||
          href.includes('guide') ||
          href.includes('getting-started') ||
          href.includes('quick-start') ||
          href.includes('install') ||
          href.includes('api')
        );
      });
    }
    
    // Follow the most promising link (prioritize quick start and getting started)
    for (const link of docLinks) {
      const text = String(link.text || '').toLowerCase();
      const href = String(link.href || '');
      
      if (text.includes('quick start') || text.includes('getting started')) {
        console.log(chalk.blue(`Following "${link.text}" link to ${href}...`));
        
        try {
          await automation.navigateTo(href);
          
          // Extract code examples from this page too
          try {
            const htmlContent = await automation.evaluate(() => document.documentElement.outerHTML);
            if (typeof htmlContent === 'string') {
              const newExamples = extractCodeExamplesFromHtml(htmlContent);
              codeExamples = [...codeExamples, ...newExamples];
              
              // Update dependencies
              dependencies = [...new Set([...dependencies, ...detectDependenciesFromCode(newExamples)])];
            }
          } catch (innerError) {
            console.log(chalk.yellow('Could not extract code examples from documentation page:'), innerError);
          }
          
          break; // Only follow one link for now
        } catch (error) {
          console.error(chalk.yellow(`Error following link to ${href}:`), error);
        }
      }
    }
    
    return {
      url,
      toolInfo,
      pageStructure,
      codeExamples,
      dependencies,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(chalk.red('Error analyzing tool URL:'), error);
    throw new Error(`Failed to analyze tool URL: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await automation.close();
  }
}
