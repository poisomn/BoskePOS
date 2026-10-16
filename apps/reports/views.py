from collections import defaultdict
from datetime import timedelta
from decimal import Decimal

from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import has_app_permission
from apps.inventory.models import Product
from apps.sales.models import Sale
from apps.utils.query_params import validated_filters


class OperationsReportView(APIView):
    """Operational figures for completed, non-cancelled sales, at query time."""
    def get(self, request):
        if not has_app_permission(request.user, 'sales:read'):
            raise PermissionDenied()
        params = validated_filters(request.query_params)
        today = timezone.localdate()
        start = params.get('date_from', today - timedelta(days=29))
        end = params.get('date_to', today)
        if start > end or (end - start).days > 365:
            raise ValidationError({'date_to': 'Usa un rango de hasta 366 días.'})
        sales = Sale.objects.annotate(sold_at=Coalesce('completed_at', 'created_at')).filter(status='completed', sold_at__date__gte=start, sold_at__date__lte=end).select_related('cashier').prefetch_related('items__product__category')
        total = Decimal('0')
        net = Decimal('0')
        costs = Decimal('0')
        missing = 0
        customers = set()
        anonymous = 0
        by_method = defaultdict(Decimal)
        cashiers = defaultdict(lambda: {'transactions': 0, 'total': Decimal('0')})
        daily = defaultdict(Decimal)
        hourly = defaultdict(Decimal)
        categories = defaultdict(Decimal)
        products = {}
        for sale in sales:
            total += sale.total
            net += sale.total - sale.tax_total
            if sale.customer_id:
                customers.add(sale.customer_id)
            else:
                anonymous += 1
            by_method[sale.payment_method] += sale.total
            actor = sale.cashier.email if sale.cashier else 'Cajero histórico no registrado'
            cashiers[actor]['transactions'] += 1
            cashiers[actor]['total'] += sale.total
            sold = timezone.localtime(sale.sold_at)
            daily[sold.date().isoformat()] += sale.total
            hourly[sold.hour] += sale.total
            for item in sale.items.all():
                if item.unit_cost is None:
                    missing += 1
                else:
                    costs += item.unit_cost * item.quantity
                category = item.product.category.name if item.product.category else 'Sin categoría'
                categories[category] += item.line_total
                row = products.setdefault(item.product_id, {'id': item.product_id, 'name': item.product_name, 'quantity': 0, 'total': Decimal('0')})
                row['quantity'] += item.quantity
                row['total'] += item.line_total
        count = sum(row['transactions'] for row in cashiers.values())
        def money(value):
            return str(value.quantize(Decimal('.01')))
        dates = [start + timedelta(days=offset) for offset in range((end - start).days + 1)]
        result = {
            'date_from': start, 'date_to': end, 'total': money(total), 'transactions': count,
            'average_ticket': money(total / count) if count else None,
            'identified_customers': len(customers), 'anonymous_transactions': anonymous,
            'payment_methods': [{'method': key, 'total': money(value)} for key, value in by_method.items()],
            'daily': [{'date': day, 'total': money(daily[day.isoformat()])} for day in dates],
            'hourly': [{'hour': hour, 'total': money(hourly[hour])} for hour in range(24)],
            'cashiers': [{'cashier': key, 'transactions': value['transactions'], 'total': money(value['total'])} for key, value in sorted(cashiers.items(), key=lambda pair: pair[1]['total'], reverse=True)],
            'categories': [{'category': key, 'total': money(value)} for key, value in categories.items()],
            'top_products': [{**row, 'total': money(row['total'])} for row in sorted(products.values(), key=lambda row: (-row['quantity'], row['name']))[:10]],
        }
        if has_app_permission(request.user, 'reports:sensitive'):
            profit = net - costs
            result['profitability'] = {'net_income': money(net), 'cost_of_sales': money(costs) if not missing else None, 'gross_profit': money(profit) if not missing else None, 'margin_percent': str((profit / net * 100).quantize(Decimal('.01'))) if net and not missing else None, 'missing_cost_lines': missing}
            stock_cost = Decimal('0')
            stock_sale = Decimal('0')
            for product in Product.objects.filter(stock__gt=0):
                stock_cost += product.stock * product.cost_price
                stock_sale += product.stock * product.sale_price * 100 / (100 + product.tax_rate)
            result['warehouse'] = {'name': 'Bodega operativa única', 'as_of': timezone.now(), 'cost_value': money(stock_cost), 'net_sale_value': money(stock_sale), 'potential_margin': money(stock_sale - stock_cost)}
        return Response(result)
