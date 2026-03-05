/**
 * CLI Help Command
 * 显示帮助信息
 */

import { formatter } from '../lib/formatter.js';
import { t } from '../i18n/index.js';

export function showHelp(): void {
  formatter.info(t('help.title') + '\n');

  console.log(t('help.usage'));
  console.log(t('help.usageCmd') + '\n');

  console.log(t('help.commandsTitle'));
  console.log(t('help.cmdStart'));
  console.log(t('help.cmdStatus'));
  console.log(t('help.cmdVersion'));
  console.log(t('help.cmdHelp') + '\n');

  console.log(t('help.startOptions'));
  console.log(t('help.optPort'));
  console.log(t('help.optAppUrl'));
  console.log(t('help.optSupabaseUrl'));
  console.log(t('help.optSupabaseKey'));
  console.log(t('help.optIgnoreBind'));
  console.log(t('help.optNoTunnel') + '\n');

  console.log(t('help.examples'));
  console.log(t('help.exDefaultStart'));
  console.log('  mango-ai-cli start\n');

  console.log(t('help.exPortStart'));
  console.log('  mango-ai-cli start --port 3200\n');

  console.log(t('help.exNoBrowser'));
  console.log('  mango-ai-cli start --ignore-open-bind-url\n');

  console.log(t('help.exStatus'));
  console.log('  mango-ai-cli status\n');

  console.log(t('help.moreInfo'));
  console.log(t('help.docs'));
  console.log(t('help.issues'));
}
