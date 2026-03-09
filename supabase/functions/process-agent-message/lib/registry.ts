import { createOpenAICompatible } from 'https://esm.sh/@ai-sdk/openai-compatible@1.0.29';
import { createAnthropic } from 'https://esm.sh/@ai-sdk/anthropic@2.0.70';
import { createProviderRegistry, type ProviderRegistryProvider } from 'https://esm.sh/ai@5.0.110';
import { APICallError, LanguageModelV2 } from 'https://esm.sh/@ai-sdk/provider@2.0.1';

// 环境变量解析配置
interface ModelProviderConfig {
  index: number;
  apiKey: string;
  apiBase: string;
  provider: string; // openai, anthropic, google, etc.
  models: string[];
}

interface ParsedProvider {
  name: string;
  config: ModelProviderConfig;
}

type Model = LanguageModelV2;

type ModelManager<T extends Model> = <R>(callback: (model: T) => Promise<R>) => Promise<R>;

interface ModelState<T> {
  model: T;
  score: number;
}

/**
 * 从环境变量动态解析所有 Model Provider 配置
 * 支持 MODEL_PROVIDER_1_*, MODEL_PROVIDER_2_*, ... 格式
 */
function parseModelProvidersFromEnv(): ParsedProvider[] {
  const providers: ParsedProvider[] = [];
  const env = Deno.env.toObject();

  // 查找所有 provider 索引
  const providerIndices = new Set<number>();
  const providerPattern = /^MODEL_PROVIDER_(\d+)_/;

  for (const key of Object.keys(env)) {
    const match = key.match(providerPattern);
    if (match) {
      providerIndices.add(parseInt(match[1], 10));
    }
  }

  // 按索引排序并解析配置
  const sortedIndices = Array.from(providerIndices).sort((a, b) => a - b);

  for (const index of sortedIndices) {
    const prefix = `MODEL_PROVIDER_${index}_`;
    const apiKey = env[`${prefix}API_KEY`];
    const apiBase = env[`${prefix}API_BASE`];
    const provider = env[`${prefix}PROVIDER`] || 'openai';
    const modelsStr = env[`${prefix}MODELS`];

    // 跳过不完整的配置
    if (!apiKey || !apiBase || !modelsStr) {
      console.warn(`跳过不完整的 Provider ${index}: 缺少必要配置`);
      continue;
    }

    const models = modelsStr
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);

    providers.push({
      name: `p${index}`,
      config: {
        index,
        apiKey,
        apiBase,
        provider,
        models,
      },
    });
  }

  return providers;
}

/**
 * 根据 provider 类型创建对应的 SDK 实例
 * 可扩展支持 anthropic, google, mistral 等
 */
function createProviderInstance(
  providerType: string,
  apiKey: string,
  baseURL: string,
  name: string
) {
  switch (providerType.toLowerCase()) {
    case 'openai':
    case 'openai-compatible':
      return createOpenAICompatible({
        apiKey,
        baseURL,
        name,
        headers: {
          'User-Agent': 'curl/1.0',
        },
      });
    case 'anthropic':
      return createAnthropic({
        apiKey,
        baseURL,
        name,
        headers: { 'User-Agent': 'curl/1.0' },
      });

    default:
      // 默认使用 openai-compatible 格式
      console.warn(`未知的 provider 类型 "${providerType}"，使用 openai-compatible 格式`);
      return createOpenAICompatible({
        apiKey,
        baseURL,
        name,
        headers: {
          'User-Agent': 'curl/1.0',
        },
      });
  }
}

/**
 * 创建动态 Provider Registry
 */
function createDynamicProviderRegistry(providers: ParsedProvider[]): ProviderRegistryProvider {
  const registryConfig: Record<string, any> = {};

  for (const { name, config } of providers) {
    registryConfig[name] = createProviderInstance(
      config.provider,
      config.apiKey,
      config.apiBase,
      name
    );
  }

  return createProviderRegistry(registryConfig);
}

const modelManager = <T extends Model>(models: T[]): ModelManager<T> => {
  const states: ModelState<T>[] = models.map((model) => ({
    model,
    score: 1,
  }));

  return async (callback) => {
    let lastErr: unknown;

    // 按当前分数排序（分数小的优先，表示更可靠）
    const sortedStates = [...states].sort((a, b) => a.score - b.score);

    try {
      for (const state of sortedStates) {
        try {
          const result = await callback(state.model);
          console.log('[Call Model Success]', state.model.provider, state.model.modelId);
          // 成功：降低分数（提高优先级）
          state.score = Math.max(0.1, state.score * 0.7);
          return result;
        } catch (err) {
          console.error('[Call Model Failed]', state.model.provider, state.model.modelId);
          console.error((err as any).statusCode, (err as any).responseBody);
          // 失败：提高分数（降低优先级）
          state.score = Math.min(10, state.score * 1.5);
          lastErr = err;
          if (err instanceof APICallError && err.statusCode === 400) {
            throw err;
          }
          continue;
        }
      }
      throw lastErr ?? new Error('All models failed');
    } finally {
      for (const state of states) {
        state.score *= 0.9;
      }
      // sort by score
      states.sort((a, b) => a.score - b.score);
    }
  };
};

/**
 * Combines language models
 * @param models Models
 * @returns Combined model
 */
const combineLanguageModels = (models: LanguageModelV2[]): LanguageModelV2 => {
  const manager = modelManager(models);
  const supportedUrls = (async () => {
    const resolvedSupportedUrls = await Promise.all(models.map((model) => model.supportedUrls));
    return Object.fromEntries(resolvedSupportedUrls.flatMap((urls) => Object.entries(urls)));
  })();
  return {
    modelId: 'combined',
    provider: 'combined',
    specificationVersion: 'v2',
    supportedUrls,
    doGenerate(init) {
      return manager(async (model) => {
        const generated = await model.doGenerate(init);
        if (generated.finishReason === 'error') {
          throw new Error(`Model ${model.modelId} failed with error finish reason`);
        }
        return generated;
      });
    },
    doStream(options) {
      return manager(async (model) => {
        const response = await model.doStream(options);
        const [streamA, streamB] = response.stream.tee();
        response.stream = streamA;

        // test with first one
        const first = await streamB.getReader().read();
        if (first.value?.type === 'error') {
          throw null;
        }

        return response;
      });
    },
  };
};

const providers = parseModelProvidersFromEnv();
const registry = createDynamicProviderRegistry(providers);

const combinedLanguageModel = combineLanguageModels(
  providers.flatMap((provider) =>
    provider.config.models.map((model) => registry.languageModel(`${provider.name}:${model}`))
  )
);

export { registry, combinedLanguageModel };
