import { Link } from "react-router";
import { dateLabel } from "./chartScale";
import { type RecordLink, recordPage } from "./recordLink";

const linkClass = "font-semibold text-brand underline-offset-2 hover:underline";

export function RecordDateLink({
  recordId,
  date,
  link = recordPage,
}: {
  recordId: string;
  date: string;
  link?: RecordLink;
}) {
  const to = link(recordId);
  if (!to) return <span className="font-semibold">{dateLabel(date)}</span>;
  if (to.startsWith("#")) {
    return (
      <a href={to} className={linkClass}>
        {dateLabel(date)}
      </a>
    );
  }
  return (
    <Link to={to} className={linkClass}>
      {dateLabel(date)}
    </Link>
  );
}
