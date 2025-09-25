/**
 * Agent 系统性能优化配置
 * 针对 AI Agent 功能的特定优化设置
 */

import type { NextConfig } from 'next';

// Bundle 分析配置
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

// Agent 系统性能优化配置
const agentPerformanceConfig: NextConfig = {
  // 实验性功能
  experimental: {
    // 启用 Turbopack（开发环境）
    turbopack: true,

    // 优化字体加载
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      '@radix-ui/react-avatar',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-progress',
      'react-syntax-highlighter'
    ],

    // 启用 PPR (Partial Prerendering)
    ppr: true,

    // 启用服务器组件的并行渲染
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  },

  // 编译优化
  compiler: {
    // 移除 console.log（生产环境）
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,

    // React 编译器优化
    reactRemoveProperties: process.env.NODE_ENV === 'production' ? {
      properties: ['^data-testid$', '^data-test$']
    } : false
  },

  // 图像优化
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // 优化 Agent 头像和图标
    domains: process.env.NODE_ENV === 'production' ? [] : ['localhost'],
  },

  // Webpack 优化
  webpack: (config, { dev, isServer, webpack, nextRuntime }) => {
    // 生产环境优化
    if (!dev) {
      // 代码分割优化
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            // AI Elements 专用 chunk
            'ai-elements': {
              name: 'ai-elements',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](ai-elements|@ai|ai-sdk)[\\/]/,
              priority: 30,
              reuseExistingChunk: true
            },
            // UI 组件库专用 chunk
            'ui-libs': {
              name: 'ui-libs',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|class-variance-authority)[\\/]/,
              priority: 25,
              reuseExistingChunk: true
            },
            // Supabase 专用 chunk
            'supabase': {
              name: 'supabase',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](@supabase)[\\/]/,
              priority: 20,
              reuseExistingChunk: true
            },
            // React 和相关库
            'react': {
              name: 'react',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|react-hook-form)[\\/]/,
              priority: 15,
              reuseExistingChunk: true
            }
          }
        }
      };

      // Tree shaking 优化
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;

      // 压缩优化
      config.optimization.minimizer.push(
        new webpack.DefinePlugin({
          'process.env.NODE_ENV': JSON.stringify('production'),
          'process.env.DEBUG': JSON.stringify(false)
        })
      );
    }

    // 别名优化
    config.resolve.alias = {
      ...config.resolve.alias,
      // 避免重复打包
      'react': require.resolve('react'),
      'react-dom': require.resolve('react-dom')
    };

    // 模块解析优化
    config.resolve.modules = ['node_modules', 'src'];

    return config;
  },

  // 输出配置
  output: 'standalone',

  // 压缩配置
  compress: true,

  // 静态资源优化
  assetPrefix: process.env.NODE_ENV === 'production' ? process.env.ASSET_PREFIX : '',

  // 性能预算
  onDemandEntries: {
    // 页面在内存中保持的时间
    maxInactiveAge: 25 * 1000,
    // 同时保持在内存中的页面数
    pagesBufferLength: 5,
  },

  // 重定向优化
  async redirects() {
    return [
      // 将旧路径重定向到新的 Agent 路径
      {
        source: '/chat',
        destination: '/ai-agent',
        permanent: true,
      },
      {
        source: '/assistant',
        destination: '/ai-agent',
        permanent: true,
      }
    ];
  },

  // 重写规则
  async rewrites() {
    return [
      // API 路由优化
      {
        source: '/agent/:path*',
        destination: '/api/agent/:path*',
      }
    ];
  },

  // Headers 优化
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // 安全 Headers
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // 性能 Headers
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          }
        ],
      },
      // 静态资源缓存
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // API 缓存策略
      {
        source: '/api/agent/preferences',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, max-age=300, stale-while-revalidate=60',
          },
        ],
      },
      // Agent 页面缓存
      {
        source: '/ai-agent',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      }
    ];
  },

  // 开发环境特定优化
  ...(process.env.NODE_ENV === 'development' && {
    // 快速刷新
    reactStrictMode: true,

    // 开发环境性能监控
    eslint: {
      ignoreDuringBuilds: false,
    },

    typescript: {
      ignoreBuildErrors: false,
    }
  }),

  // 生产环境特定优化
  ...(process.env.NODE_ENV === 'production' && {
    // 严格模式
    reactStrictMode: true,

    // 构建优化
    swcMinify: true,

    // 打包分析
    generateBuildId: async () => {
      return process.env.BUILD_ID || `build-${Date.now()}`;
    },

    // 性能监控
    analyticsId: process.env.ANALYTICS_ID,
  })
};

// 性能监控配置
const performanceConfig = {
  // Web Vitals 阈值
  thresholds: {
    FCP: 1800,  // First Contentful Paint
    LCP: 2500,  // Largest Contentful Paint
    FID: 100,   // First Input Delay
    CLS: 0.1,   // Cumulative Layout Shift
    TTFB: 800   // Time to First Byte
  },

  // Agent 特定性能目标
  agentMetrics: {
    chatLoadTime: 2000,      // 对话页面加载时间
    messageResponseTime: 3000, // 消息响应时间
    historyLoadTime: 1500,   // 历史记录加载时间
    settingsSaveTime: 1000,  // 设置保存时间
  },

  // 性能预算
  budgets: [
    {
      resourceType: 'script',
      maximumWarn: 500000,     // 500KB
      maximumError: 1000000    // 1MB
    },
    {
      resourceType: 'style',
      maximumWarn: 100000,     // 100KB
      maximumError: 200000     // 200KB
    },
    {
      resourceType: 'image',
      maximumWarn: 500000,     // 500KB per image
      maximumError: 1000000    // 1MB per image
    },
    {
      resourceType: 'media',
      maximumWarn: 1000000,    // 1MB
      maximumError: 5000000    // 5MB
    }
  ]
};

// 监控和报告配置
const monitoringConfig = {
  // 性能监控端点
  reportingEndpoint: '/api/performance',

  // 采样率
  sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // 自动报告
  autoReport: true,

  // 报告间隔（毫秒）
  reportInterval: 30000,

  // 缓冲区大小
  bufferSize: 100
};

// 导出配置
module.exports = withBundleAnalyzer({
  ...agentPerformanceConfig,

  // 自定义配置属性
  performanceConfig,
  monitoringConfig,

  // 环境变量验证
  env: {
    PERFORMANCE_MONITORING: process.env.PERFORMANCE_MONITORING || 'false',
    BUNDLE_ANALYZE: process.env.ANALYZE || 'false',
    ASSET_PREFIX: process.env.ASSET_PREFIX || '',
  }
});

// 导出性能配置供其他模块使用
export { performanceConfig, monitoringConfig };