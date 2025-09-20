#!/usr/bin/env node

/**
 * 翻译文件完整性验证脚本
 * 检查所有语言的翻译文件是否包含相同的键结构
 */

const fs = require('fs');
const path = require('path');

// 配置
const MESSAGES_DIR = path.join(__dirname, '..', 'messages');
const SUPPORTED_LOCALES = ['zh', 'en'];

// 颜色输出
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * 递归获取对象的所有键路径
 */
function getNestedKeys(obj, prefix = '') {
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
}

/**
 * 读取并解析翻译文件
 */
function loadTranslationFile(locale) {
  const filePath = path.join(MESSAGES_DIR, `${locale}.json`);

  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Translation file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load ${locale}.json: ${error.message}`);
  }
}

/**
 * 验证 JSON 格式
 */
function validateJsonFormat(locale, content) {
  const errors = [];

  try {
    JSON.parse(JSON.stringify(content)); // 深度验证
  } catch (error) {
    errors.push(`Invalid JSON structure in ${locale}.json: ${error.message}`);
  }

  return errors;
}

/**
 * 检查空值或缺失值
 */
function checkEmptyValues(locale, obj, prefix = '') {
  const issues = [];

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      issues.push(...checkEmptyValues(locale, value, currentPath));
    } else if (!value || (typeof value === 'string' && value.trim() === '')) {
      issues.push(`Empty or missing value in ${locale}.json at key: ${currentPath}`);
    }
  }

  return issues;
}

/**
 * 检查插值参数的一致性
 */
function checkInterpolationConsistency(referenceObj, targetObj, locale, prefix = '') {
  const issues = [];

  for (const [key, refValue] of Object.entries(referenceObj)) {
    const currentPath = prefix ? `${prefix}.${key}` : key;
    const targetValue = targetObj[key];

    if (refValue && typeof refValue === 'object' && !Array.isArray(refValue)) {
      if (targetValue && typeof targetValue === 'object') {
        issues.push(...checkInterpolationConsistency(refValue, targetValue, locale, currentPath));
      }
    } else if (typeof refValue === 'string' && typeof targetValue === 'string') {
      // 检查插值参数 {param}
      const refParams = (refValue.match(/\{[\w-]+\}/g) || []).sort();
      const targetParams = (targetValue.match(/\{[\w-]+\}/g) || []).sort();

      if (JSON.stringify(refParams) !== JSON.stringify(targetParams)) {
        issues.push(
          `Interpolation parameter mismatch in ${locale}.json at key: ${currentPath}\n` +
          `  Reference (zh): ${refParams.join(', ') || 'none'}\n` +
          `  Target (${locale}): ${targetParams.join(', ') || 'none'}`
        );
      }
    }
  }

  return issues;
}

/**
 * 主验证函数
 */
function validateTranslations() {
  log('🔧 Mango 翻译文件验证工具', 'bold');
  log('==================================', 'cyan');

  let hasErrors = false;
  const translations = {};
  const allKeys = {};

  // 1. 加载所有翻译文件
  log('\n📁 加载翻译文件...', 'blue');
  for (const locale of SUPPORTED_LOCALES) {
    try {
      translations[locale] = loadTranslationFile(locale);
      allKeys[locale] = getNestedKeys(translations[locale]);
      log(`✅ ${locale}.json 加载成功 (${allKeys[locale].length} 个键)`, 'green');
    } catch (error) {
      log(`❌ ${error.message}`, 'red');
      hasErrors = true;
    }
  }

  if (hasErrors) {
    log('\n❌ 文件加载失败，请检查翻译文件', 'red');
    process.exit(1);
  }

  // 2. 验证 JSON 格式
  log('\n🔍 验证 JSON 格式...', 'blue');
  for (const locale of SUPPORTED_LOCALES) {
    const formatErrors = validateJsonFormat(locale, translations[locale]);
    if (formatErrors.length > 0) {
      formatErrors.forEach(error => log(`❌ ${error}`, 'red'));
      hasErrors = true;
    } else {
      log(`✅ ${locale}.json 格式正确`, 'green');
    }
  }

  // 3. 检查键结构一致性
  log('\n🗝️  检查键结构一致性...', 'blue');
  const referenceKeys = allKeys[SUPPORTED_LOCALES[0]];

  for (let i = 1; i < SUPPORTED_LOCALES.length; i++) {
    const locale = SUPPORTED_LOCALES[i];
    const currentKeys = allKeys[locale];

    // 检查缺失的键
    const missingKeys = referenceKeys.filter(key => !currentKeys.includes(key));
    const extraKeys = currentKeys.filter(key => !referenceKeys.includes(key));

    if (missingKeys.length > 0) {
      log(`❌ ${locale}.json 缺失键:`, 'red');
      missingKeys.forEach(key => log(`   - ${key}`, 'red'));
      hasErrors = true;
    }

    if (extraKeys.length > 0) {
      log(`⚠️  ${locale}.json 额外键:`, 'yellow');
      extraKeys.forEach(key => log(`   - ${key}`, 'yellow'));
    }

    if (missingKeys.length === 0 && extraKeys.length === 0) {
      log(`✅ ${locale}.json 键结构一致`, 'green');
    }
  }

  // 4. 检查空值
  log('\n💭 检查空值...', 'blue');
  for (const locale of SUPPORTED_LOCALES) {
    const emptyValueIssues = checkEmptyValues(locale, translations[locale]);
    if (emptyValueIssues.length > 0) {
      log(`⚠️  ${locale}.json 发现空值:`, 'yellow');
      emptyValueIssues.forEach(issue => log(`   - ${issue}`, 'yellow'));
    } else {
      log(`✅ ${locale}.json 无空值`, 'green');
    }
  }

  // 5. 检查插值参数一致性
  log('\n🔗 检查插值参数一致性...', 'blue');
  const referenceTranslations = translations[SUPPORTED_LOCALES[0]];

  for (let i = 1; i < SUPPORTED_LOCALES.length; i++) {
    const locale = SUPPORTED_LOCALES[i];
    const interpolationIssues = checkInterpolationConsistency(
      referenceTranslations,
      translations[locale],
      locale
    );

    if (interpolationIssues.length > 0) {
      log(`❌ ${locale}.json 插值参数不一致:`, 'red');
      interpolationIssues.forEach(issue => log(`   ${issue}`, 'red'));
      hasErrors = true;
    } else {
      log(`✅ ${locale}.json 插值参数一致`, 'green');
    }
  }

  // 6. 生成统计报告
  log('\n📊 翻译文件统计:', 'blue');
  log(`   支持语言: ${SUPPORTED_LOCALES.join(', ')}`, 'cyan');
  log(`   翻译键总数: ${referenceKeys.length}`, 'cyan');
  log(`   文件位置: ${MESSAGES_DIR}`, 'cyan');

  // 7. 最终结果
  log('\n' + '='.repeat(50), 'cyan');
  if (hasErrors) {
    log('❌ 翻译文件验证失败！请修复上述错误。', 'red');
    log('\n💡 建议:', 'yellow');
    log('   1. 确保所有语言文件包含相同的键结构', 'yellow');
    log('   2. 检查插值参数 {param} 的一致性', 'yellow');
    log('   3. 填充所有空值', 'yellow');
    log('   4. 验证 JSON 格式的正确性', 'yellow');
    process.exit(1);
  } else {
    log('✅ 翻译文件验证通过！所有文件结构一致。', 'green');
    process.exit(0);
  }
}

// 运行验证
if (require.main === module) {
  validateTranslations();
}

module.exports = {
  validateTranslations,
  getNestedKeys,
  loadTranslationFile
};