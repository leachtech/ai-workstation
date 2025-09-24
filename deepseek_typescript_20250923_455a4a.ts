import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs-extra';
import { ConfigManager } from './ConfigManager';

export interface PipelineStep {
  name: string;
  command: string;
  args: string[];
  workingDirectory: string;
}

export interface PipelineResult {
  step: string;
  success: boolean;
  output: string;
  error?: string;
  duration: number;
}

export class WorkflowOrchestrator {
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  private async executeCommand(command: string, args: string[], cwd: string): Promise<{ success: boolean; output: string; error?: string }> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const process: ChildProcess = spawn(command, args, { 
        cwd, 
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
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
        const duration = Date.now() - startTime;
        resolve({
          success: code === 0,
          output: output.trim(),
          error: error.trim(),
          duration
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

  async runFullPipeline(projectPath: string): Promise<PipelineResult[]> {
    const results: PipelineResult[] = [];
    const steps: PipelineStep[] = [
      {
        name: 'Dependency Installation',
        command: 'npm',
        args: ['install'],
        workingDirectory: projectPath
      },
      {
        name: 'Linting',
        command: 'npm',
        args: ['run', 'lint'],
        workingDirectory: projectPath
      },
      {
        name: 'Testing',
        command: 'npm',
        args: ['test'],
        workingDirectory: projectPath
      },
      {
        name: 'Security Audit',
        command: 'npm',
        args: ['audit'],
        workingDirectory: projectPath
      },
      {
        name: 'Build',
        command: 'npm',
        args: ['run', 'build'],
        workingDirectory: projectPath
      }
    ];

    for (const step of steps) {
      console.log(`Executing step: ${step.name}`);
      
      const result = await this.executeCommand(step.command, step.args, step.workingDirectory);
      
      results.push({
        step: step.name,
        success: result.success,
        output: result.output,
        error: result.error,
        duration: result.duration || 0
      });

      // If a step fails, we might want to stop the pipeline
      if (!result.success && step.name !== 'Security Audit') { // Audit can fail without stopping
        break;
      }
    }

    return results;
  }

  async checkPrerequisites(): Promise<{ nodejs: boolean; npm: boolean; git: boolean }> {
    const results = await Promise.all([
      this.executeCommand('node', ['--version'], process.cwd()),
      this.executeCommand('npm', ['--version'], process.cwd()),
      this.executeCommand('git', ['--version'], process.cwd())
    ]);

    return {
      nodejs: results[0].success,
      npm: results[1].success,
      git: results[2].success
    };
  }

  async startLocalServer(projectPath: string, port: number = 3000): Promise<{ success: boolean; url: string; process: ChildProcess }> {
    return new Promise((resolve) => {
      const process = spawn('npm', ['run', 'dev'], {
        cwd: projectPath,
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Simple timeout-based resolution (in real app, you'd parse output)
      setTimeout(() => {
        resolve({
          success: true,
          url: `http://localhost:${port}`,
          process
        });
      }, 3000);
    });
  }
}