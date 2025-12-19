/**
 * CLI Output Formatter
 * 提供统一的CLI输出格式化和日志功能
 */

import chalk from 'chalk';
import ora, { Ora } from 'ora';

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
}

/**
 * 格式化器类
 */
export class Formatter {
  private verbose: boolean;

  constructor(verbose = false) {
    this.verbose = verbose;
  }

  /**
   * 打印标题
   */
  title(text: string): void {
    console.log(chalk.blue.bold(`\n🥭 ${text}\n`));
  }

  /**
   * 打印成功消息
   */
  success(text: string): void {
    console.log(chalk.green(`✓ ${text}`));
  }

  /**
   * 打印错误消息
   */
  error(text: string): void {
    console.log(chalk.red(`✗ ${text}`));
  }

  /**
   * 打印警告消息
   */
  warning(text: string): void {
    console.log(chalk.yellow(`⚠ ${text}`));
  }

  /**
   * 打印信息消息
   */
  info(text: string): void {
    console.log(chalk.blue(`ℹ ${text}`));
  }

  /**
   * 打印调试消息（仅在verbose模式下）
   */
  debug(text: string): void {
    if (this.verbose) {
      console.log(chalk.gray(`[DEBUG] ${text}`));
    }
  }

  /**
   * 打印普通文本
   */
  log(text: string): void {
    console.log(text);
  }

  /**
   * 打印带标签的文本
   */
  labeled(label: string, value: string): void {
    console.log(`${chalk.bold(label)}: ${value}`);
  }

  /**
   * 打印高亮文本
   */
  highlight(text: string): void {
    console.log(chalk.cyan(text));
  }

  /**
   * 打印灰色文本（次要信息）
   */
  dim(text: string): void {
    console.log(chalk.dim(text));
  }

  /**
   * 创建加载动画
   */
  spinner(text: string): Ora {
    return ora(text).start();
  }

  /**
   * 打印分隔线
   */
  divider(): void {
    console.log(chalk.gray('─'.repeat(50)));
  }

  /**
   * 打印空行
   */
  newline(): void {
    console.log();
  }

  /**
   * 打印表格
   */
  table(headers: string[], rows: string[][]): void {
    // 计算每列的最大宽度
    const columnWidths = headers.map((header, i) => {
      const maxRowWidth = Math.max(...rows.map((row) => (row[i] || '').length));
      return Math.max(header.length, maxRowWidth);
    });

    // 打印表头
    const headerRow = headers
      .map((header, i) => header.padEnd(columnWidths[i]))
      .join(' | ');
    console.log(chalk.bold(headerRow));

    // 打印分隔线
    const separator = columnWidths.map((width) => '─'.repeat(width)).join('─┼─');
    console.log(chalk.gray(separator));

    // 打印数据行
    rows.forEach((row) => {
      const dataRow = row
        .map((cell, i) => (cell || '').padEnd(columnWidths[i]))
        .join(' │ ');
      console.log(dataRow);
    });
  }

  /**
   * 打印键值对列表
   */
  keyValue(items: Record<string, string>): void {
    const maxKeyLength = Math.max(...Object.keys(items).map((k) => k.length));

    Object.entries(items).forEach(([key, value]) => {
      const paddedKey = key.padEnd(maxKeyLength);
      console.log(`${chalk.bold(paddedKey)}: ${value}`);
    });
  }

  /**
   * 打印代码块
   */
  code(text: string): void {
    console.log(chalk.gray('```'));
    console.log(text);
    console.log(chalk.gray('```'));
  }

  /**
   * 打印URL
   */
  url(text: string): void {
    console.log(chalk.cyan.underline(text));
  }

  /**
   * 打印命令
   */
  command(text: string): void {
    console.log(chalk.yellow(`$ ${text}`));
  }

  /**
   * 打印步骤
   */
  step(number: number, text: string): void {
    console.log(chalk.blue.bold(`${number}.`) + ` ${text}`);
  }

  /**
   * 打印列表项
   */
  listItem(text: string, level = 0): void {
    const indent = '  '.repeat(level);
    console.log(`${indent}• ${text}`);
  }

  /**
   * 打印错误堆栈（仅在verbose模式下）
   */
  errorStack(error: Error): void {
    if (this.verbose && error.stack) {
      console.log(chalk.red(error.stack));
    }
  }

  /**
   * 清空控制台
   */
  clear(): void {
    console.clear();
  }
}

// 导出默认实例
export const formatter = new Formatter();

/**
 * 创建带verbose选项的格式化器
 */
export function createFormatter(verbose = false): Formatter {
  return new Formatter(verbose);
}
