"""Preventa sin reserva: las existencias solo cambian al completar la venta."""
import hashlib
import json
from datetime import datetime, time, timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError

from apps.accounts.permissions import ADMIN_ROLE, has_role
from apps.cash.services import active_session, lock_operation_users
from apps.inventory.models import Product
from .models import OperationEvent, PresaleStation, PresaleTicket, Sale
from .services import build_pos_cart_quote, complete_sale, register_sale, update_pending_sale


class TicketConflict(APIException):
    status_code = 409
    default_detail = 'El ticket ya no está disponible.'


def audit(user, entity, pk, action, **detail):
    if entity == 'presale':
        ticket = PresaleTicket.objects.filter(pk=pk).first()
        if ticket:
            detail['products'] = [{'id': item.product_id, 'name': item.product_name, 'sku': item.product_sku}
                                  for item in ticket.sale.items.all()]
    elif entity == 'purchases.purchase':
        from apps.purchases.models import PurchaseItem
        detail['products'] = [{'id': item.product_id, 'name': item.product_name, 'sku': item.product_sku, 'item_id': item.pk}
                              for item in PurchaseItem.objects.filter(purchase_id=pk)]
    OperationEvent.objects.create(actor=user, entity=entity, entity_id=str(pk), action=action, detail=detail)


def ticket_items(ticket):
    return [dict(product_id=line.product_id, quantity=line.quantity, discount_amount=line.discount_total, note=line.note)
            for line in ticket.sale.items.all()]


def checked_quote(ticket):
    quote = build_pos_cart_quote(ticket_items(ticket))
    stored = [(line.product_id, line.unit_price, line.tax_rate) for line in ticket.sale.items.all()]
    current = [(line['product_id'], Decimal(str(line['unit_price'])), Decimal(str(line['tax_rate']))) for line in quote['items']]
    if stored != current or Decimal(quote['total']) != ticket.sale.total:
        raise TicketConflict({'detail': 'El precio o impuesto cambió. Revisa y actualiza el ticket antes de cobrar.', 'code': 'price_changed'})
    return quote


def locked_ticket(pk, user, authorizer=None):
    lock_operation_users(user, authorizer)
    return PresaleTicket.objects.select_for_update(of=('self',)).select_related('sale', 'station').get(pk=pk)


def available(ticket):
    if ticket.status in ('paid', 'cancelled'):
        raise TicketConflict('El ticket ya fue pagado o cancelado.')
    if ticket.expires_at <= timezone.now():
        raise TicketConflict('El ticket venció. Emite una nueva preventa.')
    if ticket.sale.status != Sale.Status.PENDING:
        raise TicketConflict('La venta asociada ya no está pendiente.')


def own_claim(ticket, user):
    if ticket.claimed_by_id != user.pk or not ticket.claim_until or ticket.claim_until <= timezone.now():
        raise TicketConflict('Toma el ticket en caja antes de continuar. La toma anterior pudo vencer.')


@transaction.atomic
def issue_ticket(*, user, station_id, key, values, authorizer=None):
    lock_operation_users(user, authorizer)
    fingerprint = hashlib.sha256(json.dumps({'station': station_id, 'values': values}, sort_keys=True, default=str).encode()).hexdigest()
    previous = PresaleTicket.objects.filter(issued_by=user, issue_key=key).first()
    if previous:
        if previous.fingerprint != fingerprint:
            raise TicketConflict('La clave de emisión ya corresponde a otra preventa.')
        return previous
    station = PresaleStation.objects.select_for_update().filter(pk=station_id, is_active=True).first()
    if not station:
        raise ValidationError({'station': 'Selecciona una estación de preventa activa.'})
    sale = register_sale(user=user, status='pending', customer=values.get('customer_id'), items=values['items'],
                         notes=values.get('notes', ''), discount_reason=values.get('discount_reason', ''), authorizer=authorizer)
    now = timezone.now()
    expires = now + timedelta(minutes=station.valid_minutes) if station.valid_minutes else timezone.make_aware(
        datetime.combine(timezone.localdate(now) + timedelta(days=1), time.min))
    ticket = PresaleTicket.objects.create(sale=sale, station=station, issued_by=user, issue_key=key,
                                          fingerprint=fingerprint, expires_at=expires)
    audit(user, 'presale', ticket.pk, 'issued', code=ticket.code, station=station.name, sale=sale.pk)
    return ticket


