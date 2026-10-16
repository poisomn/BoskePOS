// Optional modules kept on this computer and excluded from Git.
const extensions = Object.values(import.meta.glob('./local/*.js', { eager: true }))

export const localRoutes = extensions.flatMap((extension) => extension.routes ?? [])
export const localNavItems = extensions.flatMap((extension) => extension.navItems ?? [])
