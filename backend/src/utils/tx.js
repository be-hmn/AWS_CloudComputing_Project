/**
 * mysql2 풀에서 커넥션을 빌려 트랜잭션을 실행한다.
 * - 콜백이 정상 반환하면 commit
 * - 예외가 발생하면 rollback 후 다시 throw
 * - 어느 경로든 마지막에 release 보장
 *
 * V2 에서 repositories 를 DB 로 전환할 때 services 에서 활용한다.
 */
export async function withTransaction(pool, fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (e) {
    try {
      await conn.rollback();
    } catch {
      // rollback 실패는 무시하고 원본 에러를 우선 전파
    }
    throw e;
  } finally {
    conn.release();
  }
}
