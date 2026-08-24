/**
 * Serviço de Webhooks — entrega inline (MVP).
 * Em produção, mover para fila (Redis/BullMQ/SQS).
 */

import { createHmac, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

const RETRY_DELAYS_MS = [
  60 * 1000, // 1 min
  5 * 60 * 1000, // 5 min
  30 * 60 * 1000, // 30 min
  2 * 60 * 60 * 1000, // 2 horas
];

function sign(secret: string, body: string) {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

export const webhookService = {
  /**
   * Despacha um evento para todos os webhooks ativos que escutam o evento.
   * Persiste cada tentativa em WebhookDelivery para auditoria e retry.
   */
  async dispatch(workspaceId: string, event: string, data: unknown) {
    const webhooks = await prisma.webhook.findMany({
      where: {
        workspaceId,
        active: true,
      },
    });

    const matched = webhooks.filter((w) => {
      try {
        const events = JSON.parse(w.events) as string[];
        return Array.isArray(events) && events.includes(event);
      } catch {
        return false;
      }
    });

    const eventId = randomUUID();
    const payload = JSON.stringify({
      id: eventId,
      event,
      createdAt: new Date().toISOString(),
      workspaceId,
      data,
    });

    await Promise.all(
      matched.map((w) => this.deliver(w.id, w.url, w.secret, event, eventId, payload)),
    );
  },

  async deliver(
    webhookId: string,
    url: string,
    secret: string,
    event: string,
    eventId: string,
    payload: string,
  ) {
    const signature = sign(secret, payload);
    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookId,
        eventId,
        event,
        payload,
        status: "PENDING",
        attempts: 0,
      },
    });

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event": event,
          "X-Webhook-Delivery": delivery.id,
          "User-Agent": "SistemaProjetos-Webhook/1.0",
        },
        body: payload,
        signal: AbortSignal.timeout(10_000),
      });

      const ok = res.status >= 200 && res.status < 300;
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: ok ? "SUCCESS" : "FAILED",
          statusCode: res.status,
          attempts: 1,
          lastAttemptAt: new Date(),
          nextAttemptAt: ok ? null : new Date(Date.now() + RETRY_DELAYS_MS[0]),
          errorMessage: ok ? null : `HTTP ${res.status}`,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "FAILED",
          attempts: 1,
          lastAttemptAt: new Date(),
          nextAttemptAt: new Date(Date.now() + RETRY_DELAYS_MS[0]),
          errorMessage: message,
        },
      });
    }
  },

  /** Gera um segredo novo para o webhook. */
  generateSecret() {
    return "whsec_" + randomUUID().replace(/-/g, "");
  },
};
