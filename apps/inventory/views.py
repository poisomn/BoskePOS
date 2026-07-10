from django.db.models import ProtectedError
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
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ('name',)
    ordering_fields = ('name', 'sku', 'stock', 'sale_price', 'created_at')
