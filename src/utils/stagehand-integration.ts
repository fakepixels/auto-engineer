import chalk from 'chalk';

// Import stagehand dynamically to avoid type errors
// This is a workaround since we don't have the exact type definitions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let stagehand: {
  launch?: () => Promise<unknown>;
  createBrowser?: () => Promise<unknown>;
} = {};

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
 * Interface for Stagehand browser instance
 */
export interface StagehandBrowser {
  act: (instruction: string) => Promise<void>;
  extract: (instruction: string) => Promise<ExtractedData>;
  observe: (instruction: string) => Promise<ObservationResult>;
  close: () => Promise<void>;
}

/**
 * Interface for Stagehand browser automation configuration
 */
export interface StagehandConfig {
  headless?: boolean;
  timeout?: number;
  userAgent?: string;
}

/**
 * Class to handle browser automation with Stagehand
 */
export class StagehandAutomation {
  private config: StagehandConfig;
  private browser: StagehandBrowser | null = null;

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
      
      // Since we don't know the exact API, we'll try different approaches
      if (stagehand.launch) {
        try {
          // First attempt: standard launch with options
          this.browser = await stagehand.launch() as StagehandBrowser;
        } catch (launchError) {
          console.warn('First launch attempt failed:', launchError);
          
          if (stagehand.createBrowser) {
            // Second attempt: if the first one fails
            this.browser = await stagehand.createBrowser() as StagehandBrowser;
          } else {
            throw new Error('No compatible browser creation method found in Stagehand');
          }
        }
      } else if (stagehand.createBrowser) {
        this.browser = await stagehand.createBrowser() as StagehandBrowser;
      } else {
        throw new Error('No compatible browser creation method found in Stagehand');
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
      await this.browser.act(`Navigate to ${url}`);
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
      return await this.browser.extract(instruction);
    } catch (error) {
      console.error(chalk.red(`Failed to extract data (${instruction}):`), error);
      throw new Error(`Data extraction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Performs an action on the page
   * @param instruction Natural language instruction for the action to perform
   */
  async performAction(instruction: string): Promise<void> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }
    
    try {
      console.log(chalk.blue(`Performing action: ${instruction}...`));
      await this.browser.act(instruction);
    } catch (error) {
      console.error(chalk.red(`Failed to perform action (${instruction}):`), error);
      throw new Error(`Action failed: ${error instanceof Error ? error.message : String(error)}`);
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
      return await this.browser.observe(instruction);
    } catch (error) {
      console.error(chalk.red(`Failed to observe page (${instruction}):`), error);
      throw new Error(`Observation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Closes the Stagehand browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      try {
        console.log(chalk.blue('Closing Stagehand browser...'));
        await this.browser.close();
      } catch (error) {
        console.error(chalk.red('Error closing Stagehand browser:'), error);
      }
    }
  }
}

/**
 * Interface for tool analysis result
 */
export interface ToolAnalysisResult {
  url: string;
  toolInfo: ExtractedData;
  pageStructure: ObservationResult;
  timestamp: string;
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
    
    return {
      url,
      toolInfo,
      pageStructure,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(chalk.red('Error analyzing tool URL:'), error);
    throw new Error(`Failed to analyze tool URL: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await automation.close();
  }
}
