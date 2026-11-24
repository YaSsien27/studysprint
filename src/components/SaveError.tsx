// A red message for when loading or saving to the database went wrong.

export function SaveError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
      {error}
    </p>
  );
}
