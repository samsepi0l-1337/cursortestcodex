import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/user_management";

// #region agent log
fetch("http://127.0.0.1:7610/ingest/74b7bc1e-f939-4f27-8b41-5c9f42196d92", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Debug-Session-Id": "40b523",
  },
  body: JSON.stringify({
    sessionId: "40b523",
    runId: "review-1",
    hypothesisId: "H5",
    location: "lib/prisma.ts:8",
    message: "prisma_connection_string_source",
    data: {
      usedFallback: !process.env.DATABASE_URL,
    },
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion

const adapter = new PrismaPg({ connectionString });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
