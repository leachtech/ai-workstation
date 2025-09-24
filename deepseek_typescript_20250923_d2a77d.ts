import { spawn } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface SecurityVulnerability {
  severity: 'low' | 'medium' | 'high' | 'critical';
  package: string;
  version: string;
  advisory: string;
  path: string;
  recommendation: string;
}

export interface SecurityScanResult {
  vulnerabilities: SecurityVulnerability[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  passed: boolean;
}

export class SecurityScanner {
  async scanProject(projectPath: string): Promise<SecurityScanResult> {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    const auditResult = await this.runNpmAudit(projectPath);
    vulnerabilities.push(...auditResult);
    
    const commonIssues = await this.checkCommonSecurityIssues(projectPath);
    vulnerabilities.push(...commonIssues);
    
    const summary = this.calculateSummary(vulnerabilities);
    
    return {
      vulnerabilities,
      summary,
      passed: summary.critical === 0 && summary.high === 0
    };
  }

  private async runNpmAudit(projectPath: string): Promise<SecurityVulnerability[]> {
    return new Promise((resolve) => {
      const vulnerabilities: SecurityVulnerability[] = [];
      const process = spawn('npm', ['audit', '--json'], { 
        cwd: projectPath,
        shell: true 
      });

      let output = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        console.error('npm audit error:', data.toString());
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const auditData = JSON.parse(output);
            vulnerabilities.push(...this.parseAuditData(auditData));
          } catch (error) {
            console.error('Error parsing npm audit output:', error);
          }
        }
        resolve(vulnerabilities);
      });
    });
  }

  private parseAuditData(auditData: any): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];
    
    if (auditData.vulnerabilities) {
      for (const [packageName, vulnerability] of Object.entries(auditData.vulnerabilities as any)) {
        vulnerabilities.push({
          severity: vulnerability.severity,
          package: packageName,
          version: vulnerability.version,
          advisory: vulnerability.title || 'No advisory available',
          path: vulnerability.via?.join(', ') || 'Unknown',
          recommendation: vulnerability.fixAvailable ? 
            `Run: npm update ${packageName}` : 'No fix available'
        });
      }
    }
    
    return vulnerabilities;
  }

  private async checkCommonSecurityIssues(projectPath: string): Promise<SecurityVulnerability[]> {
    const issues: SecurityVulnerability[] = [];
    
    const envFiles = ['.env', '.env.local', '.env.development'];
    for (const envFile of envFiles) {
      const envPath = path.join(projectPath, envFile);
      if (await fs.pathExists(envPath)) {
        const content = await fs.readFile(envPath, 'utf8');
        if (content.includes('SECRET') || content.includes('PASSWORD') || content.includes('KEY')) {
          issues.push({
            severity: 'high',
            package: 'Environment Configuration',
            version: 'N/A',
            advisory: 'Sensitive data exposed in environment file',
            path: envFile,
            recommendation: 'Move sensitive data to secure storage and add to .gitignore'
          });
        }
      }
    }
    
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      
      if (packageJson.scripts) {
        for (const [scriptName, script] of Object.entries(packageJson.scripts)) {
          if (typeof script === 'string' && script.includes('--inspect')) {
            issues.push({
              severity: 'medium',
              package: 'Node.js Debugger',
              version: 'N/A',
              advisory: 'Debugger exposure in npm script',
              path: `scripts.${scriptName}`,
              recommendation: 'Remove debugger flags from production scripts'
            });
          }
        }
      }
    }
    
    return issues;
  }

  private calculateSummary(vulnerabilities: SecurityVulnerability[]): SecurityScanResult['summary'] {
    const summary = {
      total: vulnerabilities.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };
    
    for (const vuln of vulnerabilities) {
      switch (vuln.severity) {
        case 'critical':
          summary.critical++;
          break;
        case 'high':
          summary.high++;
          break;
        case 'medium':
          summary.medium++;
          break;
        case 'low':
          summary.low++;
          break;
      }
    }
    
    return summary;
  }

  async generateSecurityReport(scanResult: SecurityScanResult): Promise<string> {
    let report = `# Security Scan Report\n\n`;
    report += `## Summary\n`;
    report += `- Total Vulnerabilities: ${scanResult.summary.total}\n`;
    report += `- Critical: ${scanResult.summary.critical}\n`;
    report += `- High: ${scanResult.summary.high}\n`;
    report += `- Medium: ${scanResult.summary.medium}\n`;
    report += `- Low: ${scanResult.summary.low}\n`;
    report += `- Status: ${scanResult.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`;
    
    if (scanResult.vulnerabilities.length > 0) {
      report += `## Vulnerabilities\n\n`;
      
      for (const vuln of scanResult.vulnerabilities) {
        report += `### ${vuln.package} (${vuln.severity.toUpperCase()})\n`;
        report += `- **Version**: ${vuln.version}\n`;
        report += `- **Advisory**: ${vuln.advisory}\n`;
        report += `- **Path**: ${vuln.path}\n`;
        report += `- **Recommendation**: ${vuln.recommendation}\n\n`;
      }
    }
    
    return report;
  }
}