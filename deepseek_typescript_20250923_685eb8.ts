import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs-extra';
import { ConfigManager } from './ConfigManager';
import { DeploymentManager } from './DeploymentManager';
import { SecurityScanner } from './SecurityScanner';
import { TemplateManager } from './TemplateManager';

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

export interface WorkflowConfig {
  steps: {
    install: boolean;
    lint: boolean;
    test: boolean;
    security: boolean;
    build: boolean;
    deploy: boolean;
  };
  deployment: {
    target: 'netlify' | 'vercel' | 'github-pages' | 'none';
    autoDeploy: boolean;
    siteName?: string;
  };
  features: {
    injectTemplates: string[];
    runScripts: string[];
  };
}

export interface WorkflowResult {
  success: boolean;
  steps: PipelineResult[];
  deployment?: any;
  duration: number;
  timestamp: Date;
}

export class WorkflowOrchestrator {
  private configManager: ConfigManager;
  private deploymentManager: DeploymentManager;
  private securityScanner: SecurityScanner;
  private templateManager: TemplateManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.deploymentManager = new DeploymentManager(configManager);
    this.securityScanner = new SecurityScanner();
    this.templateManager = new TemplateManager(configManager);
  }

  async runFullPipeline(projectPath: string): Promise<PipelineResult[]> {
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

    const results: PipelineResult[] = [];
    
    for (const step of steps) {
      const result = await this.executeStep(step.name, step.command, step.args, step.workingDirectory);
      results.push(result);
      
      if (!result.success && step.name !== 'Security Audit') {
        break;
      }
    }

    return results;
  }

  async runCompleteWorkflow(projectPath: string, workflowConfig: WorkflowConfig): Promise<WorkflowResult> {
    const startTime = Date.now();
    const results: WorkflowResult = {
      success: false,
      steps: [],
      duration: 0,
      timestamp: new Date()
    };

    try {
      const prerequisites = await this.checkPrerequisites();
      if (!prerequisites.nodejs || !prerequisites.npm) {
        throw new Error('Node.js and npm are required');
      }

      if (workflowConfig.steps.install) {
        const installResult = await this.executeStep('Dependency Installation', 'npm', ['install'], projectPath);
        results.steps.push(installResult);
        if (!installResult.success) throw new Error('Dependency installation failed');
      }

      if (workflowConfig.features.injectTemplates.length > 0) {
        for (const templateId of workflowConfig.features.injectTemplates) {
          const injectionResult = await this.injectTemplate(projectPath, templateId);
          results.steps.push(injectionResult);
        }
      }

      if (workflowConfig.steps.lint) {
        const lintResult = await this.executeStep('Linting', 'npm', ['run', 'lint'], projectPath);
        results.steps.push(lintResult);
      }

      if (workflowConfig.steps.test) {
        const testResult = await this.executeStep('Testing', 'npm', ['test'], projectPath);
        results.steps.push(testResult);
        if (!testResult.success) throw new Error('Tests failed');
      }

      if (workflowConfig.steps.security) {
        const securityResult = await this.runSecurityScan(projectPath);
        results.steps.push(securityResult);
      }

      if (workflowConfig.steps.build) {
        const buildResult = await this.executeStep('Build', 'npm', ['run', 'build'], projectPath);
        results.steps.push(buildResult);
        if (!buildResult.success) throw new Error('Build failed');
      }

      if (workflowConfig.steps.deploy && workflowConfig.deployment.autoDeploy) {
        const deployResult = await this.deployProject(projectPath, workflowConfig.deployment);
        results.deployment = deployResult;
        
        if (!deployResult.success) {
          throw new Error('Deployment failed');
        }
      }

      results.success = true;

    } catch (error) {
      results.steps.push({
        step: 'Workflow Execution',
        success: false,
        output: '',
        error: error.message,
        duration: Date.now() - startTime
      });
    }

    results.duration = Date.now() - startTime;
    return results;
  }

  private async executeStep(
    name: string, 
    command: string, 
    args: string[], 
    cwd: string
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    
    const result = await this.executeCommand(command, args, cwd);
    
    return {
      step: name,
      success: result.success,
      output: result.output,
      error: result.error,
      duration: Date.now() - startTime
    };
  }

  private async injectTemplate(projectPath: string, templateId: string): Promise<PipelineResult> {
    const startTime = Date.now();
    
    try {
      const result = await this.templateManager.injectTemplate(templateId, projectPath, {});
      
      return {
        step: `Template Injection: ${templateId}`,
        success: result.success,
        output: `Injected files: ${result.injectedFiles.join(', ')}`,
        error: result.errors.join(', '),
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        step: `Template Injection: ${templateId}`,
        success: false,
        output: '',
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  private async runSecurityScan(projectPath: string): Promise<PipelineResult> {
    const startTime = Date.now();
    
    try {
      const scanResult = await this.securityScanner.scanProject(projectPath);
      
      return {
        step: 'Security Scan',
        success: scanResult.passed,
        output: `Vulnerabilities found: ${scanResult.summary.total} (Critical: ${scanResult.summary.critical}, High: ${scanResult.summary.high})`,
        error: scanResult.passed ? '' : 'Security vulnerabilities detected',
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        step: 'Security Scan',
        success: false,
        output: '',
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  private async deployProject(projectPath: string, deploymentConfig: any): Promise<any> {
    switch (deploymentConfig.target) {
      case 'netlify':
        return this.deploymentManager.deployToNetlify(projectPath, deploymentConfig.siteName);
      case 'vercel':
        return this.deploymentManager.deployToVercel(projectPath, deploymentConfig.siteName);
      case 'github-pages':
        return this.deploymentManager.deployToGitHubPages(projectPath, '');
      default:
        throw new Error(`Unsupported deployment target: ${deploymentConfig.target}`);
    }
  }

  private async executeCommand(
    command: string, 
    args: string[], 
    cwd: string
  ): Promise<{ success: boolean; output: string; error?: string }> {
    return new Promise((resolve) => {
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

  async generateWorkflowReport(workflowResult: WorkflowResult): Promise<string> {
    let report = `# Workflow Execution Report\n\n`;
    report += `## Summary\n`;
    report += `- Status: ${workflowResult.success ? '✅ SUCCESS' : '❌ FAILED'}\n`;
    report += `- Duration: ${(workflowResult.duration / 1000).toFixed(2)} seconds\n`;
    report += `- Steps Completed: ${workflowResult.steps.filter(s => s.success).length}/${workflowResult.steps.length}\n\n`;

    report += `## Steps\n\n`;
    for (const step of workflowResult.steps) {
      report += `### ${step.step}\n`;
      report += `- Status: ${step.success ? '✅' : '❌'}\n`;
      report += `- Duration: ${step.duration}ms\n`;
      if (step.output) report += `- Output: ${step.output}\n`;
      if (step.error) report += `- Error: ${step.error}\n`;
      report += `\n`;
    }

    if (workflowResult.deployment) {
      report += `## Deployment\n\n`;
      report += `- Status: ${workflowResult.deployment.success ? '✅ SUCCESS' : '❌ FAILED'}\n`;
      if (workflowResult.deployment.url) report += `- URL: ${workflowResult.deployment.url}\n`;
      report += `- Log: ${workflowResult.deployment.log}\n`;
    }

    return report;
  }
}