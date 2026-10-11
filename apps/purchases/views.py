from django.db.models import Q
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from apps.accounts.permissions import PurchasePermission
from apps.utils.query_params import validated_filters

from .models import Purchase
from .serializers import PurchaseListSerializer, PurchaseSerializer, PurchaseWriteSerializer
from .services import PurchaseConflict, cancel_purchase, confirm_purchase, discard_purchase_draft


class PurchasePagination(PageNumberPagination):
    page_size = 8
    page_size_query_param = 'page_size'
    max_page_size = 100


class PurchaseViewSet(viewsets.ModelViewSet):
    pagination_class = PurchasePagination
    filter_backends = (filters.OrderingFilter,)
    ordering_fields = ('created_at', 'total', 'status')
    permission_classes = (PurchasePermission,)

    def get_queryset(self):
        queryset = Purchase.objects.select_related('supplier', 'user').order_by('-created_at')

        if self.action == 'retrieve':
            queryset = queryset.prefetch_related('items__product')

        params = validated_filters(self.request.query_params, ids=('supplier', 'user'),
                                   choices={'status': Purchase.Status.values})
        supplier = params.get('supplier')
        status_value = params.get('status')
        date_from = params.get('date_from')
        date_to = params.get('date_to')
        user = params.get('user')
        search = self.request.query_params.get('search', '').strip()

        if supplier:
            queryset = queryset.filter(supplier_id=supplier)
        if status_value:
            queryset = queryset.filter(status=status_value)
        if user:
            queryset = queryset.filter(user_id=user)
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)
        if search:
            queryset = queryset.filter(
                Q(id__icontains=search)
                | Q(reference__icontains=search)
                | Q(supplier__name__icontains=search)
                | Q(supplier__rut__icontains=search.replace('.', '').replace(' ', '').upper())
            )

        return queryset

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return PurchaseWriteSerializer
        if self.action == 'list':
            return PurchaseListSerializer
        return PurchaseSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        purchase = serializer.save()
        return Response(PurchaseSerializer(purchase).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        purchase = self.get_object()
        serializer = self.get_serializer(purchase, data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            purchase = serializer.save()
        except PurchaseConflict as exc:
            return Response({'detail': exc.message}, status=status.HTTP_409_CONFLICT)
        return Response(PurchaseSerializer(purchase).data)

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        try:
            discard_purchase_draft(purchase=self.get_object())
        except PurchaseConflict as exc:
            return Response({'detail': exc.message}, status=status.HTTP_409_CONFLICT)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=('post',))
    def confirm(self, request, pk=None):
        try:
            purchase = confirm_purchase(purchase=self.get_object(), user=request.user)
        except PurchaseConflict as exc:
            return Response({'detail': exc.message}, status=status.HTTP_409_CONFLICT)
        return Response(PurchaseSerializer(purchase).data)

    @action(detail=True, methods=('post',), url_path='cancel')
    def cancel(self, request, pk=None):
        try:
            purchase = cancel_purchase(purchase=self.get_object(), user=request.user)
        except PurchaseConflict as exc:
            return Response({'detail': exc.message}, status=status.HTTP_409_CONFLICT)
        return Response(PurchaseSerializer(purchase).data)
