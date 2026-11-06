// "m•••a@example.com": enough to recognise the address, not enough to read it off a screen
export function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  const shown =
    name.length <= 2 ? name[0] : `${name[0]}•••${name[name.length - 1]}`;
  return `${shown}@${domain}`;
}

// "Juan Santos dela Cruz", or "Juan dela Cruz" without a middle name
export function fullName(person: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
}) {
  return [person.firstName, person.middleName, person.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
}
