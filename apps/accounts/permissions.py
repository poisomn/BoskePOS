from collections.abc import Mapping

from rest_framework.permissions import BasePermission


ADMIN_ROLE = 'administrador'
SELLER_ROLE = 'vendedor'
INVENTORY_ROLE = 'encargado_inventario'

ROLE_LABELS = {
    ADMIN_ROLE: 'Administrador',
    SELLER_ROLE: 'Vendedor',
    INVENTORY_ROLE: 'Encargado de inventario',
}

ROLE_PERMISSIONS = {
    ADMIN_ROLE: frozenset({
        'inventory:read',
        'inventory:write',
        'inventory:adjust_stock',
        'inventory:view_costs',
        'stock_movements:read',
        'customers:read',
        'customers:write',
        'suppliers:read',
        'suppliers:write',
        'purchases:read',
        'purchases:write',
        'purchases:confirm',
        'purchases:cancel',
        'sales:read',
        'sales:write',
        'sales:complete',
        'sales:cancel',
        'reports:sensitive',
    }),
    SELLER_ROLE: frozenset({
        'inventory:read',
        'customers:read',
        'customers:write',
        'sales:read',
        'sales:write',
        'sales:complete',
    }),
    INVENTORY_ROLE: frozenset({
        'inventory:read',
        'inventory:write',
        'inventory:adjust_stock',
        'inventory:view_costs',
        'stock_movements:read',
        'suppliers:read',
        'suppliers:write',
        'purchases:read',
        'purchases:write',
        'purchases:confirm',
    }),
}

ALL_APP_PERMISSIONS = frozenset(
    permission
    for role_permissions in ROLE_PERMISSIONS.values()
    for permission in role_permissions
)


def get_user_roles(user) -> frozenset[str]:
    if not user or not user.is_authenticated:
        return frozenset()

    if user.is_superuser:
        return frozenset({ADMIN_ROLE})

    if not hasattr(user, '_boskepos_roles_cache'):
        user._boskepos_roles_cache = frozenset(
            user.groups.values_list('name', flat=True)
        )

    return user._boskepos_roles_cache


def get_user_app_permissions(user) -> frozenset[str]:
    if not user or not user.is_authenticated:
        return frozenset()

    if user.is_superuser:
        return ALL_APP_PERMISSIONS

    if not hasattr(user, '_boskepos_permissions_cache'):
        permissions = set()

        for role in get_user_roles(user):
            permissions.update(ROLE_PERMISSIONS.get(role, ()))

        user._boskepos_permissions_cache = frozenset(permissions)

    return user._boskepos_permissions_cache


def has_role(user, *roles: str) -> bool:
    if not user or not user.is_authenticated:
        return False

    requested_roles = frozenset(roles)
    return bool(get_user_roles(user) & requested_roles)


def has_app_permission(user, permission: str) -> bool:
    if not user or not user.is_authenticated:
        return False

    if user.is_superuser:
        return True

    return permission in get_user_app_permissions(user)


def can_view_costs(user) -> bool:
    return has_app_permission(user, 'inventory:view_costs')


class ActionPermission(BasePermission):
    """
    Autoriza acciones explicitas de ViewSets y vistas API.

    Toda accion no registrada se rechaza por defecto.
    """

    action_permissions: Mapping[str, str] = {}
    read_permission: str | None = None

    message = 'No tienes permisos para realizar esta operacion.'
    code = 'permission_denied'

    def has_permission(self, request, view) -> bool:
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        if request.method in {'HEAD', 'OPTIONS'}:
            return bool(
                self.read_permission
                and has_app_permission(user, self.read_permission)
            )

        action = (
            getattr(view, 'action', None)
            or getattr(view, 'permission_action', None)
        )
        required_permission = self.action_permissions.get(action)

        if required_permission is None:
            return False

        return has_app_permission(user, required_permission)


class InventoryPermission(ActionPermission):
    read_permission = 'inventory:read'

    action_permissions = {
        'list': 'inventory:read',
        'retrieve': 'inventory:read',
        'by_barcode': 'inventory:read',
        'create': 'inventory:write',
        'update': 'inventory:write',
        'partial_update': 'inventory:write',
        'destroy': 'inventory:write',
        'activate': 'inventory:write',
        'deactivate': 'inventory:write',
        'adjust_stock': 'inventory:adjust_stock',
    }


class StockMovementPermission(ActionPermission):
    read_permission = 'stock_movements:read'

    action_permissions = {
        'list': 'stock_movements:read',
        'retrieve': 'stock_movements:read',
    }

    def has_permission(self, request, view) -> bool:
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        return has_app_permission(user, self.read_permission)


class CustomerPermission(ActionPermission):
    read_permission = 'customers:read'

    action_permissions = {
        'list': 'customers:read',
        'retrieve': 'customers:read',
        'create': 'customers:write',
        'update': 'customers:write',
        'partial_update': 'customers:write',
        'destroy': 'customers:write',
        'activate': 'customers:write',
        'deactivate': 'customers:write',
    }


class SupplierPermission(ActionPermission):
    read_permission = 'suppliers:read'

    action_permissions = {
        'list': 'suppliers:read',
        'retrieve': 'suppliers:read',
        'create': 'suppliers:write',
        'update': 'suppliers:write',
        'partial_update': 'suppliers:write',
        'destroy': 'suppliers:write',
        'activate': 'suppliers:write',
        'deactivate': 'suppliers:write',
    }


class PurchasePermission(ActionPermission):
    read_permission = 'purchases:read'

    action_permissions = {
        'list': 'purchases:read',
        'retrieve': 'purchases:read',
        'create': 'purchases:write',
        'update': 'purchases:write',
        'partial_update': 'purchases:write',
        'destroy': 'purchases:write',
        'confirm': 'purchases:confirm',
        'cancel': 'purchases:cancel',
    }


class SalePermission(ActionPermission):
    read_permission = 'sales:read'

    action_permissions = {
        'list': 'sales:read',
        'retrieve': 'sales:read',
        'pos_products': 'sales:write',
        'pos_quote': 'sales:write',
        'create': 'sales:complete',
        'update': 'sales:write',
        'partial_update': 'sales:write',
        'complete': 'sales:complete',
        'cancel': 'sales:cancel',
    }
