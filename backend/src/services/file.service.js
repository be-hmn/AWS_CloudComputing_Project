import { randomUUID } from 'node:crypto';

import { env } from '../config/env.js';
import { AppError } from '../domain/errors.js';

let s3Client = null;
let getSignedUrl = null;
let PutObjectCommand = null;
let GetObjectCommand = null;

async function ensureS3() {
  if (!env.S3_BUCKET) return null;
  if (s3Client) return s3Client;
  const { S3Client, PutObjectCommand: P, GetObjectCommand: G } = await import(
    '@aws-sdk/client-s3'
  );
  const { getSignedUrl: gs } = await import('@aws-sdk/s3-request-presigner');
  s3Client = new S3Client({ region: env.AWS_REGION });
  PutObjectCommand = P;
  GetObjectCommand = G;
  getSignedUrl = gs;
  return s3Client;
}

function safeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

function buildKey({ kind, ownerId, contextId, filename }) {
  const id = randomUUID();
  if (kind === 'profile') return `profile/${ownerId}/${id}-${safeFilename(filename)}`;
  if (kind === 'record') return `record/${contextId}/${id}-${safeFilename(filename)}`;
  return `misc/${ownerId}/${id}-${safeFilename(filename)}`;
}

export const fileService = {
  async requestUploadUrl(user, body) {
    if (body.size > env.FILE_MAX_BYTES) throw AppError.fileTooLarge();
    if (!env.FILE_ALLOWED_MIME.includes(body.content_type)) throw AppError.fileTypeNotAllowed();
    if (body.kind === 'record' && !body.context_id) {
      throw AppError.validationFailed(['context_id']);
    }

    const key = buildKey({
      kind: body.kind,
      ownerId: user.id,
      contextId: body.context_id,
      filename: body.filename,
    });

    const client = await ensureS3();
    if (!client) {
      // S3 미설정 시 mock 응답 — 로컬 개발용.
      return {
        key,
        upload_url: `mock://upload/${key}`,
        expires_in: env.S3_PRESIGN_TTL_SECONDS,
        mock: true,
      };
    }

    const cmd = new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      ContentType: body.content_type,
    });
    const upload_url = await getSignedUrl(client, cmd, {
      expiresIn: env.S3_PRESIGN_TTL_SECONDS,
    });

    return { key, upload_url, expires_in: env.S3_PRESIGN_TTL_SECONDS };
  },

  /**
   * 권한 검증 없이 download URL 만 발급. 호출 측이 반드시 권한을 검증해야 한다.
   */
  async requestDownloadUrlByOwner(key) {
    const client = await ensureS3();
    if (!client) {
      return {
        download_url: `mock://download/${key}`,
        expires_in: env.S3_PRESIGN_TTL_SECONDS,
        mock: true,
      };
    }
    const cmd = new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key });
    const download_url = await getSignedUrl(client, cmd, {
      expiresIn: env.S3_PRESIGN_TTL_SECONDS,
    });
    return { download_url, expires_in: env.S3_PRESIGN_TTL_SECONDS };
  },
};
