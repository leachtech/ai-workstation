import * as fs from 'fs-extra';
import * as path from 'path';
import { app } from 'electron';

export interface AppConfig {
  github: {
    token: string;
    username: string;
  };
  ai: {
    openaiKey: string;
    deepseekKey: string;
    claudeKey: string;
    preferredProvider: 'openai' | 'deepseek' | 'claude';
  };
  paths: {
    projectsDirectory: string;
    templatesDirectory: string;
    knowledgeBaseDirectory: string;
  };
  features: {
    autoDeploy: boolean;
    securityScans: boolean;
    aiSuggestions: boolean;
  };
}

export class ConfigManager {
  private configPath: string;
  private defaultConfig: AppConfig;

  constructor() {
    this.configPath = path.join(app.getPath('userData'), 'config.json');
    this.defaultConfig = this.getDefaultConfig();
  }

  private getDefaultConfig(): AppConfig {
    return {
      github: {
        token: '',
        username: ''
      },
      ai: {
        openaiKey: '',
        deepseekKey: '',
        claudeKey: '',
        preferredProvider: 'openai'
      },
      paths: {
        projectsDirectory: path.join(app.getPath('documents'), 'AI-Projects'),
        templatesDirectory: path.join(app.getPath('userData'), 'templates'),
        knowledgeBaseDirectory: path.join(app.getPath('userData'), 'knowledge-base')
      },
      features: {
        autoDeploy: true,
        securityScans: true,
        aiSuggestions: true
      }
    };
  }

  async getConfig(): Promise<AppConfig> {
    try {
      if (await fs.pathExists(this.configPath)) {
        const config = await fs.readJson(this.configPath);
        return { ...this.defaultConfig, ...config };
      }
      return this.defaultConfig;
    } catch (error) {
      console.error('Error reading config:', error);
      return this.defaultConfig;
    }
  }

  async saveConfig(config: Partial<AppConfig>): Promise<boolean> {
    try {
      const currentConfig = await this.getConfig();
      const mergedConfig = { ...currentConfig, ...config };
      
      await fs.ensureDir(path.dirname(this.configPath));
      await fs.writeJson(this.configPath, mergedConfig, { spaces: 2 });
      
      return true;
    } catch (error) {
      console.error('Error saving config:', error);
      return false;
    }
  }

  async validateConfig(): Promise<string[]> {
    const config = await this.getConfig();
    const errors: string[] = [];

    if (!config.github.token) {
      errors.push('GitHub token is required');
    }

    if (config.ai.preferredProvider === 'openai' && !config.ai.openaiKey) {
      errors.push('OpenAI API key is required for selected provider');
    }

    if (config.ai.preferredProvider === 'deepseek' && !config.ai.deepseekKey) {
      errors.push('DeepSeek API key is required for selected provider');
    }

    return errors;
  }
}