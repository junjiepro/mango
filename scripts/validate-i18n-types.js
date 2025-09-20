#!/usr/bin/env node

/**
 * TypeScript i18n 类型验证脚本
 * 检查翻译文件与类型定义的一致性
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const PROJECT_ROOT = path.join(__dirname, '..');
const TYPES_FILE = path.join(PROJECT_ROOT, 'src', 'types', 'i18n.ts');
const MESSAGES_DIR = path.join(PROJECT_ROOT, 'messages');

// 颜色输出
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * 验证 TypeScript 编译 i18n 相关文件
 */
function validateTypeScriptCompilation() {
  log('\n🔧 验证 TypeScript i18n 类型编译...', 'blue');

  try {
    // 只检查 i18n 相关文件的类型
    const filesToCheck = [
      'src/types/i18n.ts',
      'src/lib/i18n.ts',
      'src/hooks/useI18n.ts',
      'src/components/LanguageSwitcher.tsx'
    ];

    for (const file of filesToCheck) {
      const fullPath = path.join(PROJECT_ROOT, file);
      if (fs.existsSync(fullPath)) {
        try {
          execSync(`npx tsc --noEmit "${fullPath}"`, {
            cwd: PROJECT_ROOT,
            stdio: 'pipe'
          });
          log(`✅ ${file} 类型检查通过`, 'green');
        } catch (error) {
          log(`❌ ${file} 类型检查失败:`, 'red');
          log(error.stdout?.toString() || error.message, 'red');
          return false;
        }
      } else {
        log(`⚠️  ${file} 文件不存在`, 'yellow');
      }
    }

    return true;
  } catch (error) {
    log(`❌ TypeScript 编译检查失败: ${error.message}`, 'red');
    return false;
  }
}

/**
 * 验证翻译键与类型定义的一致性
 */
function validateTranslationKeysConsistency() {
  log('\n🗝️  验证翻译键与类型定义一致性...', 'blue');

  try {
    // 读取类型定义文件
    const typesContent = fs.readFileSync(TYPES_FILE, 'utf8');

    // 提取 TranslationKey 类型中的键
    const keyRegex = /\|\s*'([^']+)'/g;
    const typeKeys = [];
    let match;

    while ((match = keyRegex.exec(typesContent)) !== null) {
      const key = match[1];
      // 过滤掉不应该作为翻译键的项目
      if (key !== 'en' && key !== 'zh' && !key.startsWith('//')) {
        typeKeys.push(key);
      }
    }

    if (typeKeys.length === 0) {
      log('❌ 无法从类型定义中提取翻译键', 'red');
      return false;
    }

    log(`✅ 从类型定义中提取了 ${typeKeys.length} 个翻译键`, 'green');

    // 读取翻译文件
    const zhPath = path.join(MESSAGES_DIR, 'zh.json');
    const enPath = path.join(MESSAGES_DIR, 'en.json');

    if (!fs.existsSync(zhPath) || !fs.existsSync(enPath)) {
      log('❌ 翻译文件不存在', 'red');
      return false;
    }

    const zhMessages = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
    const enMessages = JSON.parse(fs.readFileSync(enPath, 'utf8'));

    // 获取实际的翻译键
    const getNestedKeys = (obj, prefix = '') => {
      const keys = [];
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          keys.push(...getNestedKeys(value, currentPath));
        } else {
          keys.push(currentPath);
        }
      }
      return keys.sort();
    };

    const actualKeys = getNestedKeys(zhMessages);

    // 比较类型定义的键和实际的键
    const missingInTypes = actualKeys.filter(key => !typeKeys.includes(key));
    const missingInTranslations = typeKeys.filter(key => !actualKeys.includes(key));

    if (missingInTypes.length > 0) {
      log('❌ 以下翻译键在类型定义中缺失:', 'red');
      missingInTypes.forEach(key => log(`   - ${key}`, 'red'));
    }

    if (missingInTranslations.length > 0) {
      log('❌ 以下类型定义的键在翻译文件中缺失:', 'red');
      missingInTranslations.forEach(key => log(`   - ${key}`, 'red'));
    }

    if (missingInTypes.length === 0 && missingInTranslations.length === 0) {
      log('✅ 翻译键与类型定义完全一致', 'green');
      return true;
    }

    return false;
  } catch (error) {
    log(`❌ 键一致性验证失败: ${error.message}`, 'red');
    return false;
  }
}

/**
 * 主验证函数
 */
function validateI18nTypes() {
  log('🔧 Mango i18n 类型验证工具', 'bold');
  log('==============================', 'cyan');

  let hasErrors = false;

  // 1. TypeScript 编译验证
  if (!validateTypeScriptCompilation()) {
    hasErrors = true;
  }

  // 2. 翻译键一致性验证
  if (!validateTranslationKeysConsistency()) {
    hasErrors = true;
  }

  // 3. 最终结果
  log('\n' + '='.repeat(40), 'cyan');
  if (hasErrors) {
    log('❌ i18n 类型验证失败！请修复上述错误。', 'red');
    log('\n💡 建议:', 'yellow');
    log('   1. 确保类型定义与翻译文件同步', 'yellow');
    log('   2. 修复 TypeScript 编译错误', 'yellow');
    log('   3. 验证所有导入的类型是否正确', 'yellow');
    process.exit(1);
  } else {
    log('✅ i18n 类型验证通过！类型定义与翻译文件一致。', 'green');
    process.exit(0);
  }
}

// 运行验证
if (require.main === module) {
  validateI18nTypes();
}

module.exports = {
  validateI18nTypes,
  validateTypeScriptCompilation,
  validateTranslationKeysConsistency
};