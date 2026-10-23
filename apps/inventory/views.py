from django.db.models import F, ProtectedError, Q
from rest_framework import filters, status, viewsets, serializers
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from apps.accounts.permissions import InventoryPermission, StockMovementPermission
from apps.utils.query_params import validated_filters

from .models import Category, Product, StockMovement
from .serializers import (
    CategorySerializer,
    ProductBarcodeLookupSerializer,
    ProductSerializer,
    StockAdjustmentSerializer,
    StockMovementSerializer,
)
from .services import StockMovementError


class StandardPageNumberPagination(PageNumberPagination):
    page_size = 8
    page_size_query_param = 'page_size'
    max_page_size = 100


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    pagination_class = StandardPageNumberPagination
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ('name',)
    ordering_fields = ('name', 'created_at')
    permission_classes = (InventoryPermission,)

    def get_queryset(self):
        queryset = super().get_queryset()
        is_active = self.request.query_params.get('is_active')

        if is_active is None or is_active == '':
            return queryset

        normalized_value = is_active.strip().lower()
        if normalized_value in ('true', '1', 'yes'):
            return queryset.filter(is_active=True)
        if normalized_value in ('false', '0', 'no'):
            return queryset.filter(is_active=False)

        return queryset

    def destroy(self, request, *args, **kwargs):
        category = self.get_object()

        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {
                    'detail': (
                        'No se puede eliminar una categoria que tiene productos asociados. '
                        'Desactivala para conservar la integridad del inventario.'
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )

    @action(detail=True, methods=('post',))
    def activate(self, request, pk=None):
        category = self.get_object()
        category.is_active = True
        category.save(update_fields=('is_active', 'updated_at'))
        serializer = self.get_serializer(category)
        return Response(serializer.data)

    @action(detail=True, methods=('post',))
    def deactivate(self, request, pk=None):
        category = self.get_object()
        category.is_active = False
        category.save(update_fields=('is_active', 'updated_at'))
        serializer = self.get_serializer(category)
        return Response(serializer.data)


class ProductViewSet(viewsets.ModelViewSet):
    @action(detail=False, methods=('get',))
    def replenishment(self, request):
        from django.db.models import F, OuterRef, Subquery
        from apps.purchases.models import PurchaseItem
        usual = PurchaseItem.objects.filter(product_id=OuterRef('pk'), purchase__status__in=('confirmed', 'partial'),
            received_quantity__gt=0, purchase__supplier__is_active=True).order_by('-purchase__created_at', '-pk')
        products = self.get_queryset().filter(is_active=True).filter(Q(stock__lt=F('minimum_stock')) | Q(stock=0)).annotate(
            usual_supplier_id=Subquery(usual.values('purchase__supplier_id')[:1]),
            usual_supplier_name=Subquery(usual.values('purchase__supplier__name')[:1]))
        page = self.paginate_queryset(products)
        data = ProductSerializer(page, many=True, context={'request': request}).data
        for row, product in zip(data, page):
            row['usual_supplier_id'] = product.usual_supplier_id
            row['usual_supplier_name'] = product.usual_supplier_name
        return self.get_paginated_response(data)

    @action(detail=True, methods=('get',), url_path='monthly-activity')
    def monthly_activity(self, request, pk=None):
        from datetime import date
        from decimal import Decimal
        from django.utils import timezone
        from django.db.models import Sum
        from django.db.models.functions import TruncMonth
        from apps.purchases.models import PurchaseItem
        from apps.sales.models import SaleItem
        product = self.get_object()
        year_field = serializers.IntegerField(min_value=2000, max_value=2100)
        year = year_field.run_validation(request.query_params.get('year', timezone.localdate().year))
        zone = timezone.get_current_timezone()
        sales = SaleItem.objects.filter(product=product, sale__status='completed', sale__completed_at__year=year).annotate(month=TruncMonth('sale__completed_at', tzinfo=zone)).values('month').annotate(quantity=Sum('quantity'), total=Sum('line_total'))
        purchases = PurchaseItem.objects.filter(product=product, purchase__status='confirmed', purchase__confirmed_at__year=year).annotate(month=TruncMonth('purchase__confirmed_at', tzinfo=zone)).values('month').annotate(quantity=Sum('quantity'))
        sold = {row['month'].month: row for row in sales}
        bought = {row['month'].month: row for row in purchases}
        return Response({'product': product.pk, 'name': product.name, 'stock': product.stock, 'minimum_stock': product.minimum_stock, 'year': year, 'months': [{'month': date(year, month, 1).isoformat(), 'purchased_quantity': bought.get(month, {}).get('quantity', 0), 'sold_quantity': sold.get(month, {}).get('quantity', 0), 'sales_total': str(sold.get(month, {}).get('total', Decimal('0')))} for month in range(1, 13)]})

    queryset = Product.objects.select_related('category')
    serializer_class = ProductSerializer
    pagination_class = StandardPageNumberPagination
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ('name', 'sku', 'barcode')
    ordering_fields = (
        'name',
        'sku',
        'stock',
        'sale_price',
        'created_at',
        'updated_at',
    )
    permission_classes = (InventoryPermission,)

    def get_queryset(self):
        queryset = super().get_queryset()
        category = validated_filters(self.request.query_params, ids=('category',)).get('category')
        is_active = self.request.query_params.get('is_active')
        low_stock = self.request.query_params.get('low_stock')
        out_of_stock = self.request.query_params.get('out_of_stock')
        sku = self.request.query_params.get('sku')
        barcode = self.request.query_params.get('barcode')

        if category:
            queryset = queryset.filter(category_id=category)

        if is_active is not None and is_active != '':
            normalized_value = is_active.strip().lower()
            if normalized_value in ('true', '1', 'yes'):
                queryset = queryset.filter(is_active=True)
            elif normalized_value in ('false', '0', 'no'):
                queryset = queryset.filter(is_active=False)

        if low_stock is not None and low_stock.strip().lower() in ('true', '1', 'yes'):
            queryset = queryset.filter(stock__lte=F('minimum_stock'))

        if out_of_stock is not None and out_of_stock.strip().lower() in ('true', '1', 'yes'):
            queryset = queryset.filter(stock=0)

        if sku:
            queryset = queryset.filter(sku=sku.strip().upper())

        if barcode:
            queryset = queryset.filter(barcode=barcode.strip())

        return queryset

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {'detail': 'El producto tiene operaciones asociadas. Desactivalo para conservar su historial.'},
                status=status.HTTP_409_CONFLICT,
            )

    @action(
        detail=False,
        methods=('get',),
        url_path=r'by-barcode/(?P<barcode>[^/]+)',
    )
    def by_barcode(self, request, barcode=None):
        normalized_barcode = barcode.strip() if barcode else ''

        if not normalized_barcode:
            return Response(
                {'barcode': ['El codigo de barras es obligatorio.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(normalized_barcode) > Product._meta.get_field('barcode').max_length:
            return Response(
                {'barcode': ['El codigo de barras excede el largo maximo permitido.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        product = (
            Product.objects.select_related('category')
            .filter(barcode=normalized_barcode)
            .first()
        )

        if product is None:
            return Response(
                {'detail': 'No existe un producto asociado a este codigo de barras.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not product.is_active:
            return Response(
                {
                    'detail': 'El producto asociado a este codigo de barras esta inactivo.',
                    'product': ProductBarcodeLookupSerializer(
                        product,
                        context={'request': request},
                    ).data,
                },
                status=status.HTTP_409_CONFLICT,
            )

        serializer = ProductBarcodeLookupSerializer(product, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=('post',))
    def activate(self, request, pk=None):
        product = self.get_object()
        product.is_active = True
        product.save(update_fields=('is_active', 'updated_at'))
        serializer = self.get_serializer(product)
        return Response(serializer.data)

    @action(detail=True, methods=('post',))
    def deactivate(self, request, pk=None):
        product = self.get_object()
        product.is_active = False
        product.save(update_fields=('is_active', 'updated_at'))
        serializer = self.get_serializer(product)
        return Response(serializer.data)

    @action(detail=True, methods=('post',), url_path='adjust-stock')
    def adjust_stock(self, request, pk=None):
        product = self.get_object()
        serializer = StockAdjustmentSerializer(
            data=request.data,
            context={'product': product, 'request': request},
        )
        serializer.is_valid(raise_exception=True)
        try:
            movement = serializer.save()
        except StockMovementError as error:
            field = error.field or 'detail'
            payload = {field: [error.message]} if field != 'detail' else {'detail': error.message}
            return Response(payload, status=status.HTTP_409_CONFLICT)

        output_serializer = StockMovementSerializer(movement)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StockMovement.objects.select_related('product', 'product__category', 'user')
    serializer_class = StockMovementSerializer
    pagination_class = StandardPageNumberPagination
    filter_backends = (filters.OrderingFilter,)
    ordering_fields = ('created_at', 'movement_type', 'quantity')
    permission_classes = (StockMovementPermission,)

    def get_queryset(self):
        queryset = super().get_queryset()
        params = validated_filters(self.request.query_params, ids=('product', 'user'),
                                   choices={'movement_type': StockMovement.MovementType.values})
        product = params.get('product')
        movement_type = params.get('movement_type')
        user = params.get('user')
        date_from = params.get('date_from')
        date_to = params.get('date_to')
        search = self.request.query_params.get('search', '').strip()

        if product:
            queryset = queryset.filter(product_id=product)

        if movement_type:
            queryset = queryset.filter(movement_type=movement_type)

        if user:
            queryset = queryset.filter(user_id=user)

        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)

        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)

        if search:
            queryset = queryset.filter(
                Q(product__name__icontains=search)
                | Q(product__sku__icontains=search.upper())
                | Q(product__barcode__icontains=search)
                | Q(reason__icontains=search)
                | Q(reference__icontains=search)
            )

        return queryset
