import { Octokit } from '@octokit/rest';
import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs-extra';
import * as path from 'path';
import { ConfigManager, AppConfig } from './ConfigManager';

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string;
  language: string;
  updated_at: string;
  clone_url: string;
}

export class GitHubService {
  private octokit: Octokit | null = null;
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  private async getAuthenticatedClient(): Promise<Octokit> {
    if (!this.octokit) {
      const config = await this.configManager.getConfig();
      
      if (!config.github.token) {
        throw new Error('GitHub token not configured');
      }

      this.octokit = new Octokit({
        auth: config.github.token,
        userAgent: 'AI-Development-Workstation/v1.0.0'
      });
    }
    return this.octokit;
  }

  async listRepositories(): Promise<Repository[]> {
    try {
      const client = await this.getAuthenticatedClient();
      const response = await client.repos.listForAuthenticatedUser({
        sort: 'updated',
        direction: 'desc',
        per_page: 100
      });

      return response.data.map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        html_url: repo.html_url,
        description: repo.description || '',
        language: repo.language || '',
        updated_at: repo.updated_at || '',
        clone_url: repo.clone_url
      }));
    } catch (error) {
      console.error('Error fetching repositories:', error);
      throw new Error('Failed to fetch repositories. Check your GitHub token.');
    }
  }

  async cloneRepository(repoUrl: string, localPath: string): Promise<{ success: boolean; message: string }> {
    try {
      await fs.ensureDir(localPath);
      
      const git: SimpleGit = simpleGit();
      await git.clone(repoUrl, localPath);
      
      return { success: true, message: 'Repository cloned successfully' };
    } catch (error) {
      console.error('Error cloning repository:', error);
      return { success: false, message: `Failed to clone repository: ${error}` };
    }
  }

  async commitAndPush(projectPath: string, commitMessage: string): Promise<{ success: boolean; message: string }> {
    try {
      const git: SimpleGit = simpleGit(projectPath);
      
      const isRepo = await git.checkIsRepo();
      if (!isRepo) {
        return { success: false, message: 'Not a git repository' };
      }

      await git.add('.');
      await git.commit(commitMessage);
      await git.push();

      return { success: true, message: 'Changes committed and pushed successfully' };
    } catch (error) {
      console.error('Error committing changes:', error);
      return { success: false, message: `Failed to commit and push: ${error}` };
    }
  }
}