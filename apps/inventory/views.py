from django.db.models import F, ProtectedError
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer


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
