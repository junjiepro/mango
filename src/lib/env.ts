import { z } from "zod";

/**
 * 环境变量验证模式
 * 确保所有必需的环境变量都已正确设置
 */
const envSchema = z.object({
  // Supabase 配置 - 必需
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL 必须是有效的 URL")
    .min(1, "NEXT_PUBLIC_SUPABASE_URL 不能为空"),

  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY 不能为空")
    .regex(
      /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
      "NEXT_PUBLIC_SUPABASE_ANON_KEY 必须是有效的 JWT 格式"
    ),

  // 站点配置 - 可选，有默认值
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url("NEXT_PUBLIC_SITE_URL 必须是有效的 URL")
    .optional()
    .default("http://localhost:3000"),

  // OPENAI API BASE
  OPENAI_API_BASE: z
    .string()
    .url("OPENAI_API_BASE 必须是有效的 URL")
    .optional()
    .default("https://api.openai.com/v1"),

  // OPENAI API KEY
  OPENAI_API_KEY: z.string().optional().default(""),

  // Node.js 环境
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .optional()
    .default("development"),

  // 可选配置
  NEXT_TELEMETRY_DISABLED: z
    .string()
    .optional()
    .transform((val) => val === "1" || val === "true"),

  // CI 环境标识
  CI: z
    .string()
    .optional()
    .transform((val) => val === "1" || val === "true"),

  // 调试模式
  DEBUG: z
    .string()
    .optional()
    .transform((val) => val === "1" || val === "true")
    .default(false),
});

/**
 * 客户端环境变量验证模式
 * 只包含以 NEXT_PUBLIC_ 开头的变量
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: envSchema.shape.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: envSchema.shape.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: envSchema.shape.NEXT_PUBLIC_SITE_URL,
});

/**
 * 服务端环境变量验证模式
 * 包含所有环境变量
 */
const serverEnvSchema = envSchema;

/**
 * 验证并解析环境变量
 */
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((err) => {
          const path = err.path.join(".");
          return `  - ${path}: ${err.message}`;
        })
        .join("\n");

      throw new Error(
        `❌ 环境变量配置错误:\n\n${missingVars}\n\n` +
          `请检查您的 .env.local 文件，确保所有必需的环境变量都已正确设置。\n` +
          `参考 .env.example 文件获取配置模板。`
      );
    }
    throw error;
  }
}

/**
 * 验证客户端环境变量
 */
function validateClientEnv() {
  try {
    return clientEnvSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((err) => {
          const path = err.path.join(".");
          return `  - ${path}: ${err.message}`;
        })
        .join("\n");

      throw new Error(
        `❌ 客户端环境变量配置错误:\n\n${missingVars}\n\n` +
          `这些变量以 NEXT_PUBLIC_ 开头，会暴露给客户端。\n` +
          `请确保在部署环境中正确设置了这些变量。`
      );
    }
    throw error;
  }
}

// 在服务端验证所有环境变量
let env: z.infer<typeof envSchema>;

if (typeof window === "undefined") {
  // 服务端环境
  env = validateEnv();
} else {
  // 客户端环境 - 只验证公开变量
  env = validateClientEnv() as z.infer<typeof envSchema>;
}

/**
 * 类型安全的环境变量
 * 在整个应用中使用这个对象来访问环境变量
 */
export { env };

/**
 * 环境变量辅助函数
 */
export const envHelpers = {
  /**
   * 检查是否为开发环境
   */
  isDevelopment: () => env.NODE_ENV === "development",

  /**
   * 检查是否为生产环境
   */
  isProduction: () => env.NODE_ENV === "production",

  /**
   * 检查是否为测试环境
   */
  isTest: () => env.NODE_ENV === "test",

  /**
   * 检查是否在 CI 环境中
   */
  isCI: () => env.CI === true,

  /**
   * 获取完整的站点 URL
   */
  getSiteUrl: () => env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",

  /**
   * 获取 Supabase 配置
   */
  getSupabaseConfig: () => ({
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }),

  /**
   * 检查是否启用调试模式
   */
  isDebugEnabled: () => env.DEBUG === true || env.NODE_ENV === "development",
};

/**
 * 环境变量检查器
 * 用于在应用启动时进行健康检查
 */
export function checkEnvironment() {
  const checks = [];

  // 检查 Supabase URL 格式
  if (!env.NEXT_PUBLIC_SUPABASE_URL.includes("supabase.co")) {
    checks.push({
      type: "warning",
      message: "Supabase URL 似乎不是标准格式，请确认是否正确",
    });
  }

  // 检查是否使用了开发环境的 URL 在生产环境
  if (
    envHelpers.isProduction() &&
    env.NEXT_PUBLIC_SITE_URL?.includes("localhost")
  ) {
    checks.push({
      type: "error",
      message: "生产环境不应使用 localhost URL",
    });
  }

  // 检查 Supabase 密钥长度
  if (env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length < 100) {
    checks.push({
      type: "warning",
      message: "Supabase 匿名密钥长度似乎不正确",
    });
  }

  return checks;
}

// 开发环境下显示环境检查结果
if (envHelpers.isDevelopment() && typeof window === "undefined") {
  const checks = checkEnvironment();
  if (checks.length > 0) {
    console.log("\n🔍 环境变量检查结果:");
    checks.forEach((check) => {
      const icon = check.type === "error" ? "❌" : "⚠️";
      console.log(`${icon} ${check.message}`);
    });
    console.log("");
  }
}

export default env;
