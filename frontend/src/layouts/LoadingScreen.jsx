function LoadingScreen() {
  return (
    <main className="app-shell grid place-items-center">
      <div className="flex flex-col items-center gap-4">
        <img
          src="/brand/LogoBoskePOS.webp"
          alt="BoskePOS"
          className="h-20 w-auto object-contain"
        />
        <div
          className="size-8 animate-spin rounded-full border-4 border-t-transparent"
          style={{ borderColor: 'var(--color-brand-600)', borderTopColor: 'transparent' }}
          aria-label="Cargando"
        />
      </div>
    </main>
  )
}

export default LoadingScreen
