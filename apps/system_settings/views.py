from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import SystemSettingsPermission

from .models import BusinessSettings
from .serializers import BusinessSettingsSerializer


class BusinessSettingsView(APIView):
    permission_classes = (SystemSettingsPermission,)
    permission_action = 'business_settings'

    def get(self, request):
        serializer = BusinessSettingsSerializer(BusinessSettings.get_solo())
        return Response(serializer.data)

    def patch(self, request):
        settings = BusinessSettings.get_solo()
        serializer = BusinessSettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
