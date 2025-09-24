import * as fs from 'fs-extra';
import * as path from 'path';
import { app } from 'electron';
import { ConfigManager } from './ConfigManager';

export interface KnowledgeItem {
  id: string;
  type: 'tutorial' | 'project' | 'error' | 'solution' | 'best-practice';
  title: string;
  content: string;
  tags: string[];
  source: string;
  embeddings?: number[];
  relevanceScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchResult {
  item: KnowledgeItem;
  score: number;
  matches: string[];
}

export class KnowledgeBaseManager {
  private dbPath: string;
  private knowledge: Map<string, KnowledgeItem>;
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.dbPath = path.join(app.getPath('userData'), 'knowledge-base.json');
    this.knowledge = new Map();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      if (await fs.pathExists(this.dbPath)) {
        const data = await fs.readJson(this.dbPath);
        for (const item of data.items) {
          this.knowledge.set(item.id, {
            ...item,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt)
          });
        }
      }
    } catch (error) {
      console.error('Error initializing knowledge base:', error);
    }
  }

  async addItem(item: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = this.generateId();
    const now = new Date();
    
    const knowledgeItem: KnowledgeItem = {
      ...item,
      id,
      createdAt: now,
      updatedAt: now
    };

    this.knowledge.set(id, knowledgeItem);
    await this.persist();
    
    return id;
  }

  async search(query: string, types?: string[], limit: number = 10): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();

    for (const item of this.knowledge.values()) {
      if (types && !types.includes(item.type)) continue;

      let score = 0;
      const matches: string[] = [];

      if (item.title.toLowerCase().includes(queryLower)) {
        score += 3;
        matches.push('title');
      }

      if (item.content.toLowerCase().includes(queryLower)) {
        score += 2;
        matches.push('content');
      }

      if (item.tags.some(tag => tag.toLowerCase().includes(queryLower))) {
        score += 1;
        matches.push('tags');
      }

      if (score > 0) {
        results.push({
          item,
          score: score * item.relevanceScore,
          matches
        });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async learnFromProject(projectPath: string, projectType: string): Promise<void> {
    const packageJsonPath = path.join(projectPath, 'package.json');
    
    if (await fs.pathExists(packageJsonPath)) {
      try {
        const packageJson = await fs.readJson(packageJsonPath);
        
        await this.addItem({
          type: 'project',
          title: `Project Analysis: ${packageJson.name || 'Unknown'}`,
          content: JSON.stringify({
            dependencies: packageJson.dependencies,
            scripts: packageJson.scripts,
            structure: await this.analyzeProjectStructure(projectPath)
          }, null, 2),
          tags: [projectType, 'nodejs', 'analysis'],
          source: projectPath,
          relevanceScore: 0.8
        });
      } catch (error) {
        console.error('Error learning from project:', error);
      }
    }
  }

  async learnFromError(error: Error, context: any): Promise<void> {
    await this.addItem({
      type: 'error',
      title: `Error: ${error.message.substring(0, 100)}`,
      content: JSON.stringify({
        error: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString()
      }, null, 2),
      tags: ['error', 'debugging', 'troubleshooting'],
      source: 'runtime',
      relevanceScore: 0.9
    });
  }

  private async analyzeProjectStructure(projectPath: string): Promise<any> {
    const structure: any = {};
    
    try {
      const items = await fs.readdir(projectPath);
      
      for (const item of items) {
        const itemPath = path.join(projectPath, item);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory()) {
          structure[item] = 'directory';
        } else {
          structure[item] = 'file';
        }
      }
    } catch (error) {
      console.error('Error analyzing project structure:', error);
    }
    
    return structure;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  private async persist(): Promise<void> {
    try {
      const data = {
        items: Array.from(this.knowledge.values()),
        updatedAt: new Date().toISOString()
      };
      
      await fs.ensureDir(path.dirname(this.dbPath));
      await fs.writeJson(this.dbPath, data, { spaces: 2 });
    } catch (error) {
      console.error('Error persisting knowledge base:', error);
    }
  }

  async getStats(): Promise<{ totalItems: number; byType: Record<string, number> }> {
    const byType: Record<string, number> = {};
    
    for (const item of this.knowledge.values()) {
      byType[item.type] = (byType[item.type] || 0) + 1;
    }
    
    return {
      totalItems: this.knowledge.size,
      byType
    };
  }
}