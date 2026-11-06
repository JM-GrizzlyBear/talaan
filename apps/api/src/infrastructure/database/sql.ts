// "Juan Santos dela Cruz" from a users row (the middle name may be empty)
export function fullNameSql(alias: string) {
  return `concat_ws(' ', ${alias}.first_name, nullif(${alias}.middle_name, ''), ${alias}.last_name)`;
}
