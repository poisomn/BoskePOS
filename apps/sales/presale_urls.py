from rest_framework.routers import DefaultRouter
from .presale_views import AuditViewSet, StationViewSet, TicketViewSet

router = DefaultRouter()
router.register('stations', StationViewSet, basename='presale-station')
router.register('tickets', TicketViewSet, basename='presale-ticket')
router.register('audit', AuditViewSet, basename='operation-audit')
urlpatterns = router.urls
