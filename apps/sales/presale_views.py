from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.accounts.permissions import ActionPermission, has_app_permission
from apps.cash.services import verify_admin_pin
from .models import OperationEvent, PresaleStation, PresaleTicket
from .serializers import SaleCompleteSerializer, SaleCreateSerializer, SaleSerializer
from .presales import (TicketConflict, audit, cancel_ticket, issue_ticket, pay_ticket, reprice_ticket, release_ticket, take_ticket)
from .services import SaleConflict
from .views import SalePagination


class PresalePermission(ActionPermission):
    read_permission = 'presales:read'
    action_permissions = {'list': 'presales:read', 'retrieve': 'presales:read', 'create': 'presales:write',
                          'take': 'sales:complete', 'release': 'sales:complete', 'complete': 'sales:complete',
                          'reprice': 'presales:write', 'cancel': 'sales:cancel', 'update': 'settings:write',
                          'partial_update': 'settings:write'}


class StationSerializer(serializers.ModelSerializer):
    valid_minutes = serializers.IntegerField(min_value=0, max_value=1440, required=False)

    class Meta:
        model = PresaleStation
        fields = ('id', 'name', 'is_active', 'valid_minutes')


class StationViewSet(viewsets.ModelViewSet):
    queryset = PresaleStation.objects.all()
    serializer_class = StationSerializer
    permission_classes = (PresalePermission,)
    http_method_names = ('get', 'post', 'patch', 'head', 'options')

    def check_permissions(self, request):
        super().check_permissions(request)
        if request.method not in ('GET', 'HEAD', 'OPTIONS') and not has_app_permission(request.user, 'settings:write'):
            raise PermissionDenied('Solo administración puede configurar estaciones.')

    def perform_create(self, serializer):
        station = serializer.save()
        audit(self.request.user, 'presale_station', station.pk, 'created', name=station.name)

    def perform_update(self, serializer):
        station = serializer.save()
        audit(self.request.user, 'presale_station', station.pk, 'updated', data=serializer.data)


class TicketSerializer(serializers.ModelSerializer):
    code = serializers.CharField(read_only=True)
    sale = SaleSerializer(read_only=True)
    station_name = serializers.CharField(source='station.name', read_only=True)
    seller = serializers.CharField(source='issued_by.email', read_only=True)
    claimed_by_email = serializers.CharField(source='claimed_by.email', read_only=True, allow_null=True)
    effective_status = serializers.SerializerMethodField()

    def get_effective_status(self, obj):
        if obj.status in ('pending', 'claimed') and obj.expires_at <= timezone.now():
            return 'expired'
        if obj.status == 'claimed' and obj.claim_until and obj.claim_until <= timezone.now():
            return 'pending'
        return obj.status

    class Meta:
        model = PresaleTicket
        fields = ('id', 'code', 'station', 'station_name', 'seller', 'status', 'effective_status', 'created_at',
                  'expires_at', 'claimed_by', 'claimed_by_email', 'claim_until', 'sale')


class TicketInput(SaleCreateSerializer):
    station = serializers.IntegerField(min_value=1)
    idempotency_key = serializers.UUIDField(required=True)


class TicketViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TicketSerializer
    permission_classes = (PresalePermission,)
    pagination_class = SalePagination

    def get_queryset(self):
        query = PresaleTicket.objects.select_related('sale__customer', 'sale__user', 'sale__cashier', 'station', 'issued_by', 'claimed_by').prefetch_related('sale__items')
        search = self.request.query_params.get('search', '').strip()
        if search:
            q = Q(station__name__icontains=search) | Q(sale__customer__name__icontains=search) | Q(issued_by__email__icontains=search)
            code = search.upper().removeprefix('PV-')
            if code.isdigit(): q |= Q(id=int(code))
            query = query.filter(q)
        state = self.request.query_params.get('status')
        now = timezone.now()
        if state == 'open': query = query.filter(status__in=('pending', 'claimed'), expires_at__gt=now)
        elif state == 'expired': query = query.filter(status__in=('pending', 'claimed'), expires_at__lte=now)
        elif state in ('paid', 'cancelled'): query = query.filter(status=state)
        return query.order_by('created_at', 'id')

    def create(self, request):
        serializer = TicketInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = dict(serializer.validated_data)
        station = values.pop('station')
        key = values.pop('idempotency_key')
        admin = values.pop('admin_id', None)
        pin = values.pop('pin', '')
        authorizer = verify_admin_pin(admin, pin) if admin else None
        ticket = issue_ticket(user=request.user, station_id=station, key=key, values=values, authorizer=authorizer)
        return Response(TicketSerializer(ticket).data, status=201)

    def perform_action(self, fn, **kwargs):
        try:
            ticket = fn(self.get_object().pk, self.request.user, **kwargs)
        except SaleConflict as exc:
            raise TicketConflict(exc.message) from exc
        ticket = self.get_queryset().model.objects.select_related('sale', 'station', 'issued_by', 'claimed_by').get(pk=ticket.pk)
        return Response(TicketSerializer(ticket).data)

    @action(detail=True, methods=('post',))
    def take(self, request, pk=None): return self.perform_action(take_ticket)

    @action(detail=True, methods=('post',))
    def release(self, request, pk=None): return self.perform_action(release_ticket)

    @action(detail=True, methods=('post',))
    def reprice(self, request, pk=None): return self.perform_action(reprice_ticket)

    @action(detail=True, methods=('post',))
    def cancel(self, request, pk=None):
        reason = serializers.CharField(max_length=500).run_validation(request.data.get('reason', ''))
        return self.perform_action(cancel_ticket, reason=reason)

    @action(detail=True, methods=('post',))
    def complete(self, request, pk=None):
        serializer = SaleCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = dict(serializer.validated_data)
        if not values.get('idempotency_key'):
            raise serializers.ValidationError({'idempotency_key': 'Se requiere clave de cobro.'})
        admin = values.pop('admin_id', None)
        pin = values.pop('pin', '')
        authorizer = verify_admin_pin(admin, pin) if admin else None
        return self.perform_action(pay_ticket, values=values, authorizer=authorizer)


