from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import PosCartQuoteView, PosProductSearchView, SaleViewSet


app_name = 'sales'

router = DefaultRouter()
router.register('sales', SaleViewSet, basename='sale')

urlpatterns = [
    path('pos/products/', PosProductSearchView.as_view(), name='pos-product-search'),
    path('pos/cart/quote/', PosCartQuoteView.as_view(), name='pos-cart-quote'),
    path('', include(router.urls)),
]
