from django.db.models import Q
from rest_framework import generics, mixins, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.inventory.models import Product

from .models import Sale
from .serializers import (
    PosCartQuoteInputSerializer,
    PosProductSerializer,
    SaleCreateSerializer,
    SaleSerializer,
)
from .services import build_pos_cart_quote, register_sale


class PosProductSearchView(generics.ListAPIView):
    serializer_class = PosProductSerializer

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
    def post(self, request):
        serializer = PosCartQuoteInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        quote = build_pos_cart_quote(serializer.validated_data['items'])
        return Response(quote, status=status.HTTP_200_OK)


class SaleViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Sale.objects.select_related('customer', 'user').prefetch_related('items')

    def get_serializer_class(self):
        if self.action == 'create':
            return SaleCreateSerializer
        return SaleSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        sale = register_sale(
            user=request.user,
            customer=serializer.validated_data.get('customer_id'),
            items=serializer.validated_data['items'],
        )

        output_serializer = SaleSerializer(sale)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)
