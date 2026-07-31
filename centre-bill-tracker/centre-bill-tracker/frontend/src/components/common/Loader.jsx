export default function Loader({ label = 'Loading...', fullScreen = false }) {
  const content = (
    <div className="flex flex-col items-center gap-3 text-ink-500">
      <svg className="h-8 w-8 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <span className="text-sm">{label}</span>
    </div>
  );

  if (fullScreen) {
    return <div className="flex min-h-screen w-full items-center justify-center bg-surface-muted">{content}</div>;
  }

  return <div className="flex w-full items-center justify-center py-12">{content}</div>;
}
