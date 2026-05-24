import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { AppError } from '../domain/errors.js';
import { ROLE } from '../domain/role.js';
import { userRepo } from '../repositories/user.repo.js';

function publicUser(u) {
  return { id: u.id, email: u.email, role: u.role, name: u.name };
}

export const authService = {
  async register({ email, password, role, name }) {
    if (role === ROLE.ADMIN) throw AppError.forbidden('ADMIN 계정은 직접 가입할 수 없습니다.');
    const password_hash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
    try {
      const user = userRepo.insert({ email, password_hash, role, name });
      return publicUser(user);
    } catch (e) {
      if (e.code === 'EMAIL_TAKEN') throw AppError.emailTaken();
      throw e;
    }
  },

  async login({ email, password }) {
    const user = userRepo.findByEmail(email);
    if (!user) throw AppError.loginFailed();
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw AppError.loginFailed();

    const token = jwt.sign(
      { sub: String(user.id), role: user.role, name: user.name },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN },
    );
    return { token, user: publicUser(user) };
  },

  /**
   * 서버 기동 시 호출. SEED_ADMIN_EMAIL/PASSWORD 가 있으면 계정 생성.
   */
  async seedAdmin() {
    if (!env.SEED_ADMIN_EMAIL || !env.SEED_ADMIN_PASSWORD) return null;
    if (userRepo.findByEmail(env.SEED_ADMIN_EMAIL)) return null;
    const password_hash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, env.BCRYPT_ROUNDS);
    return userRepo.insert({
      email: env.SEED_ADMIN_EMAIL,
      password_hash,
      role: ROLE.ADMIN,
      name: env.SEED_ADMIN_NAME,
    });
  },
};
