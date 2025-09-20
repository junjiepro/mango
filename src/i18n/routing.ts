import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  // 支持的语言列表：中文和英文
  locales: ['zh', 'en'],

  // 默认语言设置为中文
  defaultLocale: 'zh'
});