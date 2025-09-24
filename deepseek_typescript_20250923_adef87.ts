import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Configuration
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config: any) => ipcRenderer.invoke('save-config', config),
  
  // GitHub
  listRepos: () => ipcRenderer.invoke('github-list-repos'),
  cloneRepo: (repoUrl: string, localPath: string) => 
    ipcRenderer.invoke('github-clone-repo', repoUrl, localPath),
  
  // Workflow
  runPipeline: (projectPath: string) => 
    ipcRenderer.invoke('workflow-run-pipeline', projectPath),
  
  // AI
  analyzeProject: (projectPath: string) => 
    ipcRenderer.invoke('ai-analyze-project', projectPath),
  getSuggestions: (context: any) => 
    ipcRenderer.invoke('ai-get-suggestions', context),
  
  // System
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  
  // Events
  onWorkflowLog: (callback: (event: any, message: string) => void) => 
    ipcRenderer.on('workflow-log', callback),
  onWorkflowComplete: (callback: (event: any, results: any) => void) => 
    ipcRenderer.on('workflow-complete', callback)
});

// Type declarations for the exposed API
declare global {
  interface Window {
    electronAPI: {
      getConfig: () => Promise<any>;
      saveConfig: (config: any) => Promise<boolean>;
      listRepos: () => Promise<any>;
      cloneRepo: (repoUrl: string, localPath: string) => Promise<any>;
      runPipeline: (projectPath: string) => Promise<any>;
      analyzeProject: (projectPath: string) => Promise<any>;
      getSuggestions: (context: any) => Promise<any>;
      selectDirectory: () => Promise<string | null>;
      onWorkflowLog: (callback: (event: any, message: string) => void) => void;
      onWorkflowComplete: (callback: (event: any, results: any) => void) => void;
    };
  }
}