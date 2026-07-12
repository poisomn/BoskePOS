from django.db.models import Q
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from apps.accounts.permissions import CustomerPermission
from apps.utils.rut import RutError, normalize_rut

from .models import Customer
from .serializers import CustomerSerializer


class CustomerPagination(PageNumberPagination):
    page_size = 8
    page_size_query_param = 'page_size'
    max_page_size = 100


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    pagination_class = CustomerPagination
    filter_backends = (filters.OrderingFilter,)
    ordering_fields = ('name', 'rut', 'created_at', 'updated_at')
    permission_classes = (CustomerPermission,)

    def get_queryset(self):
        queryset = super().get_queryset()
        is_active = self.request.query_params.get('is_active')
        search = self.request.query_params.get('search', '').strip()

        if search:
            rut_term = self._normalize_search_rut(search)
            query = (
                Q(name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
                | Q(rut__icontains=rut_term or search)
            )
            queryset = queryset.filter(query)

        if is_active is None or is_active == '':
            return queryset

        normalized_value = is_active.strip().lower()
        if normalized_value in ('true', '1', 'yes'):
            return queryset.filter(is_active=True)
        if normalized_value in ('false', '0', 'no'):
            return queryset.filter(is_active=False)

        return queryset

    def _normalize_search_rut(self, value):
        try:
            return normalize_rut(value)
        except RutError:
            return value.replace('.', '').replace(' ', '').upper()

    @action(detail=True, methods=('post',))
    def activate(self, request, pk=None):
        customer = self.get_object()
        customer.is_active = True
        customer.save(update_fields=('is_active', 'updated_at'))
        return Response(self.get_serializer(customer).data)

    @action(detail=True, methods=('post',))
    def deactivate(self, request, pk=None):
        customer = self.get_object()
        customer.is_active = False
        customer.save(update_fields=('is_active', 'updated_at'))
        return Response(self.get_serializer(customer).data)
