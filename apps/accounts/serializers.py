from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .permissions import get_user_app_permissions, get_user_roles


class UserSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = get_user_model()
        fields = (
            'id',
            'email',
            'first_name',
            'last_name',
            'is_staff',
            'is_active',
            'roles',
            'permissions',
            'date_joined',
        )
        read_only_fields = fields

    def get_roles(self, obj):
        return sorted(get_user_roles(obj))

    def get_permissions(self, obj):
        return sorted(get_user_app_permissions(obj))


class LoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def save(self, **kwargs):
        try:
            RefreshToken(self.validated_data['refresh']).blacklist()
        except TokenError as exc:
            raise serializers.ValidationError({'refresh': 'Invalid refresh token.'}) from exc