class EventSerializer(serializers.ModelSerializer):
    actor_email = serializers.CharField(source='actor.email', read_only=True, allow_null=True)
    products = serializers.SerializerMethodField()

    def get_products(self, obj):
        # New records keep an immutable identity snapshot. Resolve older records in bulk.
        if obj.detail.get('products'):
            return obj.detail['products']
        return self.context.get('event_products', {}).get(obj.pk, [])

    class Meta:
        model = OperationEvent
        fields = ('id', 'actor_email', 'entity', 'entity_id', 'action', 'detail', 'created_at', 'products')


class AuditViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EventSerializer
    pagination_class = SalePagination

    def get_serializer(self, *args, **kwargs):
        if not args:
            return super().get_serializer(*args, **kwargs)
        from apps.inventory.models import Product, StockMovement
        from apps.purchases.models import PurchaseItem
        from .models import SaleItem

        context = self.get_serializer_context()
        events = list(args[0]) if kwargs.get('many') else [args[0]]
        ids = lambda entity: [int(e.entity_id) for e in events if e.entity == entity and e.entity_id.isdigit()]
        products = {str(p.pk): {'id': p.pk, 'name': p.name, 'sku': p.sku} for p in Product.objects.filter(pk__in=ids('inventory.product'))}
        movements = {str(m.pk): {'id': m.product_id, 'name': m.product.name, 'sku': m.product.sku} for m in StockMovement.objects.filter(pk__in=ids('inventory.stockmovement')).select_related('product')}
        purchases = {}
        for item in PurchaseItem.objects.filter(purchase_id__in=ids('purchases.purchase')):
            purchases.setdefault(str(item.purchase_id), []).append({'id': item.product_id, 'name': item.product_name, 'sku': item.product_sku, 'item_id': item.pk})
        sale_ids = ids('sales.sale')
        tickets = {str(t.pk): t.sale_id for t in PresaleTicket.objects.filter(pk__in=ids('presale'))}
        sales = {}
        for item in SaleItem.objects.filter(sale_id__in=sale_ids + list(tickets.values())):
            sales.setdefault(item.sale_id, []).append({'id': item.product_id, 'name': item.product_name, 'sku': item.product_sku})
        mapping = {}
        for event in events:
            key = event.entity_id
            if event.entity == 'inventory.product': mapping[event.pk] = [products[key]] if key in products else []
            elif event.entity == 'inventory.stockmovement': mapping[event.pk] = [movements[key]] if key in movements else []
            elif event.entity == 'purchases.purchase': mapping[event.pk] = purchases.get(key, [])
            elif event.entity == 'sales.sale' and key.isdigit(): mapping[event.pk] = sales.get(int(key), [])
            elif event.entity == 'presale': mapping[event.pk] = sales.get(tickets.get(key), [])
        context['event_products'] = mapping
        kwargs['context'] = context
        return self.serializer_class(*args, **kwargs)

    def get_queryset(self):
        if not has_app_permission(self.request.user, 'reports:sensitive'):
            raise PermissionDenied('Auditoría disponible solo para administración.')
        query = OperationEvent.objects.select_related('actor')
        search = self.request.query_params.get('search', '').strip()
        if search:
            from apps.inventory.models import Product
            product_ids = Product.objects.filter(Q(name__icontains=search) | Q(sku__icontains=search)).values_list('pk', flat=True)
            query = query.filter(Q(entity__icontains=search) | Q(action__icontains=search) | Q(actor__email__icontains=search) | Q(entity_id=search) | Q(detail__icontains=search) | Q(entity='inventory.product', entity_id__in=[str(pk) for pk in product_ids]))
        return query
