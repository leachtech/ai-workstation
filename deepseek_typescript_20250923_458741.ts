import * as fs from 'fs-extra';
import * as path from 'path';
import { ConfigManager } from './ConfigManager';

export interface Template {
  id: string;
  name: string;
  description: string;
  type: 'component' | 'feature' | 'integration' | 'boilerplate';
  category: 'ui' | 'auth' | 'api' | 'database' | 'deployment';
  files: TemplateFile[];
  variables: TemplateVariable[];
  dependencies: string[];
  installScripts?: string[];
  tags: string[];
}

export interface TemplateFile {
  source: string;
  target: string;
  type: 'file' | 'directory';
  variables: string[];
}

export interface TemplateVariable {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  required: boolean;
  defaultValue?: any;
  options?: string[];
}

export interface InjectionResult {
  success: boolean;
  injectedFiles: string[];
  installedDependencies: string[];
  errors: string[];
}

export class TemplateManager {
  private templates: Map<string, Template>;
  private templatesPath: string;
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.templatesPath = path.join(__dirname, '../../templates');
    this.templates = new Map();
    this.loadTemplates();
  }

  private async loadTemplates(): Promise<void> {
    try {
      const templatesConfigPath = path.join(this.templatesPath, 'templates.json');
      
      if (await fs.pathExists(templatesConfigPath)) {
        const config = await fs.readJson(templatesConfigPath);
        
        for (const template of config.templates) {
          this.templates.set(template.id, template);
        }
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  }

  async injectTemplate(
    templateId: string, 
    targetPath: string, 
    variables: Record<string, any>
  ): Promise<InjectionResult> {
    const result: InjectionResult = {
      success: false,
      injectedFiles: [],
      installedDependencies: [],
      errors: []
    };

    try {
      const template = this.templates.get(templateId);
      
      if (!template) {
        result.errors.push(`Template not found: ${templateId}`);
        return result;
      }

      const validationResult = this.validateVariables(template, variables);
      if (!validationResult.valid) {
        result.errors.push(...validationResult.errors);
        return result;
      }

      for (const file of template.files) {
        const fileResult = await this.injectFile(templateId, file, targetPath, variables);
        
        if (fileResult.success) {
          result.injectedFiles.push(fileResult.path);
        } else {
          result.errors.push(`Failed to inject file: ${file.source}`);
        }
      }

      if (template.dependencies.length > 0) {
        const depResult = await this.installDependencies(targetPath, template.dependencies);
        result.installedDependencies = depResult.installed;
        result.errors.push(...depResult.errors);
      }

      if (template.installScripts) {
        for (const script of template.installScripts) {
          await this.runInstallScript(targetPath, script, variables);
        }
      }

      result.success = result.errors.length === 0;
      
    } catch (error) {
      result.errors.push(`Unexpected error: ${error}`);
    }

    return result;
  }

  private async injectFile(
    templateId: string,
    file: TemplateFile,
    targetPath: string,
    variables: Record<string, any>
  ): Promise<{ success: boolean; path?: string }> {
    try {
      const sourcePath = path.join(this.templatesPath, templateId, file.source);
      const finalTargetPath = this.resolvePath(path.join(targetPath, file.target), variables);

      if (file.type === 'directory') {
        await fs.ensureDir(finalTargetPath);
        return { success: true, path: finalTargetPath };
      }

      if (await fs.pathExists(sourcePath)) {
        let content = await fs.readFile(sourcePath, 'utf8');
        content = this.replaceVariables(content, variables);
        
        await fs.ensureDir(path.dirname(finalTargetPath));
        await fs.writeFile(finalTargetPath, content);
        
        return { success: true, path: finalTargetPath };
      }

      return { success: false };
    } catch (error) {
      console.error('Error injecting file:', error);
      return { success: false };
    }
  }

  private async installDependencies(
    targetPath: string, 
    dependencies: string[]
  ): Promise<{ installed: string[]; errors: string[] }> {
    const result = { installed: [] as string[], errors: [] as string[] };
    
    try {
      const packageJsonPath = path.join(targetPath, 'package.json');
      
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);
        
        if (!packageJson.dependencies) {
          packageJson.dependencies = {};
        }
        
        for (const dep of dependencies) {
          if (!packageJson.dependencies[dep]) {
            packageJson.dependencies[dep] = 'latest';
            result.installed.push(dep);
          }
        }
        
        await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
      }
    } catch (error) {
      result.errors.push(`Failed to install dependencies: ${error}`);
    }
    
    return result;
  }

  private async runInstallScript(
    targetPath: string, 
    script: string, 
    variables: Record<string, any>
  ): Promise<void> {
    try {
      const resolvedScript = this.replaceVariables(script, variables);
      console.log(`Would run script: ${resolvedScript} in ${targetPath}`);
    } catch (error) {
      console.error('Error running install script:', error);
    }
  }

  private validateVariables(
    template: Template, 
    variables: Record<string, any>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const variable of template.variables) {
      if (variable.required && !variables[variable.name]) {
        errors.push(`Required variable missing: ${variable.name}`);
      }
      
      if (variables[variable.name] && variable.type === 'select' && variable.options) {
        if (!variable.options.includes(variables[variable.name])) {
          errors.push(`Invalid value for ${variable.name}. Must be one of: ${variable.options.join(', ')}`);
        }
      }
    }
    
    return { valid: errors.length === 0, errors };
  }

  private replaceVariables(content: string, variables: Record<string, any>): string {
    let result = content;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }
    
    return result;
  }

  private resolvePath(pathStr: string, variables: Record<string, any>): string {
    let result = pathStr;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }
    
    return result;
  }

  getTemplates(): Template[] {
    return Array.from(this.templates.values());
  }

  getTemplatesByCategory(category: string): Template[] {
    return this.getTemplates().filter(t => t.category === category);
  }

  async createTemplate(template: Template): Promise<void> {
    this.templates.set(template.id, template);
    await this.saveTemplates();
  }

  private async saveTemplates(): Promise<void> {
    const config = {
      templates: this.getTemplates(),
      updatedAt: new Date().toISOString()
    };
    
    await fs.ensureDir(this.templatesPath);
    await fs.writeJson(path.join(this.templatesPath, 'templates.json'), config, { spaces: 2 });
  }
}