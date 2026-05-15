export default function Loading() {
  return (
    <main className="mx-auto min-h-screen max-w-[1400px] px-4 py-4 sm:px-6 lg:px-8">
      <div className="surface-card overflow-hidden p-6">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="mt-4 skeleton h-14 w-full rounded-2xl" />
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="skeleton aspect-video rounded-[24px]" />
          <div className="space-y-4">
            <div className="skeleton h-32 rounded-[24px]" />
            <div className="skeleton h-32 rounded-[24px]" />
          </div>
        </div>
      </div>
    </main>
  );
}
