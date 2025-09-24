import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import { ConfigManager } from './ConfigManager';

export interface DeploymentTarget {
  id: string;
  name: string;
  type: 'netlify' | 'vercel' | 'github-pages' | 'custom';
  config: any;
}

export interface DeploymentResult {
  success: boolean;
  url?: string;
  log: string;
  deploymentId?: string;
  timestamp: Date;
}

export interface DeploymentHistory {
  id: string;
  projectId: string;
  target: string;
  result: DeploymentResult;
  timestamp: Date;
}

export class DeploymentManager {
  private configManager: ConfigManager;
  private deploymentHistory: DeploymentHistory[];
  private historyPath: string;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.historyPath = path.join(__dirname, '../../data/deployment-history.json');
    this.deploymentHistory = [];
    this.loadHistory();
  }

  async deployToNetlify(projectPath: string, siteName?: string): Promise<DeploymentResult> {
    const log: string[] = [];
    log.push(`Starting Netlify deployment for: ${projectPath}`);

    try {
      const cliCheck = await this.executeCommand('netlify', ['--version'], projectPath);
      
      if (!cliCheck.success) {
        log.push('Netlify CLI not found. Attempting to install...');
        const installResult = await this.installNetlifyCLI();
        
        if (!installResult.success) {
          return {
            success: false,
            log: log.join('\n') + '\nFailed to install Netlify CLI: ' + installResult.error
          };
        }
      }

      const initCheck = await this.executeCommand('netlify', ['init', '--force'], projectPath, {
        stdio: 'pipe',
        input: '\n\n\n'
      });

      if (!initCheck.success) {
        log.push('Netlify init failed: ' + initCheck.error);
      }

      const deployArgs = ['deploy', '--prod', '--json'];
      if (siteName) {
        deployArgs.push('--site', siteName);
      }

      const deployResult = await this.executeCommand('netlify', deployArgs, projectPath);
      log.push(deployResult.output);

      let url: string | undefined;
      let deploymentId: string | undefined;

      if (deployResult.success) {
        try {
          const deployData = JSON.parse(deployResult.output);
          url = deployData.deploy_url;
          deploymentId = deployData.deploy_id;
        } catch (e) {
          const urlMatch = deployResult.output.match(/https?:\/\/[^\s]+/);
          if (urlMatch) url = urlMatch[0];
        }
      }

      const result: DeploymentResult = {
        success: deployResult.success,
        url,
        deploymentId,
        log: log.join('\n'),
        timestamp: new Date()
      };

      await this.saveDeploymentHistory('unknown-project', 'netlify', result);
      return result;

    } catch (error) {
      const errorResult: DeploymentResult = {
        success: false,
        log: log.join('\n') + '\nDeployment error: ' + error,
        timestamp: new Date()
      };
      
      await this.saveDeploymentHistory('unknown-project', 'netlify', errorResult);
      return errorResult;
    }
  }

  async deployToVercel(projectPath: string, projectName?: string): Promise<DeploymentResult> {
    const log: string[] = [];
    log.push(`Starting Vercel deployment for: ${projectPath}`);

    try {
      const cliCheck = await this.executeCommand('vercel', ['--version'], projectPath);
      
      if (!cliCheck.success) {
        log.push('Vercel CLI not found. Attempting to install...');
        const installResult = await this.installVercelCLI();
        
        if (!installResult.success) {
          return {
            success: false,
            log: log.join('\n') + '\nFailed to install Vercel CLI: ' + installResult.error
          };
        }
      }

      const deployArgs = ['--prod', '--confirm'];
      if (projectName) {
        deployArgs.push('--name', projectName);
      }

      const deployResult = await this.executeCommand('vercel', deployArgs, projectPath);
      log.push(deployResult.output);

      let url: string | undefined;
      const urlMatch = deployResult.output.match(/https?:\/\/[^\s]+/);

      if (urlMatch) {
        url = urlMatch[0];
      }

      const result: DeploymentResult = {
        success: deployResult.success,
        url,
        log: log.join('\n'),
        timestamp: new Date()
      };

      await this.saveDeploymentHistory('unknown-project', 'vercel', result);
      return result;

    } catch (error) {
      const errorResult: DeploymentResult = {
        success: false,
        log: log.join('\n') + '\nDeployment error: ' + error,
        timestamp: new Date()
      };
      
      await this.saveDeploymentHistory('unknown-project', 'vercel', errorResult);
      return errorResult;
    }
  }

  async deployToGitHubPages(projectPath: string, repoUrl: string): Promise<DeploymentResult> {
    const log: string[] = [];
    log.push(`Starting GitHub Pages deployment for: ${projectPath}`);

    try {
      const buildResult = await this.executeCommand('npm', ['run', 'build'], projectPath);
      
      if (!buildResult.success) {
        return {
          success: false,
          log: log.join('\n') + '\nBuild failed: ' + buildResult.error
        };
      }

      log.push('Build completed successfully');
      
      const result: DeploymentResult = {
        success: true,
        url: `https://${repoUrl.split('/')[3]}.github.io/${repoUrl.split('/')[4]}`,
        log: log.join('\n'),
        timestamp: new Date()
      };

      await this.saveDeploymentHistory('unknown-project', 'github-pages', result);
      return result;

    } catch (error) {
      const errorResult: DeploymentResult = {
        success: false,
        log: log.join('\n') + '\nDeployment error: ' + error,
        timestamp: new Date()
      };
      
      await this.saveDeploymentHistory('unknown-project', 'github-pages', errorResult);
      return errorResult;
    }
  }

  private async installNetlifyCLI(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.executeCommand('npm', ['install', '-g', 'netlify-cli'], process.cwd());
      return { success: result.success, error: result.error };
    } catch (error) {
      return { success: false, error: error as string };
    }
  }

  private async installVercelCLI(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.executeCommand('npm', ['install', '-g', 'vercel'], process.cwd());
      return { success: result.success, error: result.error };
    } catch (error) {
      return { success: false, error: error as string };
    }
  }

  private async executeCommand(
    command: string, 
    args: string[], 
    cwd: string,
    options: any = {}
  ): Promise<{ success: boolean; output: string; error?: string }> {
    return new Promise((resolve) => {
      const process: ChildProcess = spawn(command, args, { 
        cwd, 
        shell: true,
        ...options
      });

      let output = '';
      let error = '';

      process.stdout?.on('data', (data) => {
        output += data.toString();
      });

      process.stderr?.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        resolve({
          success: code === 0,
          output: output.trim(),
          error: error.trim()
        });
      });

      process.on('error', (err) => {
        resolve({
          success: false,
          output: '',
          error: err.message
        });
      });
    });
  }

  private async loadHistory(): Promise<void> {
    try {
      if (await fs.pathExists(this.historyPath)) {
        const data = await fs.readJson(this.historyPath);
        this.deploymentHistory = data.history.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
          result: {
            ...item.result,
            timestamp: new Date(item.result.timestamp)
          }
        }));
      }
    } catch (error) {
      console.error('Error loading deployment history:', error);
    }
  }

  private async saveDeploymentHistory(
    projectId: string, 
    target: string, 
    result: DeploymentResult
  ): Promise<void> {
    const historyItem: DeploymentHistory = {
      id: Math.random().toString(36).substr(2, 9),
      projectId,
      target,
      result,
      timestamp: new Date()
    };

    this.deploymentHistory.unshift(historyItem);
    
    if (this.deploymentHistory.length > 100) {
      this.deploymentHistory = this.deploymentHistory.slice(0, 100);
    }

    try {
      await fs.ensureDir(path.dirname(this.historyPath));
      await fs.writeJson(this.historyPath, { history: this.deploymentHistory }, { spaces: 2 });
    } catch (error) {
      console.error('Error saving deployment history:', error);
    }
  }

  getDeploymentHistory(projectId?: string): DeploymentHistory[] {
    if (projectId) {
      return this.deploymentHistory.filter(item => item.projectId === projectId);
    }
    return this.deploymentHistory;
  }

  async getDeploymentStatus(deploymentId: string): Promise<any> {
    return { status: 'completed', url: 'https://example.com' };
  }
}