from rest_framework.routers import DefaultRouter
from .views import RegisterViewSet, SessionViewSet
from .user_views import StaffViewSet

router = DefaultRouter()
router.register('registers', RegisterViewSet, basename='cash-register')
router.register('sessions', SessionViewSet, basename='cash-session')
router.register('users', StaffViewSet, basename='cash-user')
urlpatterns = router.urls
