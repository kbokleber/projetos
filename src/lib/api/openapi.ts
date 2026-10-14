/**
 * Especificação OpenAPI 3.1 — escrita manualmente para manter zero deps.
 * Foco nos endpoints REST sob /api/v1/.
 */

const server = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

const API_GUIDE = `
## Guia para integrações e IAs

### Autenticação
Envie o header: \`Authorization: Bearer pk_live_...\`  
Token gerado em **/settings/api**.

### Escopos obrigatórios
| Ação | Escopo |
|------|--------|
| Listar/ler projetos | \`projects:read\` |
| Criar/editar projetos | \`projects:write\` |
| Listar/ler tarefas | \`tasks:read\` |
| **Criar / editar (PATCH) / mover / arquivar tarefas** | **\`tasks:write\`** |
| Listar/ler ATAs e reuniões | \`meetings:read\` |
| **Criar / editar / excluir ATAs** | **\`meetings:write\`** |
| Listar membros do projeto | \`members:read\` |
| **Adicionar / remover / alterar papel de membros** | **\`members:write\`** |

Sem \`tasks:write\`, \`PATCH /tasks/{id}\` retorna **403** (Escopo insuficiente).  
Sem \`meetings:write\`, \`POST/PATCH/DELETE /meetings\` retorna **403**.

### Acesso a projetos
Listagens (\`GET /projects\`, tarefas, ATAs) retornam **apenas projetos em que o usuário do token é \`ProjectMember\`**, ou todos os projetos do workspace se for **OWNER/ADMIN** do workspace.  
Novos membros do workspace **não** entram automaticamente em todos os projetos — use \`POST /projects/{id}/members\`.

### Workspaces (importante)
Cada token tem um **workspace padrão**, mas o usuário do token pode atuar em **qualquer workspace** do qual seja membro (incluindo editar tarefas desses workspaces).

**Sempre** especifique o workspace ao criar projetos, se a instrução mencionar um workspace (ex.: "Projeto Cleartech"):

1. \`GET /workspaces\` — descubra \`id\`, \`name\` e \`slug\`
2. \`POST /projects\` com um destes campos:
   - \`workspaceSlug\` (recomendado) — ex.: \`"cleartech"\`
   - \`workspace\` — id, slug **ou nome** — ex.: \`"Projeto Cleartech"\`
   - \`workspaceId\` — CUID interno

### Exemplo: editar prioridade de uma tarefa
\`\`\`http
PATCH /tasks/{taskId}
Authorization: Bearer pk_live_...
Content-Type: application/json

{ "priority": "HIGH" }
\`\`\`

Outros campos opcionais no PATCH: \`title\`, \`description\`, \`dueDate\`, \`completed\`, \`columnId\`, \`archived\`, \`checklistItems\`, etc. Envie **apenas** o que deseja alterar.

### Checklist na tarefa
\`POST /tasks\` e \`PATCH /tasks/{id}\` aceitam \`checklistItems\`:

\`\`\`json
{
  "checklistItems": [
    { "description": "Validar DNS", "completed": false },
    { "description": "Atualizar registros", "completed": true }
  ]
}
\`\`\`

No PATCH, o array **substitui** a lista inteira. Use \`[]\` para limpar. O GET da tarefa retorna \`checklists[].items\`.

### Exemplo: criar projeto no Cleartech
\`\`\`http
POST /projects
Authorization: Bearer pk_live_...
Content-Type: application/json

{
  "name": "Site institucional",
  "workspaceSlug": "cleartech"
}
\`\`\`

### Listar projetos de um workspace
\`GET /projects?workspaceSlug=cleartech\`

### Contrato de resposta
- Sucesso: \`{ "success": true, "data": ... }\`
- Erro: \`{ "success": false, "error": { "code": "...", "message": "..." } }\`
`.trim();

