from django.urls import path

from .views import BusinessSettingsView, ReceiptSettingsView


app_name = 'system_settings'

urlpatterns = [
    path('receipt/', ReceiptSettingsView.as_view(), name='receipt'),
    path('business/', BusinessSettingsView.as_view(), name='business'),
]
