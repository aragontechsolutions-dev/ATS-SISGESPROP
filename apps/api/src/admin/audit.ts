import type { Prisma } from '../generated/prisma/client.ts';

/** Cliente de transacción de Prisma (para auditar dentro de la misma transacción que el cambio). */
export type Tx = Prisma.TransactionClient;

/** Convierte Decimal/Date/BigInt a valores JSON serializables. */
function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(
    JSON.stringify(value, (_k, v: unknown) => (typeof v === 'bigint' ? v.toString() : v)),
  ) as Prisma.InputJsonValue;
}

/**
 * Registra un cambio del panel en audit_log (tabla de solo inserción).
 * Se llama SIEMPRE dentro de la misma transacción que el cambio: o se guardan
 * ambos o ninguno.
 */
export async function audit(
  tx: Tx,
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
  before: unknown,
  after: unknown,
): Promise<void> {
  await tx.auditLog.create({
    data: { actorId, action, entity, entityId, beforeData: toJson(before), afterData: toJson(after) },
  });
}
