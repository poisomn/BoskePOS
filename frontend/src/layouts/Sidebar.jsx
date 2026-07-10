function Sidebar() {
  return (
    <aside className="sidebar hidden lg:flex">
      <div className="border-b p-4" style={{ borderColor: 'var(--color-border)' }}>
        <img
          src="/brand/LogoBoskePOS.webp"
          alt="BoskePOS"
          className="h-14 w-auto object-contain"
        />
      </div>
      <div className="flex flex-1 items-center justify-center p-4 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
        Modulos disponibles en proximos sprints.
      </div>
    </aside>
  )
}

export default Sidebar
