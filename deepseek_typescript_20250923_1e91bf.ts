import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs-extra';
import { ConfigManager } from '../core/ConfigManager';
import { GitHubService } from '../core/GitHubService';
import { WorkflowOrchestrator } from '../core/WorkflowOrchestrator';
import { AIService } from '../core/AIService';
import { KnowledgeBaseManager } from '../core/KnowledgeBaseManager';
import { TemplateManager } from '../core/TemplateManager';
import { SecurityScanner } from '../core/SecurityScanner';
import { DeploymentManager } from '../core/DeploymentManager';

class MainApp {
  private mainWindow: BrowserWindow | null = null;
  private configManager: ConfigManager;
  private gitHubService: GitHubService;
  private workflowOrchestrator: WorkflowOrchestrator;
  private aiService: AIService;
  private knowledgeBase: KnowledgeBaseManager;
  private templateManager: TemplateManager;
  private securityScanner: SecurityScanner;
  private deploymentManager: DeploymentManager;

  constructor() {
    this.configManager = new ConfigManager();
    this.gitHubService = new GitHubService(this.configManager);
    this.workflowOrchestrator = new WorkflowOrchestrator(this.configManager);
    this.aiService = new AIService(this.configManager);
    this.knowledgeBase = new KnowledgeBaseManager(this.configManager);
    this.templateManager = new TemplateManager(this.configManager);
    this.securityScanner = new SecurityScanner();
    this.deploymentManager = new DeploymentManager(this.configManager);
    
    this.setupIPC();
    this.initApp();
  }

  private initApp(): void {
    app.whenReady().then(() => {
      this.createMainWindow();
      
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createMainWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
  }

  private createMainWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/preload.js')
      },
      titleBarStyle: 'default',
      show: false
    });

    this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.webContents.openDevTools();
    }
  }

  private setupIPC(): void {
    // Configuration management
    ipcMain.handle('get-config', async () => {
      return this.configManager.getConfig();
    });

    ipcMain.handle('save-config', async (event, config) => {
      return this.configManager.saveConfig(config);
    });

    // GitHub operations
    ipcMain.handle('github-list-repos', async () => {
      return this.gitHubService.listRepositories();
    });

    ipcMain.handle('github-clone-repo', async (event, repoUrl, localPath) => {
      return this.gitHubService.cloneRepository(repoUrl, localPath);
    });

    ipcMain.handle('github-commit-push', async (event, projectPath, commitMessage) => {
      return this.gitHubService.commitAndPush(projectPath, commitMessage);
    });

    // Workflow operations
    ipcMain.handle('workflow-run-pipeline', async (event, projectPath) => {
      return this.workflowOrchestrator.runFullPipeline(projectPath);
    });

    ipcMain.handle('workflow-run-complete', async (event, projectPath, workflowConfig) => {
      return this.workflowOrchestrator.runCompleteWorkflow(projectPath, workflowConfig);
    });

    // AI operations
    ipcMain.handle('ai-analyze-project', async (event, projectPath) => {
      return this.aiService.analyzeProject(projectPath);
    });

    ipcMain.handle('ai-get-suggestions', async (event, context) => {
      return this.aiService.getEnhancementSuggestions(context);
    });

    // Knowledge Base operations
    ipcMain.handle('knowledge-base-search', async (event, query, types, limit) => {
      return this.knowledgeBase.search(query, types, limit);
    });

    ipcMain.handle('knowledge-base-add', async (event, item) => {
      return this.knowledgeBase.addItem(item);
    });

    ipcMain.handle('knowledge-base-learn-project', async (event, projectPath, projectType) => {
      return this.knowledgeBase.learnFromProject(projectPath, projectType);
    });

    ipcMain.handle('knowledge-base-stats', async () => {
      return this.knowledgeBase.getStats();
    });

    // Template operations
    ipcMain.handle('template-list', async () => {
      return this.templateManager.getTemplates();
    });

    ipcMain.handle('template-inject', async (event, templateId, targetPath, variables) => {
      return this.templateManager.injectTemplate(templateId, targetPath, variables);
    });

    // Security operations
    ipcMain.handle('security-scan', async (event, projectPath) => {
      return this.securityScanner.scanProject(projectPath);
    });

    // Deployment operations
    ipcMain.handle('deploy-project', async (event, projectPath, target, config) => {
      switch (target) {
        case 'netlify':
          return this.deploymentManager.deployToNetlify(projectPath, config.siteName);
        case 'vercel':
          return this.deploymentManager.deployToVercel(projectPath, config.siteName);
        case 'github-pages':
          return this.deploymentManager.deployToGitHubPages(projectPath, config.repoUrl);
        default:
          throw new Error(`Unsupported deployment target: ${target}`);
      }
    });

    ipcMain.handle('get-deployment-history', async (event, projectId) => {
      return this.deploymentManager.getDeploymentHistory(projectId);
    });

    // File system operations
    ipcMain.handle('select-directory', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        properties: ['openDirectory']
      });
      return result.filePaths[0] || null;
    });

    ipcMain.handle('read-file', async (event, filePath) => {
      try {
        return await fs.readFile(filePath, 'utf8');
      } catch (error) {
        throw new Error(`Failed to read file: ${error}`);
      }
    });

    ipcMain.handle('write-file', async (event, filePath, content) => {
      try {
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, content);
        return true;
      } catch (error) {
        throw new Error(`Failed to write file: ${error}`);
      }
    });

    ipcMain.handle('open-external', async (event, url) => {
      await shell.openExternal(url);
    });

    // System information
    ipcMain.handle('get-system-info', async () => {
      return {
        platform: process.platform,
        arch: process.arch,
        versions: process.versions,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      };
    });
  }
}

new MainApp();