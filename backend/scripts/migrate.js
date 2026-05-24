/**
 * 마이그레이션 실행 스크립트
 * - migrations/*.sql 을 순차 적용한다.
 * - SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD 가 설정되어 있으면 ADMIN 시드 계정을 생성/갱신한다.
 *
 * 사용:
 *   npm run migrate
 *
 * V1 (인메모리) 에서는 본 스크립트를 실행할 필요가 없다.
 * V2 에서 RDS for MySQL 로 전환할 때 사용한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

import { env } from '../src/config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    multipleStatements: true,
  });

  try {
    const migrationsDir = path.resolve(__dirname, '..', 'migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      // eslint-disable-next-line no-console
      console.log(`[migrate] 적용 중: ${file}`);
      await conn.query(sql);
    }

    if (env.SEED_ADMIN_EMAIL && env.SEED_ADMIN_PASSWORD) {
      const name = env.SEED_ADMIN_NAME || '관리자';
      const hash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, env.BCRYPT_ROUNDS);
      await conn.query(
        `INSERT INTO users (email, password_hash, role, name)
         VALUES (?, ?, 'ADMIN', ?)
         ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), name = VALUES(name)`,
        [env.SEED_ADMIN_EMAIL, hash, name],
      );
      // eslint-disable-next-line no-console
      console.log(`[migrate] 시드 ADMIN 생성/갱신: ${env.SEED_ADMIN_EMAIL}`);
    }

    // eslint-disable-next-line no-console
    console.log('[migrate] 완료');
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('[migrate] 실패:', e);
  process.exit(1);
});
