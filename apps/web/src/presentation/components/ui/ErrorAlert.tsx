// The red box above a form when something went wrong
export function ErrorAlert({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-lg bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger"
    >
      {message}
    </p>
  );
}
