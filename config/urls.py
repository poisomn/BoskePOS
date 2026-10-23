from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from .health import health


urlpatterns = [
    path('api/presales/', include('apps.sales.presale_urls')),
    path('api/cash/', include('apps.cash.urls')),
    path('api/reports/', include('apps.reports.urls')),
    path('api/health/', health, name='health'),
    path('admin/', admin.site.urls),
    path('api/accounts/', include('apps.accounts.urls')),
    path('api/customers/', include('apps.customers.urls')),
    path('api/dashboard/', include('apps.dashboard.urls')),
    path('api/inventory/', include('apps.inventory.urls')),
    path('api/purchases/', include('apps.purchases.urls')),
    path('api/sales/', include('apps.sales.urls')),
    path('api/settings/', include('apps.system_settings.urls')),
    path('api/suppliers/', include('apps.suppliers.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
