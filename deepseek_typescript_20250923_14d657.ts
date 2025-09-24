import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import { ConfigManager } from '../core/ConfigManager';
import { GitHubService } from '../core/GitHubService';
import { WorkflowOrchestrator } from '../core/WorkflowOrchestrator';
import { AIService } from '../core/AIService';

class MainApp {
  private mainWindow: BrowserWindow | null = null;
  private configManager: ConfigManager;
  private gitHubService: GitHubService;
  private workflowOrchestrator: WorkflowOrchestrator;
  private aiService: AIService;

  constructor() {
    this.configManager = new ConfigManager();
    this.gitHubService = new GitHubService(this.configManager);
    this.workflowOrchestrator = new WorkflowOrchestrator(this.configManager);
    this.aiService = new AIService(this.configManager);
    
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

    // Development: Open DevTools
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

    // Workflow operations
    ipcMain.handle('workflow-run-pipeline', async (event, projectPath) => {
      return this.workflowOrchestrator.runFullPipeline(projectPath);
    });

    // AI operations
    ipcMain.handle('ai-analyze-project', async (event, projectPath) => {
      return this.aiService.analyzeProject(projectPath);
    });

    ipcMain.handle('ai-get-suggestions', async (event, context) => {
      return this.aiService.getEnhancementSuggestions(context);
    });

    // File system operations
    ipcMain.handle('select-directory', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        properties: ['openDirectory']
      });
      return result.filePaths[0] || null;
    });
  }
}

new MainApp();