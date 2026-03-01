/**
 * CLI Version Command
 * 显示版本信息
 */

import { formatter } from '../lib/formatter.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function showVersion(): void {
  try {
    // 读取 package.json 获取版本信息
    const packageJsonPath = join(__dirname, '../../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    formatter.info(`Mango CLI v${packageJson.version}`);
    console.log(`Node.js ${process.version}`);
    console.log(`Platform: ${process.platform} ${process.arch}`);
  } catch (error) {
    formatter.error('Failed to read version information');
    console.log('Mango CLI v0.1.0 (fallback)');
  }
}
