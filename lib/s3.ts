import { randomUUID } from "node:crypto";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials:
    process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY ?
      {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      }
    : undefined,
});

function getRequiredEnv(name: "S3_BUCKET" | "S3_PUBLIC_URL") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

export async function uploadProfileImage(params: {
  userId: string;
  contentType: string;
  file: Buffer;
}) {
  const bucket = getRequiredEnv("S3_BUCKET");
  const key = `profile-images/${params.userId}/${randomUUID()}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: params.file,
      ContentType: params.contentType,
    }),
  );

  const baseUrl = getRequiredEnv("S3_PUBLIC_URL").replace(/\/$/, "");

  return `${baseUrl}/${key}`;
}
