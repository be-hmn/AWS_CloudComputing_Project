export const ROLE = Object.freeze({
  MENTEE: 'MENTEE',
  MENTOR: 'MENTOR',
  ADMIN: 'ADMIN',
});

export const ROLES = Object.values(ROLE);

export function isValidRole(value) {
  return ROLES.includes(value);
}
