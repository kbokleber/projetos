import { withApi } from "@/lib/api/with-api";
import { apiOk } from "@/lib/api/response";
import { z } from "zod";
import { meetingService } from "@/services/meetings";
import { resolveMeetingAccessForApi } from "@/lib/api/resolve-workspace";
import { AppError } from "@/lib/errors";
import type { UpdateMeetingInput } from "@/services/meetings";
import {
  meetingParamsSchema,
  updateMeetingSchema,
} from "@/schemas/api";

export const dynamic = "force-dynamic";

export const GET = withApi(
  { requireScope: "meetings:read", paramsSchema: meetingParamsSchema },
  async ({ params, auth }) => {
    await resolveMeetingAccessForApi({
      userId: auth.userId,
      meetingId: params.meetingId,
    });
    if (!auth.userId) {
      throw new AppError("FORBIDDEN", "Usuário não associado ao token.", 403);
    }
    const meeting = await meetingService.getById(auth.userId, params.meetingId);
    return apiOk(meeting);
  },
);

export const PATCH = withApi(
  {
    requireScope: "meetings:write",
    paramsSchema: meetingParamsSchema,
    schema: updateMeetingSchema,
  },
  async ({ auth, params, body }) => {
    await resolveMeetingAccessForApi({
      userId: auth.userId,
      meetingId: params.meetingId,
    });
    if (!auth.userId) {
      throw new AppError("FORBIDDEN", "Usuário não associado ao token.", 403);
    }

    const data = body as z.infer<typeof updateMeetingSchema>;
    const patch: UpdateMeetingInput = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.type !== undefined) patch.type = data.type;
    if (data.heldAt !== undefined) patch.heldAt = new Date(data.heldAt);
    if (data.integrationId !== undefined) {
      patch.integrationId = data.integrationId;
    }
    if (data.description !== undefined) patch.description = data.description;
    if (data.published !== undefined) patch.published = data.published;
    if (data.memberIds !== undefined || data.guests !== undefined) {
      patch.participants = {
        memberIds: data.memberIds ?? [],
        guests: data.guests ?? [],
      };
    }

    const updated = await meetingService.update(
      auth.userId,
      params.meetingId,
      patch,
    );
    return apiOk(updated);
  },
);

export const DELETE = withApi(
  {
    requireScope: "meetings:write",
    paramsSchema: meetingParamsSchema,
  },
  async ({ auth, params }) => {
    await resolveMeetingAccessForApi({
      userId: auth.userId,
      meetingId: params.meetingId,
    });
    if (!auth.userId) {
      throw new AppError("FORBIDDEN", "Usuário não associado ao token.", 403);
    }
    await meetingService.remove(auth.userId, params.meetingId);
    return new Response(null, { status: 204 });
  },
);
