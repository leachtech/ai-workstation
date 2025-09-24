const { build } = require('electron-builder');
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

class Builder {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..');
    this.distDir = path.join(this.rootDir, 'dist');
    this.releaseDir = path.join(this.rootDir, 'release');
  }

  async clean() {
    console.log('🧹 Cleaning previous builds...');
    await fs.remove(this.distDir);
    await fs.remove(this.releaseDir);
  }

  async buildRenderer() {
    console.log('🏗️  Building renderer process...');
    execSync('npm run build:renderer', { stdio: 'inherit', cwd: this.rootDir });
  }

  async buildMain() {
    console.log('🔨 Building main process...');
    execSync('npm run build:main', { stdio: 'inherit', cwd: this.rootDir });
  }

  async packageApp() {
    console.log('📦 Packaging application...');
    
    const config = {
      ...require('../package.json').build,
      directories: {
        output: this.releaseDir
      }
    };

    await build({
      config,
      publish: 'never'
    });
  }

  async generateChecksums() {
    console.log('🔍 Generating checksums...');
    
    const files = await fs.readdir(this.releaseDir);
    const checksums = {};
    
    for (const file of files) {
      if (file.endsWith('.exe') || file.endsWith('.dmg') || file.endsWith('.AppImage')) {
        const filePath = path.join(this.releaseDir, file);
        const hash = execSync(`certutil -hashfile "${filePath}" SHA256`).toString();
        checksums[file] = hash.split('\r\n')[1];
      }
    }
    
    await fs.writeJson(path.join(this.releaseDir, 'checksums.json'), checksums, { spaces: 2 });
  }

  async run() {
    try {
      await this.clean();
      await this.buildRenderer();
      await this.buildMain();
      await this.packageApp();
      await this.generateChecksums();
      
      console.log('✅ Build completed successfully!');
      console.log('📁 Output directory:', this.releaseDir);
      
      const files = await fs.readdir(this.releaseDir);
      console.log('📋 Generated files:');
      files.forEach(file => console.log('   -', file));
      
    } catch (error) {
      console.error('❌ Build failed:', error);
      process.exit(1);
    }
  }
}

new Builder().run();