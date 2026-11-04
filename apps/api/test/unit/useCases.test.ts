import { describe, expect, it } from "vitest";
import type { PasswordHasher } from "../../src/application/ports/PasswordHasher.js";
import { DeleteNote } from "../../src/application/note/DeleteNote.js";
import { UpdateNote } from "../../src/application/note/UpdateNote.js";
import { LogInUser } from "../../src/application/user/LogInUser.js";
import { RegisterUser } from "../../src/application/user/RegisterUser.js";
import type { NoteRepository } from "../../src/domain/note/NoteRepository.js";
import { NoteNotFoundError } from "../../src/domain/note/errors.js";
import type { User } from "../../src/domain/user/User.js";
import type {
  NewUser,
  UserRepository,
} from "../../src/domain/user/UserRepository.js";
import {
  EmailTakenError,
  InvalidCredentialsError,
  UsernameTakenError,
} from "../../src/domain/user/errors.js";
import { note } from "../fixtures/notes.js";

// Fakes: use cases only know the interfaces, so tests can swap in simple in-memory versions
const plainHasher: PasswordHasher = {
  hash: async (password) => `hashed:${password}`,
  compare: async (password, hash) => hash === `hashed:${password}`,
};

function fakeUsers(existing: User[] = []): UserRepository & { all: User[] } {
  const all = [...existing];
  return {
    all,
    findById: async (id) => all.find((u) => u.id === id) ?? null,
    findByUsername: async (username) =>
      all.find((u) => u.username === username) ?? null,
    findByEmail: async (email) => all.find((u) => u.email === email) ?? null,
    create: async (user: NewUser) => {
      const created = {
        ...user,
        id: `u${all.length + 1}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      all.push(created);
      return created;
    },
  };
}

const maria: User = {
  id: "u1",
  username: "maria",
  email: "maria@example.com",
  passwordHash: "hashed:password123",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("RegisterUser", () => {
  it("hashes the password and stores lowercase logins", async () => {
    const users = fakeUsers();
    await new RegisterUser(users, plainHasher).execute({
      username: " Ben ",
      email: "Ben@X.com",
      password: "pw-12345",
    });
    expect(users.all[0]).toMatchObject({
      username: "ben",
      email: "ben@x.com",
      passwordHash: "hashed:pw-12345",
    });
  });

  it("refuses a taken username or email", async () => {
    const register = new RegisterUser(fakeUsers([maria]), plainHasher);
    await expect(
      register.execute({
        username: "maria",
        email: "new@x.com",
        password: "pw-12345",
      }),
    ).rejects.toThrow(UsernameTakenError);
    await expect(
      register.execute({
        username: "new",
        email: "maria@example.com",
        password: "pw-12345",
      }),
    ).rejects.toThrow(EmailTakenError);
  });
});

describe("LogInUser", () => {
  it("accepts the right password, by username or email", async () => {
    const logIn = new LogInUser(fakeUsers([maria]), plainHasher);
    expect(
      (await logIn.execute({ login: "maria", password: "password123" })).id,
    ).toBe("u1");
    expect(
      (
        await logIn.execute({
          login: "MARIA@example.com",
          password: "password123",
        })
      ).id,
    ).toBe("u1");
  });

  it("refuses a wrong password and an unknown user the same way", async () => {
    const logIn = new LogInUser(fakeUsers([maria]), plainHasher);
    await expect(
      logIn.execute({ login: "maria", password: "nope" }),
    ).rejects.toThrow(InvalidCredentialsError);
    await expect(
      logIn.execute({ login: "ghost", password: "nope" }),
    ).rejects.toThrow(InvalidCredentialsError);
  });
});

describe("notes that aren't yours", () => {
  // A repository that never finds the note: what Postgres answers for someone else's note
  const nobodysNotes: NoteRepository = {
    listByOwner: async () => [],
    findOwned: async () => null,
    create: async (userId, content) => note({ userId, ...content }),
    update: async () => null,
    delete: async () => false,
  };

  it("can't be updated or deleted", async () => {
    await expect(
      new UpdateNote(nobodysNotes).execute("n1", "u2", {
        title: "x",
        body: "",
      }),
    ).rejects.toThrow(NoteNotFoundError);
    await expect(
      new DeleteNote(nobodysNotes).execute("n1", "u2"),
    ).rejects.toThrow(NoteNotFoundError);
  });
});
