/**
 * Stagehand browser automation utilities
 * 
 * This file re-exports the StagehandAutomation class and related types from the utils/stagehand-integration module.
 * It serves as a convenient entry point for applications to import Stagehand functionality.
 */

import { 
  StagehandAutomation, 
  StagehandBrowser, 
  StagehandConfig, 
  ExtractedData, 
  ObservationResult,
  analyzeToolUrl,
  ToolAnalysisResult
} from '../utils/stagehand-integration';

// Re-export everything
export {
  StagehandAutomation,
  StagehandBrowser,
  StagehandConfig,
  ExtractedData,
  ObservationResult,
  analyzeToolUrl,
  ToolAnalysisResult
};

// Export a default instance
export default StagehandAutomation;
