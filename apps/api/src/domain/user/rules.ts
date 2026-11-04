// "maria" logs in with a username, "maria@example.com" with an email
export function isEmail(login: string) {
  return login.includes("@");
}

// Usernames and emails are compared without capitals or surrounding spaces
export function normalizeLogin(value: string) {
  return value.trim().toLowerCase();
}
