export default function RestablecerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 40%, #eff6ff 100%)" }}>
      {children}
    </div>
  )
}
