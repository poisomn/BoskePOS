from django.urls import path

from .views import AuthenticatedUserView, LoginView, LogoutView, RefreshTokenView


app_name = 'accounts'

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('token/refresh/', RefreshTokenView.as_view(), name='token_refresh'),
    path('me/', AuthenticatedUserView.as_view(), name='me'),
    path('logout/', LogoutView.as_view(), name='logout'),
]
