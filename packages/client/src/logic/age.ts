// "3 years old", "8 months old", "2 weeks old", from a "YYYY-MM-DD" birth date
export function ageFrom(birthDate: string, today = new Date()) {
  const [year, month, day] = birthDate.split("-").map(Number);
  let months =
    (today.getFullYear() - year) * 12 + (today.getMonth() + 1 - month);
  if (today.getDate() < day) months -= 1;
  if (months >= 24) {
    const years = Math.floor(months / 12);
    return `${years} years old`;
  }
  if (months >= 1) return `${months} ${months === 1 ? "month" : "months"} old`;
  const born = new Date(year, month - 1, day);
  const days = Math.max(
    0,
    Math.floor((today.getTime() - born.getTime()) / (24 * 60 * 60 * 1000)),
  );
  const weeks = Math.floor(days / 7);
  if (weeks >= 1) return `${weeks} ${weeks === 1 ? "week" : "weeks"} old`;
  return days === 1 ? "1 day old" : `${days} days old`;
}