@transaction.atomic
def take_ticket(pk, user):
    ticket = locked_ticket(pk, user)
    available(ticket)
    active_session(user)
    now = timezone.now()
    if ticket.claim_until and ticket.claim_until > now and ticket.claimed_by_id != user.pk:
        raise TicketConflict('Otra caja está atendiendo este ticket.')
    if PresaleTicket.objects.filter(claimed_by=user, claim_until__gt=now, status='claimed', expires_at__gt=now).exclude(pk=pk).exists():
        raise TicketConflict('Libera o cobra el ticket que ya tienes en atención.')
    checked_quote(ticket)
    ticket.claimed_by = user
    ticket.claim_until = min(now + timedelta(minutes=10), ticket.expires_at)
    ticket.status = 'claimed'
    ticket.save(update_fields=('claimed_by', 'claim_until', 'status'))
    audit(user, 'presale', pk, 'claimed', until=ticket.claim_until.isoformat())
    return ticket


@transaction.atomic
def release_ticket(pk, user):
    ticket = locked_ticket(pk, user)
    available(ticket)
    if ticket.claimed_by_id != user.pk and not has_role(user, ADMIN_ROLE):
        raise PermissionDenied('Solo la caja que tomó el ticket o administración puede liberarlo.')
    ticket.claimed_by = None
    ticket.claim_until = None
    ticket.status = 'pending'
    ticket.save(update_fields=('claimed_by', 'claim_until', 'status'))
    audit(user, 'presale', pk, 'released')
    return ticket


@transaction.atomic
def reprice_ticket(pk, user, *, authorizer=None):
    ticket = locked_ticket(pk, user, authorizer)
    available(ticket)
    if ticket.claim_until and ticket.claim_until > timezone.now() and ticket.claimed_by_id != user.pk:
        raise TicketConflict('Otra caja tiene el ticket. Debe liberarlo antes de actualizar los precios.')
    before = str(ticket.sale.total)
    sale = update_pending_sale(sale=ticket.sale, user=user, items=ticket_items(ticket), authorizer=authorizer, from_presale=True)
    ticket.sale = sale
    audit(user, 'presale', pk, 'repriced', before=before, after=str(sale.total))
    return ticket


@transaction.atomic
def cancel_ticket(pk, user, reason):
    ticket = locked_ticket(pk, user)
    available(ticket)
    if not reason.strip():
        raise ValidationError({'reason': 'Escribe el motivo de cancelación.'})
    ticket.status = 'cancelled'
    ticket.claimed_by = None
    ticket.claim_until = None
    ticket.save(update_fields=('status', 'claimed_by', 'claim_until'))
    # Retener la venta y las partidas para auditoría; no hubo salida de stock.
    Sale.objects.filter(pk=ticket.sale_id).update(status='cancelled', cancelled_at=timezone.now())
    audit(user, 'presale', pk, 'cancelled', reason=reason.strip())
    return ticket


@transaction.atomic
def pay_ticket(pk, user, values, authorizer=None):
    ticket = locked_ticket(pk, user, authorizer)
    if ticket.status == 'paid':
        # CompleteSale verifica actor, clave e importe del reintento.
        complete_sale(sale=ticket.sale, user=user, authorizer=authorizer, from_presale=True, **values)
        return ticket
    available(ticket)
    own_claim(ticket, user)
    active_session(user)
    list(Product.objects.select_for_update().filter(pk__in=[line.product_id for line in ticket.sale.items.all()]).order_by("pk"))
    checked_quote(ticket)
    ticket.sale = complete_sale(sale=ticket.sale, user=user, authorizer=authorizer, from_presale=True, **values)
    ticket.status = 'paid'
    ticket.claim_until = None
    ticket.save(update_fields=('status', 'claim_until'))
    audit(user, 'presale', pk, 'paid', sale=ticket.sale_id, total=str(ticket.sale.total))
    return ticket
