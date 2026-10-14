/**
 * Cliente mínimo OpenAI-compatible (chat completions + JSON).
 * Funciona com OpenAI, MiniMax, Azure OpenAI (compat), Ollama, etc.
 * — desde que exponham POST /chat/completions com Bearer token.
 */

import { AppError } from "@/lib/errors";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmConfig = {
  apiKey: string;
  /** Sem barra final, ex.: https://api.openai.com/v1 ou https://api.minimax.io/v1 */
  baseUrl: string;
  model: string;
};

/** Normaliza base URL e monta o endpoint de chat completions. */
export function resolveChatCompletionsUrl(baseUrlInput: string): {
  baseUrl: string;
  endpoint: string;
} {
  let base = (baseUrlInput?.trim() || "https://api.openai.com/v1").replace(
    /\/+$/,
    "",
  );

  // Se colaram o endpoint completo, usa direto
  if (/\/chat\/completions$/i.test(base)) {
    const baseUrl = base.replace(/\/chat\/completions$/i, "");
    return { baseUrl, endpoint: base };
  }

  // Host MiniMax sem /v1 → corrige caminho comum que gera 404
  if (/^https?:\/\/api\.minimax\.io$/i.test(base)) {
    base = `${base}/v1`;
  }
  if (/^https?:\/\/api\.minimaxi\.com$/i.test(base)) {
    base = `${base}/v1`;
  }

  return { baseUrl: base, endpoint: `${base}/chat/completions` };
}

async function postChatCompletions(
  config: LlmConfig,
  body: Record<string, unknown>,
): Promise<Response> {
  const apiKey = config.apiKey?.trim();
  if (!apiKey) {
    throw new AppError(
      "CONFIG_ERROR",
      "API key da IA não configurada neste workspace.",
      503,
    );
  }

  const { endpoint } = resolveChatCompletionsUrl(
    config.baseUrl || "https://api.openai.com/v1",
  );

  return fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function upstreamError(status: number, body: string, endpoint: string) {
  const hint =
    status === 404
      ? ` URL chamada: ${endpoint}. Use a Base URL com /v1 (ex.: https://api.minimax.io/v1 ou https://api.openai.com/v1), sem /chat/completions.`
      : "";
  return new AppError(
    "UPSTREAM_ERROR",
    `Falha ao chamar o modelo (${status}). ${body.slice(0, 180)}${hint}`,
    502,
  );
}

/**
 * Testa Base URL + chave + modelo com uma chamada mínima.
 * Usado no cadastro da configuração do workspace.
 */
export async function testLlmConnection(config: LlmConfig): Promise<void> {
  const model = config.model?.trim() || "gpt-4o-mini";
  const { endpoint } = resolveChatCompletionsUrl(
    config.baseUrl || "https://api.openai.com/v1",
  );

  let res: Response;
  try {
    res = await postChatCompletions(config, {
      model,
      temperature: 0,
      max_tokens: 16,
      messages: [
        {
          role: "user",
          content: 'Responda apenas com a palavra OK.',
        },
      ],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro de rede";
    throw new AppError(
      "UPSTREAM_ERROR",
      `Não foi possível conectar ao provedor (${endpoint}): ${msg}`,
      502,
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw upstreamError(res.status, body, endpoint);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  if (!data.choices?.[0]?.message) {
    throw new AppError(
      "UPSTREAM_ERROR",
      "O provedor respondeu, mas sem choices no formato OpenAI. Verifique se a Base URL é a API compatível (…/v1).",
      502,
    );
  }
}

type ChatCompletionMessage = {
  content?: string | null | Array<{ type?: string; text?: string }>;
  /** Alguns modelos (ex. MiniMax thinking) separam raciocínio do texto final. */
  reasoning_content?: string | null;
};

function messageText(message: ChatCompletionMessage | undefined): string {
  if (!message) return "";
  const raw = message.content;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    return raw
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("");
  }
  return "";
}

/**
 * Extrai objeto JSON de respostas que vêm com markdown, texto extra ou thinking.
 */
export function parseJsonFromModelText(raw: string): unknown {
  let text = raw.trim();
  if (!text) {
    throw new AppError(
      "UPSTREAM_ERROR",
      "O modelo não retornou conteúdo.",
      502,
    );
  }

  // Remove fences ```json ... ``` / ``` ... ```
  const fence = text.match(/```(?:json|JSON)?\s*([\s\S]*?)```/);
  if (fence?.[1]) {
    text = fence[1].trim();
  }

  // Remove tags de thinking comuns
  text = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .trim();

  const tryParse = (candidate: string) => {
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      return undefined;
    }
  };

  const direct = tryParse(text);
  if (direct !== undefined) return direct;

  // Primeiro { … último } (objeto)
  const startObj = text.indexOf("{");
  const endObj = text.lastIndexOf("}");
  if (startObj !== -1 && endObj > startObj) {
    const sliced = tryParse(text.slice(startObj, endObj + 1));
    if (sliced !== undefined) return sliced;
  }

  // Array como fallback
  const startArr = text.indexOf("[");
  const endArr = text.lastIndexOf("]");
  if (startArr !== -1 && endArr > startArr) {
    const sliced = tryParse(text.slice(startArr, endArr + 1));
    if (sliced !== undefined) return sliced;
  }

  throw new AppError(
    "UPSTREAM_ERROR",
    "Resposta do modelo não é JSON válido. Tente de novo ou use um modelo que siga bem instruções de JSON.",
    502,
  );
}

/**
 * Chama o modelo pedindo resposta JSON.
 * Tenta response_format json_object; se o provedor rejeitar, repete sem ele.
 */
export async function chatJson(
  messages: ChatMessage[],
  config: LlmConfig,
): Promise<unknown> {
  const model = config.model?.trim() || "gpt-4o-mini";
  const { endpoint } = resolveChatCompletionsUrl(
    config.baseUrl || "https://api.openai.com/v1",
  );

  const reinforced: ChatMessage[] = [
    ...messages,
    {
      role: "user",
      content:
        "IMPORTANTE: responda SOMENTE com um único objeto JSON válido, sem markdown, sem ```, sem texto antes ou depois.",
    },
  ];

  async function call(withJsonFormat: boolean) {
    const body: Record<string, unknown> = {
      model,
      temperature: 0.2,
      messages: reinforced,
    };
    if (withJsonFormat) {
      body.response_format = { type: "json_object" };
    }
    return postChatCompletions(config, body);
  }

  let res = await call(true);
  if (!res.ok && (res.status === 400 || res.status === 422)) {
    // Provedores compatíveis (ex. alguns MiniMax) podem não aceitar response_format
    res = await call(false);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw upstreamError(res.status, body, endpoint);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: ChatCompletionMessage }>;
  };
  const content = messageText(data.choices?.[0]?.message).trim();
  return parseJsonFromModelText(content);
}
