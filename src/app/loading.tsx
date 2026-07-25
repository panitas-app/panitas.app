export default function Loading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="flex flex-col items-center gap-5 animate-fade-in">
        <div className="relative">
          <div className="size-10 rounded-full border-[3px] border-primary/20" />
          <div className="absolute inset-0 size-10 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-semibold text-[#102A43] tracking-tight">Panitas</p>
          <p className="text-xs text-muted-foreground">Cargando...</p>
        </div>
      </div>
    </div>
  )
}
