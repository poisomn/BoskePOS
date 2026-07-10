from django.db.models import Q
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.inventory.models import Product

from .serializers import PosCartQuoteInputSerializer, PosProductSerializer
from .services import build_pos_cart_quote


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
