// The seeded users (password for both: PASSWORD). Fixed ids so tests can refer to them.
export const PASSWORD = "password123";

export const USERS = {
  maria: {
    id: "00000000-0000-4000-8000-000000000001",
    username: "maria",
    email: "maria@example.com",
  },
  ana: {
    id: "00000000-0000-4000-8000-000000000002",
    username: "ana",
    email: "ana@example.com",
  },
} as const;

export type SeededUsername = keyof typeof USERS;

// Someone signing up during a test (not in the seed data)
export const NEW_USER = {
  username: "ben",
  email: "ben@example.com",
  password: "a-good-password",
};
