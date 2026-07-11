from django.db.models import F, ProtectedError, Q
from django.utils.dateparse import parse_date
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

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

    def get_queryset(self):
        queryset = super().get_queryset()
        category = self.request.query_params.get('category')
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
                    'product': ProductBarcodeLookupSerializer(product).data,
                },
                status=status.HTTP_409_CONFLICT,
            )

        serializer = ProductBarcodeLookupSerializer(product)
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

    def get_queryset(self):
        queryset = super().get_queryset()
        product = self.request.query_params.get('product')
        movement_type = self.request.query_params.get('movement_type')
        user = self.request.query_params.get('user')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        search = self.request.query_params.get('search', '').strip()

        if product:
            queryset = queryset.filter(product_id=product)

        if movement_type:
            queryset = queryset.filter(movement_type=movement_type)

        if user:
            queryset = queryset.filter(user_id=user)

        if date_from:
            parsed_date_from = parse_date(date_from)
            if parsed_date_from:
                queryset = queryset.filter(created_at__date__gte=parsed_date_from)

        if date_to:
            parsed_date_to = parse_date(date_to)
            if parsed_date_to:
                queryset = queryset.filter(created_at__date__lte=parsed_date_to)

        if search:
            queryset = queryset.filter(
                Q(product__name__icontains=search)
                | Q(product__sku__icontains=search.upper())
                | Q(product__barcode__icontains=search)
                | Q(reason__icontains=search)
            )

        return queryset
