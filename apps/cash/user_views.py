from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from apps.accounts.permissions import has_role, ADMIN_ROLE, ROLE_LABELS
from apps.accounts.serializers import UserSerializer


class AdminPermission(BasePermission):
    def has_permission(self, request, view):
        return has_role(request.user, ADMIN_ROLE)


class PinSetupThrottle(UserRateThrottle):
    rate = '5/min'
    scope = 'pin_setup'


class StaffInput(serializers.Serializer):
    email = serializers.EmailField(required=False)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=tuple(ROLE_LABELS), required=False)
    is_active = serializers.BooleanField(required=False)
    password = serializers.CharField(write_only=True, required=False, min_length=8)


class StaffViewSet(viewsets.ViewSet):
    permission_classes = (AdminPermission,)

    def list(self, request):
        return Response(UserSerializer(get_user_model().objects.all().order_by('email'), many=True).data)

    def _save(self, request, pk=None):
        data = StaffInput(data=request.data)
        data.is_valid(raise_exception=True)
        values = dict(data.validated_data)
        with transaction.atomic():
            from django.shortcuts import get_object_or_404
            ids = {request.user.pk, int(pk)} if pk else {request.user.pk}
            actors = {item.pk: item for item in get_user_model().objects.select_for_update().filter(pk__in=ids).order_by('pk')}
            actor = actors[request.user.pk]
            if not actor.is_active or not has_role(actor, ADMIN_ROLE):
                raise serializers.ValidationError('Se requiere administrador activo.')
            user = get_object_or_404(get_user_model().objects.select_for_update(), pk=pk) if pk else get_user_model()()
            role = values.pop('role', None)
            password = values.pop('password', None)
            if pk and (values.get('is_active') is False or role == 'encargado_inventario'):
                from .models import CashSession
                if CashSession.objects.filter(cashier=user, closed_at__isnull=True).exists():
                    raise serializers.ValidationError('Cierra el turno del usuario antes de desactivarlo o retirarle acceso a caja.')
            if not pk and (not values.get('email') or not password or not role):
                raise serializers.ValidationError('Email, rol y contraseña son obligatorios.')
            if pk and user.is_superuser and (user.pk != actor.pk or (role and role != ADMIN_ROLE) or values.get('is_active') is False):
                raise serializers.ValidationError('El superusuario se administra mediante Django Admin.')
            if user.pk == actor.pk and (values.get('is_active') is False or (role and role != ADMIN_ROLE)):
                raise serializers.ValidationError('No puedes desactivar tu propia cuenta ni quitarte la administración.')
            email = values.get('email', user.email).lower()
            if get_user_model().objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
                raise serializers.ValidationError({'email': 'Este correo ya está registrado.'})
            for key, value in values.items():
                setattr(user, key, value)
            user.email = email
            if password:
                try:
                    validate_password(password, user)
                except DjangoValidationError as exc:
                    raise serializers.ValidationError({'password': exc.messages}) from exc
                user.set_password(password)
            if not user.is_active or (role and role != ADMIN_ROLE):
                user.authorization_pin_hash = ''
            user.save()
            if role:
                user.groups.set([Group.objects.get_or_create(name=role)[0]])
            for attribute in ('_boskepos_roles_cache', '_boskepos_permissions_cache'):
                user.__dict__.pop(attribute, None)
        return Response(UserSerializer(user).data, status=200 if pk else 201)

    def create(self, request):
        return self._save(request)

    def partial_update(self, request, pk=None):
        return self._save(request, pk)

    @action(detail=False, methods=('post',), url_path='my-pin', throttle_classes=(PinSetupThrottle,))
    def my_pin(self, request):
        class PinInput(serializers.Serializer):
            pin = serializers.RegexField(r'^[0-9]{4}$', write_only=True)
            password = serializers.CharField(write_only=True)
        data = PinInput(data=request.data)
        data.is_valid(raise_exception=True)
        with transaction.atomic():
            user = get_user_model().objects.select_for_update().get(pk=request.user.pk)
            if not user.is_active or not has_role(user, ADMIN_ROLE):
                raise serializers.ValidationError('Se requiere administrador activo.')
            if not user.check_password(data.validated_data['password']):
                raise serializers.ValidationError({'password': 'Contraseña actual incorrecta.'})
            user.authorization_pin_hash = make_password(data.validated_data['pin'])
            user.pin_failed_attempts = 0
            user.pin_locked_until = None
            user.save(update_fields=('authorization_pin_hash', 'pin_failed_attempts', 'pin_locked_until'))
        return Response({'detail': 'PIN personal actualizado.'})
