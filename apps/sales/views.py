from django.db.models import Q
from rest_framework import filters, generics, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import SalePermission
from apps.inventory.models import Product

from .models import Sale
from .serializers import (
    PosCartQuoteInputSerializer,
    PosProductSerializer,
    SaleCompleteSerializer,
    SaleCreateSerializer,
    SaleSerializer,
    SaleUpdateSerializer,
)
from .services import (
    SaleConflict,
    build_pos_cart_quote,
    cancel_sale,
    complete_sale,
    discard_pending_sale,
    register_sale,
    update_pending_sale,
)


class SalePagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class PosProductSearchView(generics.ListAPIView):
    serializer_class = PosProductSerializer
    permission_classes = (SalePermission,)
    permission_action = 'pos_products'

    def get_queryset(self):
        queryset = Product.objects.filter(is_active=True).order_by('name')
        search = self.request.query_params.get('search', '').strip()

        if not search:
            return queryset

        return queryset.filter(
            Q(name__icontains=search)
            | Q(sku__icontains=search.upper())
            | Q(barcode__icontains=search)
        )


class PosCartQuoteView(APIView):
    permission_classes = (SalePermission,)
    permission_action = 'pos_quote'

    def post(self, request):
        serializer = PosCartQuoteInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        quote = build_pos_cart_quote(serializer.validated_data['items'])
        return Response(quote, status=status.HTTP_200_OK)


class SaleViewSet(
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    pagination_class = SalePagination
    filter_backends = (filters.OrderingFilter,)
    ordering_fields = ('created_at', 'total', 'status')
    permission_classes = (SalePermission,)

    def get_queryset(self):
        queryset = (
            Sale.objects
            .select_related('customer', 'user')
            .prefetch_related('items__product')
            .order_by('-created_at')
        )

        status_value = self.request.query_params.get('status')
        customer = self.request.query_params.get('customer')
        user = self.request.query_params.get('user')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        search = self.request.query_params.get('search', '').strip()

        if status_value:
            queryset = queryset.filter(status=status_value)
        if customer:
            queryset = queryset.filter(customer_id=customer)
        if user:
            queryset = queryset.filter(user_id=user)
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)
        if search:
            query = (
                Q(customer__name__icontains=search)
                | Q(customer__rut__icontains=search.replace('.', '').replace(' ', '').upper())
                | Q(items__product_name__icontains=search)
                | Q(items__product_sku__icontains=search.upper())
            )
            if search.isdigit():
                query |= Q(id=int(search))
            queryset = queryset.filter(query).distinct()

        return queryset

    def get_serializer_class(self):
        if self.action == 'create':
            return SaleCreateSerializer
        if self.action in {'update', 'partial_update'}:
            return SaleUpdateSerializer
        return SaleSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        sale = register_sale(
            user=request.user,
            customer=serializer.validated_data.get('customer_id'),
            items=serializer.validated_data['items'],
            status=serializer.validated_data.get('status', Sale.Status.COMPLETED),
            payment_method=serializer.validated_data.get(
                'payment_method',
                Sale.PaymentMethod.CASH,
            ),
            amount_paid=serializer.validated_data.get('amount_paid'),
            notes=serializer.validated_data.get('notes', ''),
        )

        output_serializer = SaleSerializer(sale)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        try:
            sale = update_pending_sale(
                sale=self.get_object(),
                user=request.user,
                customer=serializer.validated_data.get('customer_id'),
                items=serializer.validated_data['items'],
                payment_method=serializer.validated_data.get(
                    'payment_method',
                    Sale.PaymentMethod.CASH,
                ),
                amount_paid=serializer.validated_data.get('amount_paid'),
                notes=serializer.validated_data.get('notes', ''),
            )
        except SaleConflict as exc:
            return Response({'detail': exc.message}, status=status.HTTP_409_CONFLICT)

        return Response(SaleSerializer(sale).data)

    @action(detail=True, methods=('post',), url_path='complete')
    def complete(self, request, pk=None):
        serializer = SaleCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            sale = complete_sale(
                sale=self.get_object(),
                user=request.user,
                payment_method=serializer.validated_data.get(
                    'payment_method',
                    Sale.PaymentMethod.CASH,
                ),
                amount_paid=serializer.validated_data.get('amount_paid'),
                notes=serializer.validated_data.get('notes'),
            )
        except SaleConflict as exc:
            return Response({'detail': exc.message}, status=status.HTTP_409_CONFLICT)

        return Response(SaleSerializer(sale).data)

    @action(detail=True, methods=('post',), url_path='cancel')
    def cancel(self, request, pk=None):
        try:
            sale = cancel_sale(sale=self.get_object(), user=request.user)
        except SaleConflict as exc:
            return Response({'detail': exc.message}, status=status.HTTP_409_CONFLICT)

        return Response(SaleSerializer(sale).data)

    @action(detail=True, methods=('post',), url_path='discard')
    def discard(self, request, pk=None):
        try:
            discard_pending_sale(sale=self.get_object())
        except SaleConflict as exc:
            return Response({'detail': exc.message}, status=status.HTTP_409_CONFLICT)

        return Response(status=status.HTTP_204_NO_CONTENT)
