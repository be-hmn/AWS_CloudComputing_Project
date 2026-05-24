/**
 * S3 클라이언트 (정적 import).
 * 본 V1 의 file.service.js 는 S3_BUCKET 미설정 시 mock 응답을 위해 동적 import 를 사용한다.
 * 이 파일은 V2/통합 환경에서 일관된 클라이언트가 필요할 때 사용한다.
 */
import { S3Client } from '@aws-sdk/client-s3';
import { env } from './env.js';

export const s3 = new S3Client({ region: env.AWS_REGION });
export const BUCKET = env.S3_BUCKET;
