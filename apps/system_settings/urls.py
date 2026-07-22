from django.urls import path

from .views import BusinessSettingsView


app_name = 'system_settings'

urlpatterns = [
    path('business/', BusinessSettingsView.as_view(), name='business'),
]
