import React, { createContext, useContext, useState, useEffect } from 'react';

interface AppState {
  config: any;
  projects: any[];
  currentProject: any;
  workflowStatus: 'idle' | 'running' | 'success' | 'error';
  aiSuggestions: any[];
}

interface AppContextType extends AppState {
  loadConfig: () => Promise<void>;
  saveConfig: (config: any) => Promise<boolean>;
  loadProjects: () => Promise<void>;
  runWorkflow: (projectPath: string) => Promise<void>;
  getAISuggestions: (projectPath: string) => Promise<void>;
  setCurrentProject: (project: any) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>({
    config: null,
    projects: [],
    currentProject: null,
    workflowStatus: 'idle',
    aiSuggestions: []
  });

  const loadConfig = async () => {
    try {
      if (window.electronAPI) {
        const config = await window.electronAPI.getConfig();
        setState(prev => ({ ...prev, config }));
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const saveConfig = async (newConfig: any): Promise<boolean> => {
    try {
      if (window.electronAPI) {
        const success = await window.electronAPI.saveConfig(newConfig);
        if (success) {
          setState(prev => ({ ...prev, config: newConfig }));
        }
        return success;
      }
      return false;
    } catch (error) {
      console.error('Failed to save config:', error);
      return false;
    }
  };

  const loadProjects = async () => {
    try {
      if (window.electronAPI) {
        const projects = await window.electronAPI.listRepos();
        setState(prev => ({ ...prev, projects }));
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const runWorkflow = async (projectPath: string) => {
    setState(prev => ({ ...prev, workflowStatus: 'running' }));
    try {
      if (window.electronAPI) {
        await window.electronAPI.runPipeline(projectPath);
        setState(prev => ({ ...prev, workflowStatus: 'success' }));
      }
    } catch (error) {
      console.error('Workflow failed:', error);
      setState(prev => ({ ...prev, workflowStatus: 'error' }));
    }
  };

  const getAISuggestions = async (projectPath: string) => {
    try {
      if (window.electronAPI) {
        const suggestions = await window.electronAPI.getSuggestions({ projectPath });
        setState(prev => ({ ...prev, aiSuggestions: suggestions }));
      }
    } catch (error) {
      console.error('Failed to get AI suggestions:', error);
    }
  };

  const setCurrentProject = (project: any) => {
    setState(prev => ({ ...prev, currentProject: project }));
  };

  useEffect(() => {
    loadConfig();
    loadProjects();
  }, []);

  return (
    <AppContext.Provider value={{
      ...state,
      loadConfig,
      saveConfig,
      loadProjects,
      runWorkflow,
      getAISuggestions,
      setCurrentProject
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};