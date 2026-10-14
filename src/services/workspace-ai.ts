/**
 * Configuração de LLM OpenAI-compatible por workspace.
 */

import { AppError } from "@/lib/errors";
import { decryptSecret, encryptSecret } from "@/lib/secret-crypto";
import { prisma } from "@/lib/prisma";
import {
  resolveChatCompletionsUrl,
  testLlmConnection,
  type LlmConfig,
} from "@/lib/llm";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_PROVIDER = "openai";

export type WorkspaceAiPublicSettings = {
  configured: boolean;
  provider: string;
  baseUrl: string | null;
  model: string;
  apiKeyLast4: string | null;
  updatedAt: Date | null;
};

export type UpsertWorkspaceAiInput = {
  provider?: string;
  baseUrl?: string | null;
  model?: string;
  /** Se omitido/vazio e já existir chave, mantém a atual. */
  apiKey?: string | null;
};

function last4(key: string): string {
  const t = key.trim();
  if (t.length <= 4) return t;
  return t.slice(-4);
}

export const workspaceAiService = {
  async getPublicSettings(
    workspaceId: string,
  ): Promise<WorkspaceAiPublicSettings> {
    const row = await prisma.workspaceAiSettings.findUnique({
      where: { workspaceId },
      select: {
        provider: true,
        baseUrl: true,
        model: true,
        apiKeyLast4: true,
        updatedAt: true,
      },
    });

    if (!row) {
      return {
        configured: false,
        provider: DEFAULT_PROVIDER,
        baseUrl: null,
        model: DEFAULT_MODEL,
        apiKeyLast4: null,
        updatedAt: null,
      };
    }

    return {
      configured: true,
      provider: row.provider,
      baseUrl: row.baseUrl,
      model: row.model,
      apiKeyLast4: row.apiKeyLast4,
      updatedAt: row.updatedAt,
    };
  },

  /**
   * Carrega config descriptografada para chamadas LLM.
   * Falha com CONFIG_ERROR se o workspace não tiver chave.
   */
  async getLlmConfigForWorkspace(workspaceId: string): Promise<LlmConfig> {
    const row = await prisma.workspaceAiSettings.findUnique({
      where: { workspaceId },
    });

    if (!row?.apiKeyCiphertext) {
      throw new AppError(
        "CONFIG_ERROR",
        "IA não configurada neste workspace. Um OWNER ou ADMIN deve salvar a chave (OpenAI ou API compatível) em Configurações → IA (/settings/ai).",
        503,
      );
    }

    let apiKey: string;
    try {
      apiKey = decryptSecret(row.apiKeyCiphertext);
    } catch {
      throw new AppError(
        "CONFIG_ERROR",
        "Não foi possível descriptografar a chave de API. Verifique AUTH_SECRET ou salve a chave novamente.",
        503,
      );
    }

    const { baseUrl } = resolveChatCompletionsUrl(
      row.baseUrl?.trim() || DEFAULT_BASE_URL,
    );
    const model = row.model?.trim() || DEFAULT_MODEL;

    return { apiKey, baseUrl, model };
  },

  /**
   * Monta config a partir do formulário (usa chave nova ou a já salva)
   * e testa a conexão antes de persistir.
   */
  async buildAndTestConfig(
    workspaceId: string,
    input: UpsertWorkspaceAiInput,
  ): Promise<LlmConfig> {
    const existing = await prisma.workspaceAiSettings.findUnique({
      where: { workspaceId },
    });

    let apiKey = input.apiKey?.trim() || null;
    if (!apiKey && existing?.apiKeyCiphertext) {
      try {
        apiKey = decryptSecret(existing.apiKeyCiphertext);
      } catch {
        throw new AppError(
          "CONFIG_ERROR",
          "Não foi possível usar a chave salva. Informe a API key novamente.",
          503,
        );
      }
    }
    if (!apiKey) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Informe a API key para configurar a IA pela primeira vez.",
        400,
      );
    }

    const rawBase =
      input.baseUrl === undefined
        ? (existing?.baseUrl ?? DEFAULT_BASE_URL)
        : input.baseUrl?.trim() || DEFAULT_BASE_URL;
    const { baseUrl } = resolveChatCompletionsUrl(rawBase);
    const model = (input.model?.trim() || existing?.model || DEFAULT_MODEL).slice(
      0,
      120,
    );

    const config: LlmConfig = { apiKey, baseUrl, model };
    await testLlmConnection(config);
    return config;
  },

  async upsertSettings(
    workspaceId: string,
    userId: string,
    input: UpsertWorkspaceAiInput,
  ): Promise<WorkspaceAiPublicSettings> {
    const existing = await prisma.workspaceAiSettings.findUnique({
      where: { workspaceId },
    });

    const apiKey = input.apiKey?.trim() || null;
    if (!existing && !apiKey) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Informe a API key para configurar a IA pela primeira vez.",
        400,
      );
    }

    const provider = (input.provider?.trim() || DEFAULT_PROVIDER).slice(0, 64);
    const model = (input.model?.trim() || DEFAULT_MODEL).slice(0, 120);
    let baseUrl: string | null =
      input.baseUrl === undefined
        ? (existing?.baseUrl ?? null)
        : input.baseUrl?.trim()
          ? resolveChatCompletionsUrl(input.baseUrl.trim()).baseUrl
          : null;

    if (baseUrl && !/^https?:\/\//i.test(baseUrl)) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Base URL deve começar com http:// ou https://.",
        400,
      );
    }

    if (apiKey) {
      const ciphertext = encryptSecret(apiKey);
      const row = await prisma.workspaceAiSettings.upsert({
        where: { workspaceId },
        create: {
          workspaceId,
          provider,
          baseUrl,
          model,
          apiKeyCiphertext: ciphertext,
          apiKeyLast4: last4(apiKey),
          updatedById: userId,
        },
        update: {
          provider,
          baseUrl,
          model,
          apiKeyCiphertext: ciphertext,
          apiKeyLast4: last4(apiKey),
          updatedById: userId,
        },
      });
      return {
        configured: true,
        provider: row.provider,
        baseUrl: row.baseUrl,
        model: row.model,
        apiKeyLast4: row.apiKeyLast4,
        updatedAt: row.updatedAt,
      };
    }

    // Mantém chave; atualiza metadados
    const row = await prisma.workspaceAiSettings.update({
      where: { workspaceId },
      data: {
        provider,
        baseUrl,
        model,
        updatedById: userId,
      },
    });

    return {
      configured: true,
      provider: row.provider,
      baseUrl: row.baseUrl,
      model: row.model,
      apiKeyLast4: row.apiKeyLast4,
      updatedAt: row.updatedAt,
    };
  },

  async clearSettings(workspaceId: string): Promise<void> {
    await prisma.workspaceAiSettings.deleteMany({ where: { workspaceId } });
  },
};
