export function hasPermission(user, permission) {
  return Boolean(user?.permissions?.includes(permission))
}

export function hasAnyPermission(user, permissions = []) {
  return permissions.some((permission) => hasPermission(user, permission))
}

export function hasRole(user, role) {
  return Boolean(user?.roles?.includes(role))
}
