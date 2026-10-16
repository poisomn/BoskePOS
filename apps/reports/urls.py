from django.urls import path
from .views import OperationsReportView

urlpatterns = [path('operations/', OperationsReportView.as_view())]
