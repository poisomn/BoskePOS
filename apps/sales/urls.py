from django.urls import path

from .views import PosCartQuoteView, PosProductSearchView


app_name = 'sales'

urlpatterns = [
    path('pos/products/', PosProductSearchView.as_view(), name='pos-product-search'),
    path('pos/cart/quote/', PosCartQuoteView.as_view(), name='pos-cart-quote'),
]
