#!/usr/bin/env node

/**
 * Environment Configuration Management Script
 *
 * This script helps manage environment variables across different deployment stages
 * for the Mango AI Agent platform.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Color codes for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

// Environment configuration
const environments = {
  development: {
    file: '.env.development.template',
    name: 'Development',
    description: 'Local development environment with all Agent features enabled'
  },
  staging: {
    file: '.env.staging.template',
    name: 'Staging',
    description: 'Staging environment for testing with gradual feature rollout'
  },
  production: {
    file: '.env.production.template',
    name: 'Production',
    description: 'Production environment with phased Agent system deployment'
  }
};

// Required environment variables for Agent system
const requiredVars = {
  core: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SITE_URL'
  ],
  agent: [
    'NEXT_PUBLIC_AGENT_SYSTEM_ENABLED',
    'NEXT_PUBLIC_AGENT_DEFAULT_MODEL',
    'NEXT_PUBLIC_PERFORMANCE_MONITORING'
  ],
  i18n: [
    'NEXT_PUBLIC_DEFAULT_LOCALE',
    'NEXT_PUBLIC_SUPPORTED_LOCALES'
  ]
};

// Agent feature flags and their dependencies
const featureFlags = {
  NEXT_PUBLIC_AGENT_SYSTEM_ENABLED: {
    name: 'Agent System',
    description: 'Core Agent functionality',
    dependencies: ['NEXT_PUBLIC_PERFORMANCE_MONITORING']
  },
  NEXT_PUBLIC_AGENT_ONBOARDING: {
    name: 'Agent Onboarding',
    description: 'Interactive onboarding flow',
    dependencies: ['NEXT_PUBLIC_AGENT_SYSTEM_ENABLED']
  },
  NEXT_PUBLIC_AGENT_ADVANCED_MODE: {
    name: 'Advanced Mode',
    description: 'Advanced Agent interface features',
    dependencies: ['NEXT_PUBLIC_AGENT_SYSTEM_ENABLED', 'NEXT_PUBLIC_AGENT_ONBOARDING']
  },
  NEXT_PUBLIC_AGENT_SESSION_HISTORY: {
    name: 'Session History',
    description: 'Conversation history management',
    dependencies: ['NEXT_PUBLIC_AGENT_SYSTEM_ENABLED']
  },
  NEXT_PUBLIC_AGENT_PLUGINS_ENABLED: {
    name: 'Plugin System',
    description: 'MCP plugin architecture',
    dependencies: ['NEXT_PUBLIC_AGENT_ADVANCED_MODE']
  }
};

class EnvironmentManager {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(`${colors.blue}${question}${colors.reset} `, resolve);
    });
  }

  async selectEnvironment() {
    this.log('\n🚀 Mango AI Agent - Environment Configuration Manager\n', 'cyan');
    this.log('Available environments:');

    Object.entries(environments).forEach(([key, env], index) => {
      this.log(`${index + 1}. ${env.name} - ${env.description}`, 'yellow');
    });

    const choice = await this.askQuestion('\nSelect environment (1-3): ');
    const envKeys = Object.keys(environments);
    const selectedKey = envKeys[parseInt(choice) - 1];

    if (!selectedKey) {
      this.log('Invalid selection!', 'red');
      process.exit(1);
    }

    return selectedKey;
  }

  validateEnvironmentFile(envType) {
    const templatePath = path.join(__dirname, '../env', environments[envType].file);

    if (!fs.existsSync(templatePath)) {
      this.log(`❌ Template file not found: ${templatePath}`, 'red');
      return false;
    }

    const content = fs.readFileSync(templatePath, 'utf8');
    const lines = content.split('\n');
    const envVars = {};

    // Parse environment variables
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        envVars[key] = valueParts.join('=');
      }
    });

    this.log(`\n📋 Validating ${environments[envType].name} environment...\n`, 'cyan');

    let isValid = true;
    let missingVars = [];

    // Check required core variables
    this.log('Core Variables:', 'yellow');
    requiredVars.core.forEach(varName => {
      if (envVars[varName] && !envVars[varName].startsWith('your_')) {
        this.log(`  ✅ ${varName}`, 'green');
      } else {
        this.log(`  ❌ ${varName} - Missing or placeholder value`, 'red');
        missingVars.push(varName);
        isValid = false;
      }
    });

    // Check Agent variables
    this.log('\nAgent System Variables:', 'yellow');
    requiredVars.agent.forEach(varName => {
      if (envVars[varName]) {
        this.log(`  ✅ ${varName} = ${envVars[varName]}`, 'green');
      } else {
        this.log(`  ❌ ${varName} - Missing`, 'red');
        missingVars.push(varName);
        isValid = false;
      }
    });

    // Check i18n variables
    this.log('\nInternationalization Variables:', 'yellow');
    requiredVars.i18n.forEach(varName => {
      if (envVars[varName]) {
        this.log(`  ✅ ${varName} = ${envVars[varName]}`, 'green');
      } else {
        this.log(`  ❌ ${varName} - Missing`, 'red');
        missingVars.push(varName);
        isValid = false;
      }
    });

    // Feature flags validation
    this.log('\nAgent Feature Flags:', 'yellow');
    Object.entries(featureFlags).forEach(([flag, config]) => {
      const value = envVars[flag];
      if (value) {
        const enabled = value === 'true';
        this.log(`  ${enabled ? '✅' : '⚠️ '} ${config.name}: ${value}`, enabled ? 'green' : 'yellow');

        // Check dependencies
        if (enabled && config.dependencies) {
          config.dependencies.forEach(dep => {
            const depValue = envVars[dep];
            if (!depValue || depValue !== 'true') {
              this.log(`    ❌ Dependency ${dep} not enabled`, 'red');
              isValid = false;
            }
          });
        }
      } else {
        this.log(`  ❌ ${config.name} - Missing flag`, 'red');
        missingVars.push(flag);
        isValid = false;
      }
    });

    if (isValid) {
      this.log('\n✅ Environment configuration is valid!', 'green');
    } else {
      this.log('\n❌ Environment configuration has issues:', 'red');
      this.log('Missing variables:', 'yellow');
      missingVars.forEach(varName => {
        this.log(`  - ${varName}`, 'red');
      });
    }

    return isValid;
  }

  async generateEnvironmentFile(envType) {
    const templatePath = path.join(__dirname, '../env', environments[envType].file);
    const outputPath = path.join(process.cwd(), `.env.${envType}`);

    if (fs.existsSync(outputPath)) {
      const overwrite = await this.askQuestion(`File .env.${envType} already exists. Overwrite? (y/N): `);
      if (overwrite.toLowerCase() !== 'y') {
        this.log('Operation cancelled.', 'yellow');
        return false;
      }
    }

    try {
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      fs.writeFileSync(outputPath, templateContent);

      this.log(`\n✅ Environment file created: .env.${envType}`, 'green');
      this.log('⚠️  Remember to update placeholder values with actual configuration!', 'yellow');

      if (envType === 'production') {
        this.log('\n🔒 Production environment created with Agent features disabled.', 'cyan');
        this.log('Follow the phased deployment plan to gradually enable features.', 'yellow');
      }

      return true;
    } catch (error) {
      this.log(`❌ Error creating environment file: ${error.message}`, 'red');
      return false;
    }
  }

  async showFeatureFlagGuide() {
    this.log('\n📖 Agent Feature Flag Deployment Guide\n', 'cyan');

    this.log('Recommended deployment phases:', 'yellow');
    this.log('1. Infrastructure Phase:', 'green');
    this.log('   - NEXT_PUBLIC_PERFORMANCE_MONITORING=true');
    this.log('   - All other Agent flags=false');

    this.log('\n2. Core System Phase:', 'green');
    this.log('   - NEXT_PUBLIC_AGENT_SYSTEM_ENABLED=true');
    this.log('   - NEXT_PUBLIC_AGENT_ONBOARDING=true');

    this.log('\n3. Advanced Features Phase:', 'green');
    this.log('   - NEXT_PUBLIC_AGENT_ADVANCED_MODE=true');
    this.log('   - NEXT_PUBLIC_AGENT_SESSION_HISTORY=true');

    this.log('\n4. Full Feature Set Phase:', 'green');
    this.log('   - NEXT_PUBLIC_AGENT_PLUGINS_ENABLED=true');

    this.log('\nFeature Dependencies:', 'yellow');
    Object.entries(featureFlags).forEach(([flag, config]) => {
      this.log(`- ${config.name}:`, 'cyan');
      if (config.dependencies && config.dependencies.length > 0) {
        config.dependencies.forEach(dep => {
          const depConfig = featureFlags[dep];
          this.log(`  └─ Requires: ${depConfig ? depConfig.name : dep}`, 'yellow');
        });
      } else {
        this.log('  └─ No dependencies', 'green');
      }
    });
  }

  async run() {
    try {
      const action = process.argv[2];

      switch (action) {
        case 'validate':
          const validateEnv = process.argv[3] || await this.selectEnvironment();
          this.validateEnvironmentFile(validateEnv);
          break;

        case 'generate':
          const generateEnv = process.argv[3] || await this.selectEnvironment();
          await this.generateEnvironmentFile(generateEnv);
          break;

        case 'guide':
          await this.showFeatureFlagGuide();
          break;

        case 'check-deployment':
          await this.checkDeploymentReadiness();
          break;

        default:
          this.log('Usage:', 'yellow');
          this.log('  node scripts/env-manager.js validate [environment]', 'cyan');
          this.log('  node scripts/env-manager.js generate [environment]', 'cyan');
          this.log('  node scripts/env-manager.js guide', 'cyan');
          this.log('  node scripts/env-manager.js check-deployment', 'cyan');
          this.log('\nEnvironments: development, staging, production', 'yellow');
      }

    } catch (error) {
      this.log(`❌ Error: ${error.message}`, 'red');
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }

  async checkDeploymentReadiness() {
    this.log('\n🚀 Deployment Readiness Check\n', 'cyan');

    const checks = [
      { name: 'Unit Tests', command: 'npm run test', required: true },
      { name: 'E2E Tests', command: 'npm run test:e2e', required: true },
      { name: 'TypeScript Check', command: 'npx tsc --noEmit', required: true },
      { name: 'Lint Check', command: 'npm run lint', required: true },
      { name: 'Build Test', command: 'npm run build', required: true },
      { name: 'Performance Test', command: 'npm run test:performance', required: false }
    ];

    let allPassed = true;

    for (const check of checks) {
      process.stdout.write(`Checking ${check.name}... `);

      try {
        const { execSync } = require('child_process');
        execSync(check.command, { stdio: 'ignore' });
        this.log('✅ PASS', 'green');
      } catch (error) {
        this.log('❌ FAIL', 'red');
        if (check.required) {
          allPassed = false;
        }
      }
    }

    if (allPassed) {
      this.log('\n✅ All checks passed! Ready for deployment.', 'green');
    } else {
      this.log('\n❌ Some required checks failed. Fix issues before deployment.', 'red');
      process.exit(1);
    }
  }
}

// Run the environment manager
if (require.main === module) {
  const manager = new EnvironmentManager();
  manager.run();
}

module.exports = EnvironmentManager;