export const openapiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Sistema de Projetos — API Pública",
    version: "1.5.0",
    description: API_GUIDE,
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
        description:
          "Crie um projeto no workspace indicado. Se a instrução citar um workspace (nome ou slug), envie workspaceSlug ou workspace — não omita.",
        properties: {
          name: {
            type: "string",
            description: "Nome do projeto (não confundir com nome do workspace).",
            example: "Site institucional",
          },
          workspaceSlug: {
            type: "string",
            description:
              'Slug do workspace (recomendado). Obtenha em GET /workspaces. Ex.: "cleartech" para o workspace "Projeto Cleartech".',
            example: "cleartech",
          },
          workspace: {
            type: "string",
            description:
              'Atalho: id, slug ou nome do workspace. Ex.: "Projeto Cleartech" ou "cleartech".',
            example: "Projeto Cleartech",
          },
          workspaceId: {
            type: "string",
            description: "ID interno do workspace (CUID). Alternativa ao slug.",
          },
          description: { type: "string", example: "Projeto criado via API / IA" },
          color: { type: "string", description: "#RRGGBB", example: "#0ea5e9" },
          icon: { type: "string" },
          status: {
            type: "string",
            enum: ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"],
            example: "ACTIVE",
          },
          startDate: { type: "string", format: "date-time" },
          dueDate: { type: "string", format: "date-time" },
        },
        examples: {
          comSlug: {
            summary: "Criar no Cleartech (slug)",
            value: {
              name: "Site institucional",
              workspaceSlug: "cleartech",
              description: "Projeto no workspace Projeto Cleartech",
              status: "ACTIVE",
            },
          },
          comNome: {
            summary: "Criar pelo nome do workspace",
            value: {
              name: "Site institucional",
              workspace: "Projeto Cleartech",
            },
          },
        },
      },
      Workspace: {
        type: "object",
        properties: {
          id: { type: "string", example: "clxyz..." },
          name: { type: "string", example: "Projeto Cleartech" },
          slug: {
            type: "string",
            example: "cleartech",
            description: "Use este valor em POST /projects como workspaceSlug",
          },
          description: { type: ["string", "null"] },
          projectCount: { type: "integer", example: 0 },
          isTokenDefault: {
            type: "boolean",
            description: "true se este é o workspace padrão do token",
          },
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
      ChecklistItemInput: {
        type: "object",
        required: ["description"],
        properties: {
          description: {
            type: "string",
            maxLength: 500,
            description: "Texto do item da lista de verificação",
          },
          completed: {
            type: "boolean",
            default: false,
            description: "Se o item já está concluído",
          },
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
          checklistItems: {
            type: "array",
            items: { $ref: "#/components/schemas/ChecklistItemInput" },
            description:
              "Itens da lista de verificação criados junto com a tarefa",
          },
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
          checklistItems: {
            type: "array",
            items: { $ref: "#/components/schemas/ChecklistItemInput" },
            description:
              "Quando enviado, substitui toda a lista de verificação. Use [] para limpar.",
          },
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
      Meeting: {
        type: "object",
        properties: {
          id: { type: "string" },
          projectId: { type: "string" },
          title: { type: "string" },
          type: { type: "string", enum: ["ATA", "DAILY", "HANDS_ON"] },
          heldAt: { type: "string", format: "date-time" },
          integrationId: {
            type: ["string", "null"],
            description: "ID externo (ex.: Granola)",
          },
          description: {
            type: "string",
            description: "HTML da ata (rich text)",
          },
          published: {
            type: "boolean",
            description: "Se true, há shared link público",
          },
          shareToken: { type: ["string", "null"] },
          createdBy: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateMeeting: {
        type: "object",
        required: ["projectId", "title", "heldAt"],
        properties: {
          projectId: { type: "string" },
          title: { type: "string" },
          type: {
            type: "string",
            enum: ["ATA", "DAILY", "HANDS_ON"],
            default: "ATA",
          },
          heldAt: { type: "string", format: "date-time" },
          integrationId: { type: ["string", "null"] },
          description: { type: "string", description: "HTML da reunião" },
          published: { type: "boolean", default: false },
          memberIds: {
            type: "array",
            items: { type: "string" },
            description: "IDs de membros do projeto",
          },
          guests: {
            type: "array",
            items: { type: "string" },
            description: "Nomes de convidados externos",
          },
        },
      },
      UpdateMeeting: {
        type: "object",
        properties: {
          title: { type: "string" },
          type: { type: "string", enum: ["ATA", "DAILY", "HANDS_ON"] },
          heldAt: { type: "string", format: "date-time" },
          integrationId: { type: ["string", "null"] },
          description: { type: "string" },
          published: { type: "boolean" },
          memberIds: { type: "array", items: { type: "string" } },
          guests: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  tags: [
    {
      name: "workspaces",
      description:
        "Liste workspaces antes de criar projetos. O campo `slug` deve ser enviado em POST /projects.",
    },
    {
      name: "projects",
      description:
        "CRUD de projetos. Ao criar, informe workspaceSlug ou workspace se o destino não for o padrão do token. Lista só projetos acessíveis ao usuário do token.",
    },
    {
      name: "members",
      description:
        "Membros do projeto. Requer `members:read` / `members:write`. O convidado precisa ser membro do workspace.",
    },
    { name: "boards" },
    { name: "columns" },
    { name: "tasks" },
    {
      name: "meetings",
      description:
        "ATAs e reuniões (ATA, Daily, Hands On). Requer escopos `meetings:read` / `meetings:write`.",
    },
    { name: "comments" },
  ],
  paths: {
    "/workspaces": {
      get: {
        tags: ["workspaces"],
        summary: "Lista workspaces do usuário do token",
        description:
          "Primeiro passo recomendado para IAs: descubra o `slug` (ex.: cleartech) e use-o em POST /projects como `workspaceSlug`. Inclui `isTokenDefault` e `defaultWorkspaceId`.",
        operationId: "listWorkspaces",
        responses: {
          "200": {
            description: "Lista de workspaces",
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
                            data: {
                              type: "array",
                              items: { $ref: "#/components/schemas/Workspace" },
                            },
                            defaultWorkspaceId: { type: "string" },
                          },
                        },
                      },
                    },
                  ],
                },
                example: {
                  success: true,
                  data: {
                    data: [
                      {
                        id: "clws1",
                        name: "Empresa Demo",
                        slug: "empresa-demo",
                        projectCount: 2,
                        isTokenDefault: true,
                      },
                      {
                        id: "clws2",
                        name: "Projeto Cleartech",
                        slug: "cleartech",
                        projectCount: 0,
                        isTokenDefault: false,
                      },
                    ],
                    defaultWorkspaceId: "clws1",
                  },
                },
              },
            },
          },
        },
      },
    },
    "/projects": {
      get: {
        tags: ["projects"],
        summary: "Lista projetos",
        description:
          "Por padrão lista o workspace do token. Filtre com workspaceSlug=cleartech (ou workspace / workspaceId).",
        operationId: "listProjects",
        parameters: [
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "search", in: "query", schema: { type: "string" } },
          {
            name: "workspaceSlug",
            in: "query",
            schema: { type: "string", example: "cleartech" },
            description: 'Filtra por slug, ex.: "cleartech"',
          },
          {
            name: "workspace",
            in: "query",
            schema: { type: "string", example: "Projeto Cleartech" },
            description: "id, slug ou nome do workspace",
          },
          { name: "workspaceId", in: "query", schema: { type: "string" } },
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
        operationId: "createProject",
        description:
          'OBRIGATÓRIO quando a instrução citar um workspace: envie workspaceSlug (ex.: "cleartech") ou workspace (ex.: "Projeto Cleartech"). Sem isso, usa o workspace padrão do token.',
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateProject" },
              examples: {
                cleartechSlug: {
                  summary: "Cleartech via slug",
                  value: {
                    name: "Site institucional",
                    workspaceSlug: "cleartech",
                    description: "Criado pela IA no workspace Projeto Cleartech",
                    status: "ACTIVE",
                  },
                },
                cleartechNome: {
                  summary: "Cleartech via nome",
                  value: {
                    name: "Site institucional",
                    workspace: "Projeto Cleartech",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Projeto criado (inclui workspace.id/name/slug na resposta)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Success" },
                example: {
                  success: true,
                  data: {
                    id: "clproj1",
                    name: "Site institucional",
                    workspaceId: "clws2",
                    workspace: {
                      id: "clws2",
                      name: "Projeto Cleartech",
                      slug: "cleartech",
                    },
                  },
                },
              },
            },
          },
          "404": {
            description: "Workspace não encontrado ou sem acesso",
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
    "/projects/{projectId}/members": {
      parameters: [
        {
          name: "projectId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      get: {
        tags: ["members"],
        summary: "Lista membros do projeto",
        description: "Requer `members:read` e acesso ao projeto.",
        operationId: "listProjectMembers",
        responses: { "200": { description: "Lista de ProjectMember" } },
      },
      post: {
        tags: ["members"],
        summary: "Adiciona ou atualiza membro do projeto",
        description:
          "Requer `members:write`. Informe `email` ou `userId`. O usuário precisa ser membro do workspace. Papéis: ADMIN, MEMBER, VIEWER.",
        operationId: "addProjectMember",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  userId: { type: "string" },
                  role: {
                    type: "string",
                    enum: ["ADMIN", "MEMBER", "VIEWER"],
                    default: "MEMBER",
                  },
                },
              },
              examples: {
                byEmail: {
                  summary: "Vincular por email",
                  value: { email: "dev@empresa.com", role: "MEMBER" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Membro vinculado" },
          "400": { description: "Usuário fora do workspace" },
          "403": { description: "Sem permissão para gerenciar membros" },
        },
      },
    },
    "/projects/{projectId}/members/{userId}": {
      parameters: [
        {
          name: "projectId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
        {
          name: "userId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      patch: {
        tags: ["members"],
        summary: "Altera papel do membro",
        description: "Requer `members:write`. Papéis: ADMIN, MEMBER, VIEWER.",
        operationId: "updateProjectMember",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["role"],
                properties: {
                  role: {
                    type: "string",
                    enum: ["ADMIN", "MEMBER", "VIEWER"],
                  },
                },
              },
            },
          },
        },
        responses: { "200": { description: "OK" } },
      },
      delete: {
        tags: ["members"],
        summary: "Remove membro do projeto",
        description: "Requer `members:write`. Não remove o último OWNER.",
        operationId: "removeProjectMember",
        responses: { "204": { description: "Sem conteúdo" } },
      },
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
          "Requer `tasks:write`. Aceita `checklistItems` para criar a lista de verificação na mesma chamada. Suporta o header `Idempotency-Key`.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateTask" },
              example: {
                projectId: "cmproj",
                boardId: "cmboard",
                columnId: "cmcol",
                title: "Migrar DNS",
                checklistItems: [
                  { description: "Validar zona atual", completed: false },
                  { description: "Atualizar registros A", completed: false },
                ],
              },
            },
          },
        },
        responses: { "201": { description: "Tarefa criada (inclui checklists)" } },
      },
    },
    "/tasks/{taskId}": {
      parameters: [{ name: "taskId", in: "path", required: true, schema: { type: "string" } }],
      get: {
        tags: ["tasks"],
        summary: "Detalhe de tarefa",
        description:
          "Requer escopo `tasks:read`. Inclui `checklists` com `items`.",
        responses: { "200": { description: "OK" } },
      },
      patch: {
        tags: ["tasks"],
        summary: "Atualiza tarefa (parcial)",
        description:
          "Requer escopo `tasks:write`. Envie só os campos a alterar. `checklistItems` substitui toda a lista de verificação.",
        operationId: "updateTask",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateTask" },
              examples: {
                priority: {
                  summary: "Alterar prioridade",
                  value: { priority: "HIGH" },
                },
                titleAndDue: {
                  summary: "Título e prazo",
                  value: {
                    title: "Revisar proposta",
                    dueDate: "2026-09-15T18:00:00.000Z",
                  },
                },
                complete: {
                  summary: "Marcar como concluída",
                  value: { completed: true },
                },
                checklist: {
                  summary: "Substituir checklist",
                  value: {
                    checklistItems: [
                      { description: "Item A", completed: true },
                      { description: "Item B", completed: false },
                    ],
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Tarefa atualizada" },
          "403": {
            description:
              "Escopo insuficiente (falta tasks:write) ou sem acesso ao workspace da tarefa",
          },
        },
      },
      delete: {
        tags: ["tasks"],
        summary: "Arquiva tarefa",
        description: "Requer escopo `tasks:write`.",
        responses: { "204": { description: "OK" } },
      },
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
    "/meetings": {
      get: {
        tags: ["meetings"],
        summary: "Lista ATAs e reuniões",
        description:
          "Requer `meetings:read`. Filtre por `projectId`, `type`, `published`, `integrationId` (Granola) ou `search`.",
        operationId: "listMeetings",
        parameters: [
          { name: "projectId", in: "query", schema: { type: "string" } },
          {
            name: "type",
            in: "query",
            schema: { type: "string", enum: ["ATA", "DAILY", "HANDS_ON"] },
          },
          {
            name: "published",
            in: "query",
            schema: { type: "string", enum: ["true", "false"] },
          },
          { name: "integrationId", in: "query", schema: { type: "string" } },
          { name: "search", in: "query", schema: { type: "string" } },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 50, maximum: 100 },
          },
          { name: "cursor", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "OK" } },
      },
      post: {
        tags: ["meetings"],
        summary: "Cria ATA / reunião",
        description: "Requer `meetings:write`.",
        operationId: "createMeeting",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateMeeting" },
              example: {
                projectId: "cmxxxxxxxx",
                title: "Service IT - Transição GLPI",
                type: "ATA",
                heldAt: "2026-09-30T14:00:00.000Z",
                integrationId: "granola_abc123",
                description: "<h2>Resumo</h2><p>Discussão…</p>",
                published: false,
                memberIds: [],
                guests: ["Vanessa", "Angelo"],
              },
            },
          },
        },
        responses: { "201": { description: "Reunião criada" } },
      },
    },
    "/meetings/{meetingId}": {
      parameters: [
        {
          name: "meetingId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      get: {
        tags: ["meetings"],
        summary: "Detalhe da ATA / reunião",
        description: "Requer `meetings:read`.",
        operationId: "getMeeting",
        responses: { "200": { description: "OK" } },
      },
      patch: {
        tags: ["meetings"],
        summary: "Atualiza ATA / reunião (parcial)",
        description:
          "Requer `meetings:write`. Envie só os campos a alterar. Se enviar `memberIds` ou `guests`, a lista de participantes é substituída.",
        operationId: "updateMeeting",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateMeeting" },
            },
          },
        },
        responses: {
          "200": { description: "Reunião atualizada" },
          "403": { description: "Escopo insuficiente ou sem acesso" },
        },
      },
      delete: {
        tags: ["meetings"],
        summary: "Exclui ATA / reunião",
        description: "Requer `meetings:write`.",
        operationId: "deleteMeeting",
        responses: { "204": { description: "Sem conteúdo" } },
      },
    },
  },
} as const;
