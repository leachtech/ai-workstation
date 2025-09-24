import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Configuration
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config: any) => ipcRenderer.invoke('save-config', config),
  
  // GitHub
  listRepos: () => ipcRenderer.invoke('github-list-repos'),
  cloneRepo: (repoUrl: string, localPath: string) => 
    ipcRenderer.invoke('github-clone-repo', repoUrl, localPath),
  commitPush: (projectPath: string, commitMessage: string) =>
    ipcRenderer.invoke('github-commit-push', projectPath, commitMessage),
  
  // Workflow
  runPipeline: (projectPath: string) => 
    ipcRenderer.invoke('workflow-run-pipeline', projectPath),
  runCompleteWorkflow: (projectPath: string, workflowConfig: any) =>
    ipcRenderer.invoke('workflow-run-complete', projectPath, workflowConfig),
  
  // AI
  analyzeProject: (projectPath: string) => 
    ipcRenderer.invoke('ai-analyze-project', projectPath),
  getSuggestions: (context: any) => 
    ipcRenderer.invoke('ai-get-suggestions', context),
  
  // Knowledge Base
  knowledgeSearch: (query: string, types?: string[], limit?: number) =>
    ipcRenderer.invoke('knowledge-base-search', query, types, limit),
  knowledgeAdd: (item: any) => ipcRenderer.invoke('knowledge-base-add', item),
  knowledgeLearnProject: (projectPath: string, projectType: string) =>
    ipcRenderer.invoke('knowledge-base-learn-project', projectPath, projectType),
  knowledgeStats: () => ipcRenderer.invoke('knowledge-base-stats'),
  
  // Templates
  templateList: () => ipcRenderer.invoke('template-list'),
  templateInject: (templateId: string, targetPath: string, variables: any) =>
    ipcRenderer.invoke('template-inject', templateId, targetPath, variables),
  
  // Security
  securityScan: (projectPath: string) => ipcRenderer.invoke('security-scan', projectPath),
  
  // Deployment
  deployProject: (projectPath: string, target: string, config: any) =>
    ipcRenderer.invoke('deploy-project', projectPath, target, config),
  getDeploymentHistory: (projectId?: string) =>
    ipcRenderer.invoke('get-deployment-history', projectId),
  
  // System
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath: string, content: string) => 
    ipcRenderer.invoke('write-file', filePath, content),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  
  // Events
  onWorkflowLog: (callback: (event: any, message: string) => void) => 
    ipcRenderer.on('workflow-log', callback),
  onWorkflowComplete: (callback: (event: any, results: any) => void) => 
    ipcRenderer.on('workflow-complete', callback)
});

declare global {
  interface Window {
    electronAPI: {
      getConfig: () => Promise<any>;
      saveConfig: (config: any) => Promise<boolean>;
      listRepos: () => Promise<any>;
      cloneRepo: (repoUrl: string, localPath: string) => Promise<any>;
      commitPush: (projectPath: string, commitMessage: string) => Promise<any>;
      runPipeline: (projectPath: string) => Promise<any>;
      runCompleteWorkflow: (projectPath: string, workflowConfig: any) => Promise<any>;
      analyzeProject: (projectPath: string) => Promise<any>;
      getSuggestions: (context: any) => Promise<any>;
      knowledgeSearch: (query: string, types?: string[], limit?: number) => Promise<any>;
      knowledgeAdd: (item: any) => Promise<any>;
      knowledgeLearnProject: (projectPath: string, projectType: string) => Promise<any>;
      knowledgeStats: () => Promise<any>;
      templateList: () => Promise<any>;
      templateInject: (templateId: string, targetPath: string, variables: any) => Promise<any>;
      securityScan: (projectPath: string) => Promise<any>;
      deployProject: (projectPath: string, target: string, config: any) => Promise<any>;
      getDeploymentHistory: (projectId?: string) => Promise<any>;
      selectDirectory: () => Promise<string | null>;
      readFile: (filePath: string) => Promise<string>;
      writeFile: (filePath: string, content: string) => Promise<boolean>;
      openExternal: (url: string) => Promise<void>;
      getSystemInfo: () => Promise<any>;
      onWorkflowLog: (callback: (event: any, message: string) => void) => void;
      onWorkflowComplete: (callback: (event: any, results: any) => void) => void;
    };
  }
}