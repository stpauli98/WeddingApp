export default function DashboardLoading() {
  return (
    <div className="container mx-auto p-6 bg-[hsl(var(--lp-bg))]">
      <div className="flex justify-end mb-4">
        <div className="h-10 w-24 bg-[hsl(var(--lp-muted))] rounded animate-pulse" />
      </div>
      <div className="mb-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-9 w-64 bg-[hsl(var(--lp-muted))] rounded animate-pulse" />
          <div className="h-5 w-48 bg-[hsl(var(--lp-muted))] rounded animate-pulse mt-2" />
          <div className="h-8 w-32 bg-[hsl(var(--lp-muted))] rounded-full animate-pulse mt-4" />
        </div>
      </div>
      <div className="h-12 w-full bg-[hsl(var(--lp-muted))] rounded animate-pulse mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-48 bg-[hsl(var(--lp-muted))] rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}
