// Shared type definitions across main and renderer processes

export interface Project {
  id: string;
  name: string;
  path: string;
  type: 'react' | 'vue' | 'angular' | 'node' | 'other';
  repository?: string;
  lastUpdated: Date;
  status: 'idle' | 'building' | 'deploying' | 'error';
}

export interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  duration?: number;
  output?: string;
}

export interface AISuggestion {
  id: string;
  type: 'security' | 'performance' | 'feature' | 'refactor';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  confidence: number;
  codeSnippet?: string;
  applied: boolean;
}