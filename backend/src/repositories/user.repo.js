import { store, seq } from '../store/memoryStore.js';

export const userRepo = {
  findByEmail(email) {
    for (const u of store.users.values()) {
      if (u.email === email) return u;
    }
    return null;
  },

  findById(id) {
    return store.users.get(Number(id)) ?? null;
  },

  insert({ email, password_hash, role, name }) {
    if (this.findByEmail(email)) {
      const err = new Error('EMAIL_TAKEN');
      err.code = 'EMAIL_TAKEN';
      throw err;
    }
    const id = seq.users.next();
    const row = {
      id,
      email,
      password_hash,
      role,
      name,
      created_at: new Date().toISOString(),
    };
    store.users.set(id, row);
    return row;
  },

  list() {
    return Array.from(store.users.values());
  },
};
