/**
 * Especificação OpenAPI 3.1 — escrita manualmente para manter zero deps.
 * Foco nos endpoints REST sob /api/v1/.
 */

const server = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export const openapiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Sistema de Projetos — API Pública",
    version: "1.0.0",
    description:
      "API pública para integrações externas consumirem e operarem projetos, tarefas, comentários e webhooks.",
  },
  servers: [{ url: `${server}/api/v1`, description: "Servidor atual" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description:
          "Token no formato `pk_live_xxxxxxxx`. Envie via `Authorization: Bearer <token>`.",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          success: { type: "boolean", enum: [false] },
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
            },
            required: ["code", "message"],
          },
        },
        required: ["success", "error"],
      },
      Success: {
        type: "object",
        properties: {
          success: { type: "boolean", enum: [true] },
          data: {},
        },
        required: ["success", "data"],
      },
      Project: {
        type: "object",
        properties: {
          id: { type: "string" },
          workspaceId: { type: "string" },
          name: { type: "string" },
          description: { type: ["string", "null"] },
          color: { type: ["string", "null"] },
          icon: { type: ["string", "null"] },
          status: {
            type: "string",
            enum: ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"],
          },
          startDate: { type: ["string", "null"], format: "date-time" },
          dueDate: { type: ["string", "null"], format: "date-time" },
          createdBy: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          archivedAt: { type: ["string", "null"], format: "date-time" },
        },
      },
      Task: {
        type: "object",
        properties: {
          id: { type: "string" },
          projectId: { type: "string" },
          boardId: { type: "string" },
          columnId: { type: "string" },
          title: { type: "string" },
          description: { type: ["string", "null"] },
          position: { type: "number" },
          priority: {
            type: "string",
            enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
          },
          startDate: { type: ["string", "null"], format: "date-time" },
          dueDate: { type: ["string", "null"], format: "date-time" },
          estimatedHours: { type: ["number", "null"] },
          externalId: { type: ["string", "null"] },
          externalSource: { type: ["string", "null"] },
          completedAt: { type: ["string", "null"], format: "date-time" },
          archivedAt: { type: ["string", "null"], format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Pagination: {
        type: "object",
        properties: {
          nextCursor: { type: ["string", "null"] },
          hasMore: { type: "boolean" },
        },
      },
      CreateProject: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          color: { type: "string", description: "#RRGGBB" },
          icon: { type: "string" },
          status: { type: "string", enum: ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] },
          startDate: { type: "string", format: "date-time" },
          dueDate: { type: "string", format: "date-time" },
        },
      },
      UpdateProject: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          color: { type: "string" },
          icon: { type: "string" },
          status: { type: "string", enum: ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] },
          startDate: { type: "string", format: "date-time" },
          dueDate: { type: "string", format: "date-time" },
          archived: { type: "boolean" },
        },
      },
      CreateTask: {
        type: "object",
        required: ["projectId", "boardId", "columnId", "title"],
        properties: {
          projectId: { type: "string" },
          boardId: { type: "string" },
          columnId: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
          startDate: { type: "string", format: "date-time" },
          dueDate: { type: "string", format: "date-time" },
          estimatedHours: { type: "number" },
          position: { type: "number" },
          externalId: { type: "string" },
          externalSource: { type: "string" },
          assigneeIds: { type: "array", items: { type: "string" } },
        },
      },
      UpdateTask: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
          startDate: { type: "string", format: "date-time" },
          dueDate: { type: "string", format: "date-time" },
          estimatedHours: { type: "number" },
          columnId: { type: "string" },
          position: { type: "number" },
          completed: { type: "boolean" },
          archived: { type: "boolean" },
          externalId: { type: "string" },
          externalSource: { type: "string" },
        },
      },
      MoveTask: {
        type: "object",
        required: ["columnId", "position"],
        properties: {
          columnId: { type: "string" },
          position: { type: "number" },
        },
      },
      Comment: {
        type: "object",
        properties: {
          id: { type: "string" },
          taskId: { type: "string" },
          userId: { type: "string" },
          content: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  tags: [
    { name: "projects" },
    { name: "boards" },
    { name: "columns" },
    { name: "tasks" },
    { name: "comments" },
  ],
  paths: {
    "/projects": {
      get: {
        tags: ["projects"],
        summary: "Lista projetos",
        parameters: [
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50, maximum: 100 } },
          { name: "cursor", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Lista paginada",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/Success" },
                    {
                      type: "object",
                      properties: {
                        data: {
                          type: "object",
                          properties: {
                            data: { type: "array", items: { $ref: "#/components/schemas/Project" } },
                            pagination: { $ref: "#/components/schemas/Pagination" },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["projects"],
        summary: "Cria projeto",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateProject" } } },
        },
        responses: {
          "201": {
            description: "Projeto criado",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } },
          },
        },
      },
    },
    "/projects/{projectId}": {
      parameters: [{ name: "projectId", in: "path", required: true, schema: { type: "string" } }],
      get: { tags: ["projects"], summary: "Detalhe de projeto", responses: { "200": { description: "OK" } } },
      patch: {
        tags: ["projects"],
        summary: "Atualiza projeto",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateProject" } } } },
        responses: { "200": { description: "OK" } },
      },
      delete: { tags: ["projects"], summary: "Arquiva projeto", responses: { "204": { description: "Sem conteúdo" } } },
    },
    "/tasks": {
      get: {
        tags: ["tasks"],
        summary: "Lista tarefas com filtros",
        parameters: [
          { name: "projectId", in: "query", schema: { type: "string" } },
          { name: "boardId", in: "query", schema: { type: "string" } },
          { name: "columnId", in: "query", schema: { type: "string" } },
          { name: "assigneeId", in: "query", schema: { type: "string" } },
          { name: "priority", in: "query", schema: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] } },
          { name: "labelId", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["OPEN", "COMPLETED", "ARCHIVED"] } },
          { name: "dueBefore", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "dueAfter", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "externalSource", in: "query", schema: { type: "string" } },
          { name: "externalId", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50, maximum: 100 } },
          { name: "cursor", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "OK" } },
      },
      post: {
        tags: ["tasks"],
        summary: "Cria tarefa",
        description:
          "Suporta o header `Idempotency-Key` para evitar duplicações em retries do cliente.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateTask" } } },
        },
        responses: { "201": { description: "Tarefa criada" } },
      },
    },
    "/tasks/{taskId}": {
      parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string" } }],
      get: { tags: ["tasks"], summary: "Detalhe de tarefa", responses: { "200": { description: "OK" } } },
      patch: {
        tags: ["tasks"],
        summary: "Atualiza tarefa",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateTask" } } } },
        responses: { "200": { description: "OK" } },
      },
      delete: { tags: ["tasks"], summary: "Arquiva tarefa", responses: { "204": { description: "OK" } } },
    },
    "/tasks/{taskId}/move": {
      parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string" } }],
      post: {
        tags: ["tasks"],
        summary: "Move tarefa para outra coluna/posição",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/MoveTask" } } } },
        responses: { "200": { description: "OK" } },
      },
    },
    "/tasks/{taskId}/assignees": {
      parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string" } }],
      post: {
        tags: ["tasks"],
        summary: "Adiciona responsável",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["userId"], properties: { userId: { type: "string" } } },
            },
          },
        },
        responses: { "201": { description: "OK" } },
      },
    },
    "/tasks/{taskId}/assignees/{userId}": {
      parameters: [
        { name: "taskId", in: "path", required: true, schema: { type: "string" } },
        { name: "userId", in: "path", required: true, schema: { type: "string" } },
      ],
      delete: { tags: ["tasks"], summary: "Remove responsável", responses: { "200": { description: "OK" } } },
    },
    "/tasks/{taskId}/comments": {
      parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string" } }],
      get: { tags: ["comments"], summary: "Lista comentários", responses: { "200": { description: "OK" } } },
      post: {
        tags: ["comments"],
        summary: "Adiciona comentário",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["content"], properties: { content: { type: "string" } } },
            },
          },
        },
        responses: { "201": { description: "OK" } },
      },
    },
  },
} as const;
