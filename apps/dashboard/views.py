from datetime import datetime, time, timedelta

from django.db.models import Count, F, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import has_app_permission
from apps.inventory.models import Product, StockMovement
from apps.purchases.models import Purchase
from apps.sales.models import Sale, SaleItem


MAX_RANGE_DAYS = 31
DEFAULT_RECENT_LIMIT = 5
MAX_RECENT_LIMIT = 20


class DashboardSummaryView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        period = self._get_period(request)
        if isinstance(period, Response):
            return period

        limit = self._get_limit(request)
        if isinstance(limit, Response):
            return limit

        user = request.user
        can_read_sales = has_app_permission(user, 'sales:read')
        can_read_purchases = has_app_permission(user, 'purchases:read')
        can_read_inventory = has_app_permission(user, 'inventory:read')
        can_read_movements = has_app_permission(user, 'stock_movements:read')

        if not any((
            can_read_sales,
            can_read_purchases,
            can_read_inventory,
            can_read_movements,
        )):
            return Response(
                {'detail': 'No tienes permisos para consultar el dashboard.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        date_from, date_to, start_at, end_at = period
        data = {
            'period': {
                'date_from': date_from.isoformat(),
                'date_to': date_to.isoformat(),
            },
            'permissions': {
                'sales': can_read_sales,
                'purchases': can_read_purchases,
                'inventory': can_read_inventory,
                'stock_movements': can_read_movements,
            },
        }

        if can_read_sales:
            data['sales'] = self._build_sales_summary(
                date_from,
                date_to,
                start_at,
                end_at,
                limit,
            )

        if can_read_inventory:
            data['inventory'] = self._build_inventory_summary()

        if can_read_purchases:
            data['purchases'] = self._build_purchases_summary(limit)

        if can_read_movements:
            data['stock_movements'] = self._build_stock_movements_summary(limit)

        return Response(data)

    def _get_period(self, request):
        requested_date = request.query_params.get('date')
        requested_from = request.query_params.get('date_from')
        requested_to = request.query_params.get('date_to')

        if requested_date and (requested_from or requested_to):
            return Response(
                {'date': 'No combines date con date_from/date_to.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if requested_date:
            date_from = parse_date(requested_date)
            date_to = date_from
            if not date_from:
                return Response(
                    {'date': 'Fecha invalida. Usa formato YYYY-MM-DD.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            today = timezone.localdate()
            date_from = parse_date(requested_from) if requested_from else today
            date_to = parse_date(requested_to) if requested_to else date_from

            if not date_from:
                return Response(
                    {'date_from': 'Fecha invalida. Usa formato YYYY-MM-DD.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not date_to:
                return Response(
                    {'date_to': 'Fecha invalida. Usa formato YYYY-MM-DD.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if date_from > date_to:
            return Response(
                {'date_to': 'La fecha final no puede ser anterior a la inicial.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (date_to - date_from).days + 1 > MAX_RANGE_DAYS:
            return Response(
                {'date_to': f'El rango maximo permitido es de {MAX_RANGE_DAYS} dias.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        current_timezone = timezone.get_current_timezone()
        start_at = timezone.make_aware(
            datetime.combine(date_from, time.min),
            current_timezone,
        )
        end_at = timezone.make_aware(
            datetime.combine(date_to, time.max),
            current_timezone,
        )

        return date_from, date_to, start_at, end_at

    def _get_limit(self, request):
        raw_limit = request.query_params.get('limit', DEFAULT_RECENT_LIMIT)

        try:
            limit = int(raw_limit)
        except (TypeError, ValueError):
            return Response(
                {'limit': 'El limite debe ser numerico.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if limit < 1 or limit > MAX_RECENT_LIMIT:
            return Response(
                {'limit': f'El limite debe estar entre 1 y {MAX_RECENT_LIMIT}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return limit

    def _build_sales_summary(self, date_from, date_to, start_at, end_at, limit):
        completed_sales = Sale.objects.filter(
            status=Sale.Status.COMPLETED,
            created_at__gte=start_at,
            created_at__lte=end_at,
        )
        totals = completed_sales.aggregate(
            total=Sum('total'),
            count=Count('id'),
        )
        recent_sales = (
            Sale.objects.select_related('customer', 'user')
            .order_by('-created_at')[:limit]
        )
        current_timezone = timezone.get_current_timezone()
        sales_by_day = {
            item['day'].isoformat(): item
            for item in (
                completed_sales
                .annotate(day=TruncDate('created_at', tzinfo=current_timezone))
                .values('day')
                .annotate(total=Sum('total'), count=Count('id'))
                .order_by('day')
            )
        }
        top_products = (
            SaleItem.objects
            .filter(
                sale__status=Sale.Status.COMPLETED,
                sale__created_at__gte=start_at,
                sale__created_at__lte=end_at,
            )
            .values('product_id', 'product_name', 'product_sku')
            .annotate(quantity=Sum('quantity'), total=Sum('line_total'))
            .order_by('-quantity', 'product_name')[:limit]
        )

        return {
            'total': format_decimal(totals['total']),
            'count': totals['count'],
            'daily': [
                {
                    'date': current_date.isoformat(),
                    'total': format_decimal(
                        sales_by_day.get(current_date.isoformat(), {}).get('total'),
                    ),
                    'count': sales_by_day.get(
                        current_date.isoformat(),
                        {},
                    ).get('count', 0),
                }
                for current_date in iter_dates(date_from, date_to)
            ],
            'top_products': [
                {
                    'id': item['product_id'],
                    'name': item['product_name'],
                    'sku': item['product_sku'],
                    'quantity': item['quantity'],
                    'total': format_decimal(item['total']),
                }
                for item in top_products
            ],
            'recent': [
                {
                    'id': sale.id,
                    'customer': sale.customer.name if sale.customer else 'Consumidor final',
                    'seller': sale.user.email,
                    'status': sale.status,
                    'status_label': sale.get_status_display(),
                    'total': format_decimal(sale.total),
                    'created_at': sale.created_at,
                }
                for sale in recent_sales
            ],
        }

    def _build_inventory_summary(self):
        active_products = Product.objects.filter(is_active=True)
        stock_counts = active_products.aggregate(
            active_count=Count('id'),
            out_of_stock_count=Count('id', filter=Q(stock=0)),
            low_stock_count=Count(
                'id',
                filter=Q(stock__gt=0, stock__lte=F('minimum_stock')),
            ),
            healthy_stock_count=Count(
                'id',
                filter=Q(stock__gt=F('minimum_stock')),
            ),
        )
        low_stock_products = (
            active_products
            .filter(stock__gt=0, stock__lte=F('minimum_stock'))
            .order_by('stock', 'name')[:DEFAULT_RECENT_LIMIT]
        )
        out_of_stock_products = (
            active_products
            .filter(stock=0)
            .order_by('name')[:DEFAULT_RECENT_LIMIT]
        )

        return {
            'active_count': stock_counts['active_count'],
            'healthy_stock_count': stock_counts['healthy_stock_count'],
            'low_stock_count': stock_counts['low_stock_count'],
            'alert_stock_count': stock_counts['low_stock_count'],
            'out_of_stock_count': stock_counts['out_of_stock_count'],
            'low_stock_products': [
                serialize_product_stock(product)
                for product in low_stock_products
            ],
            'out_of_stock_products': [
                serialize_product_stock(product)
                for product in out_of_stock_products
            ],
        }

    def _build_purchases_summary(self, limit):
        recent_purchases = (
            Purchase.objects.select_related('supplier', 'user')
            .order_by('-created_at')[:limit]
        )

        return {
            'recent': [
                {
                    'id': purchase.id,
                    'supplier': purchase.supplier.name,
                    'user': purchase.user.email,
                    'status': purchase.status,
                    'status_label': purchase.get_status_display(),
                    'total': format_decimal(purchase.total),
                    'created_at': purchase.created_at,
                }
                for purchase in recent_purchases
            ],
        }

    def _build_stock_movements_summary(self, limit):
        recent_movements = (
            StockMovement.objects.select_related('product', 'user')
            .order_by('-created_at')[:limit]
        )

        return {
            'recent': [
                {
                    'id': movement.id,
                    'product': movement.product.name,
                    'sku': movement.product.sku,
                    'movement_type': movement.movement_type,
                    'movement_type_label': movement.get_movement_type_display(),
                    'quantity': movement.quantity,
                    'stock_before': movement.stock_before,
                    'stock_after': movement.stock_after,
                    'user': movement.user.email,
                    'created_at': movement.created_at,
                }
                for movement in recent_movements
            ],
        }


def serialize_product_stock(product):
    return {
        'id': product.id,
        'name': product.name,
        'sku': product.sku,
        'stock': product.stock,
        'minimum_stock': product.minimum_stock,
    }


def format_decimal(value):
    return f'{value or 0:.2f}'


def iter_dates(date_from, date_to):
    current_date = date_from
    while current_date <= date_to:
        yield current_date
        current_date += timedelta(days=1)
