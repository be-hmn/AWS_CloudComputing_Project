import { z } from 'zod';
import { ROLE } from '../domain/role.js';

export const registerBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  // 회원가입에서는 일반 사용자만 허용. ADMIN 은 시드/관리자 발급.
  role: z.enum([ROLE.MENTEE, ROLE.MENTOR]),
  name: z.string().min(1).max(100),
});

export const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
