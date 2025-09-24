import axios from 'axios';
import { ConfigManager } from './ConfigManager';

export interface AISuggestion {
  type: 'security' | 'optimization' | 'feature' | 'integration';
  title: string;
  description: string;
  codeSnippet?: string;
  priority: 'low' | 'medium' | 'high';
  confidence: number;
}

export interface ProjectAnalysis {
  overview: string;
  issues: string[];
  suggestions: AISuggestion[];
  estimatedComplexity: 'simple' | 'medium' | 'complex';
}

export class AIService {
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  private async callAIAPI(prompt: string, context: string): Promise<string> {
    const config = await this.configManager.getConfig();
    
    // Determine which provider to use
    const provider = config.ai.preferredProvider;
    const apiKey = config.ai[`${provider}Key`];

    if (!apiKey) {
      throw new Error(`API key not configured for ${provider}`);
    }

    const requestData = {
      model: this.getModelForProvider(provider),
      messages: [
        {
          role: 'system',
          content: 'You are an expert AI development assistant. Provide helpful, actionable suggestions for web development projects.'
        },
        {
          role: 'user',
          content: `Context: ${context}\n\nRequest: ${prompt}`
        }
      ],
      max_tokens: 2000,
      temperature: 0.7
    };

    try {
      const response = await axios.post(this.getEndpointForProvider(provider), requestData, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('AI API call failed:', error);
      throw new Error(`AI service error: ${error}`);
    }
  }

  private getModelForProvider(provider: string): string {
    const models = {
      openai: 'gpt-4',
      deepseek: 'deepseek-chat',
      claude: 'claude-2'
    };
    return models[provider as keyof typeof models] || 'gpt-4';
  }

  private getEndpointForProvider(provider: string): string {
    const endpoints = {
      openai: 'https://api.openai.com/v1/chat/completions',
      deepseek: 'https://api.deepseek.com/v1/chat/completions',
      claude: 'https://api.anthropic.com/v1/messages'
    };
    return endpoints[provider as keyof typeof endpoints] || endpoints.openai;
  }

  async analyzeProject(projectPath: string): Promise<ProjectAnalysis> {
    // In a real implementation, you would analyze the project structure
    const projectContext = await this.scanProjectStructure(projectPath);
    
    const prompt = `Analyze this web development project and provide:
    1. A brief overview of what the project does
    2. Potential issues or improvements
    3. Specific suggestions for enhancements`;

    const analysis = await this.callAIAPI(prompt, projectContext);
    
    return this.parseAnalysisResponse(analysis);
  }

  async getEnhancementSuggestions(context: any): Promise<AISuggestion[]> {
    const prompt = `Based on the following project context, provide specific enhancement suggestions in JSON format. Focus on:
    - Security improvements
    - Performance optimizations  
    - Feature additions
    - Integration opportunities
    
    Return only valid JSON.`;

    const response = await this.callAIAPI(prompt, JSON.stringify(context));
    
    try {
      return JSON.parse(response);
    } catch {
      // Fallback if AI doesn't return valid JSON
      return this.getDefaultSuggestions();
    }
  }

  private async scanProjectStructure(projectPath: string): Promise<string> {
    // Simplified project scanning
    // In real implementation, you would read package.json, analyze code structure, etc.
    return `Project located at: ${projectPath}. Web development project detected.`;
  }

  private parseAnalysisResponse(response: string): ProjectAnalysis {
    // Parse AI response into structured data
    return {
      overview: response.substring(0, 200) + '...',
      issues: ['Sample issue 1', 'Sample issue 2'],
      suggestions: this.getDefaultSuggestions(),
      estimatedComplexity: 'medium'
    };
  }

  private getDefaultSuggestions(): AISuggestion[] {
    return [
      {
        type: 'security',
        title: 'Add input validation',
        description: 'Implement proper input validation to prevent XSS attacks',
        priority: 'high',
        confidence: 0.9
      },
      {
        type: 'optimization',
        title: 'Implement lazy loading',
        description: 'Add lazy loading for images to improve performance',
        priority: 'medium',
        confidence: 0.8
      }
    ];
  }
}