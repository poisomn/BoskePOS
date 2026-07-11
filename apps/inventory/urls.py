from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CategoryViewSet, ProductViewSet, StockMovementViewSet


app_name = 'inventory'

router = DefaultRouter()
router.register('categories', CategoryViewSet, basename='category')
router.register('products', ProductViewSet, basename='product')
router.register('movements', StockMovementViewSet, basename='movement')

urlpatterns = [
    path('', include(router.urls)),
]
