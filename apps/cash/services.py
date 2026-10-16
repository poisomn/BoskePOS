from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from rest_framework.exceptions import ValidationError, PermissionDenied

from apps.accounts.permissions import has_role, ADMIN_ROLE
from .models import CashRegister, CashSession, CashMovement

METHODS = ('cash', 'debit', 'credit', 'transfer')


def lock_cashier(user):
    # All cash mutations and sale writes lock the actor before sessions/products.
    return get_user_model().objects.select_for_update().get(pk=user.pk)


def active_session(user):
    session = CashSession.objects.select_for_update().filter(cashier=user, closed_at__isnull=True).first()
    if session is None:
        raise ValidationError({'cash_session': 'Abre una caja antes de cobrar o registrar movimientos.'})
    return session


def lock_operation_users(user, authorizer=None):
    ids = {user.pk, authorizer.pk} if authorizer else {user.pk}
    locked = {actor.pk: actor for actor in get_user_model().objects.select_for_update().filter(pk__in=ids).order_by('pk')}
    if not locked[user.pk].is_active:
        raise PermissionDenied('Usuario inactivo.')
    if authorizer:
        current = locked[authorizer.pk]
        if not current.is_active or not has_role(current, ADMIN_ROLE) or not current.authorization_pin_hash or current.authorization_pin_hash != authorizer.authorization_pin_hash:
            raise PermissionDenied('La autorización ya no está vigente.')
        return current
    return None


@transaction.atomic
def open_session(*, user, register_id, opening_amount):
    lock_cashier(user)
    register = CashRegister.objects.select_for_update().get(pk=register_id)
    if not register.is_active:
        raise ValidationError({'register': 'La caja está inactiva.'})
    if CashSession.objects.filter(register=register, closed_at__isnull=True).exists():
        raise ValidationError({'register': 'Esta caja ya tiene un turno abierto.'})
    if CashSession.objects.filter(cashier=user, closed_at__isnull=True).exists():
        raise ValidationError({'cashier': 'Ya tienes una caja abierta.'})
    return CashSession.objects.create(register=register, cashier=user, opening_amount=opening_amount)


def session_summary(session):
    if session.closed_at:
        return session.closing_summary
    totals = {method: Decimal('0') for method in METHODS}
    totals['cash'] = session.opening_amount
    sales = 0
    for event in session.movements.all():
        sign = -1 if event.kind in ('refund', 'withdrawal') else 1
        totals[event.method] += sign * event.amount
        if event.kind == 'sale':
            sales += 1
    return {'expected': {key: str(value.quantize(Decimal('.01'))) for key, value in totals.items()}, 'transactions': sales}


@transaction.atomic
def manual_movement(*, user, session, kind, amount, reason):
    lock_cashier(user)
    current = CashSession.objects.select_for_update().get(pk=session.pk)
    if current.cashier_id != user.pk or current.closed_at:
        raise ValidationError({'session': 'Solo el cajero de un turno abierto puede registrar movimientos.'})
    if kind == 'withdrawal' and amount > Decimal(session_summary(current)['expected']['cash']):
        raise ValidationError({'amount': 'El retiro supera el efectivo esperado.'})
    return CashMovement.objects.create(session=current, kind=kind, method='cash', amount=amount, reason=reason, user=user)


def verify_admin_pin(admin_id, pin):
    # Commit failed attempts separately from the operation that may be rejected.
    valid = False
    with transaction.atomic():
        admin = get_user_model().objects.select_for_update().filter(pk=admin_id, is_active=True).first()
        if admin and has_role(admin, ADMIN_ROLE) and admin.authorization_pin_hash:
            if admin.pin_locked_until and admin.pin_locked_until > timezone.now():
                raise PermissionDenied('Autorización bloqueada temporalmente. Intenta más tarde.')
            valid = check_password(pin, admin.authorization_pin_hash)
            if valid:
                admin.pin_failed_attempts = 0
                admin.pin_locked_until = None
            else:
                admin.pin_failed_attempts += 1
                if admin.pin_failed_attempts >= 5:
                    admin.pin_locked_until = timezone.now() + timedelta(minutes=15)
                    admin.pin_failed_attempts = 0
            admin.save(update_fields=('pin_failed_attempts', 'pin_locked_until'))
    if not valid:
        raise PermissionDenied('Administrador o PIN de autorización inválido.')
    return admin


@transaction.atomic
def close_session(*, user, session, counted, notes, authorizer):
    lock_cashier(user)
    current = CashSession.objects.select_for_update().get(pk=session.pk)
    if current.cashier_id != user.pk or current.closed_at:
        raise ValidationError({'session': 'El turno debe estar abierto y pertenecer al cajero.'})
    summary = session_summary(current)
    differences = {method: str((counted[method] - Decimal(summary['expected'][method])).quantize(Decimal('.01'))) for method in METHODS}
    if any(Decimal(value) for value in differences.values()) and not notes.strip():
        raise ValidationError({'notes': 'Explica la diferencia antes de cerrar.'})
    summary.update(counted={key: str(value) for key, value in counted.items()}, differences=differences)
    current.counted_by = user
    current.authorized_by = authorizer
    current.closed_at = timezone.now()
    current.closing_notes = notes.strip()
    current.closing_summary = summary
    current.save(update_fields=('counted_by', 'authorized_by', 'closed_at', 'closing_notes', 'closing_summary'))
    return current
