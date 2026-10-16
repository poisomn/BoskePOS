from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import BasePermission
from rest_framework.response import Response

from apps.accounts.permissions import has_role, ADMIN_ROLE, has_app_permission
from apps.utils.query_params import validated_filters
from .models import CashRegister, CashSession
from .serializers import RegisterSerializer, SessionSerializer, OpenSerializer, CloseSerializer, MovementInputSerializer, MovementSerializer
from .services import open_session, manual_movement, verify_admin_pin, close_session, lock_operation_users


class CashPermission(BasePermission):
    def has_permission(self, request, view):
        return has_role(request.user, ADMIN_ROLE) or has_app_permission(request.user, 'sales:complete')


class RegisterViewSet(viewsets.ModelViewSet):
    queryset = CashRegister.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = (CashPermission,)
    http_method_names = ('get', 'post', 'patch', 'head', 'options')

    def perform_update(self, serializer):
        from rest_framework.exceptions import ValidationError
        with transaction.atomic():
            register = CashRegister.objects.select_for_update().get(pk=serializer.instance.pk)
            if serializer.validated_data.get('is_active') is False and CashSession.objects.filter(register=register, closed_at__isnull=True).exists():
                raise ValidationError({'is_active': 'Cierra el turno antes de desactivar la caja.'})
            serializer.save()

    def get_permissions(self):
        if self.request.method not in ('GET', 'HEAD', 'OPTIONS'):
            from .user_views import AdminPermission
            return [AdminPermission()]
        return super().get_permissions()


class SessionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SessionSerializer
    permission_classes = (CashPermission,)
    from rest_framework.pagination import PageNumberPagination
    pagination_class = PageNumberPagination

    def get_queryset(self):
        qs = CashSession.objects.select_related('cashier', 'register', 'counted_by', 'authorized_by').prefetch_related('movements')
        if not has_role(self.request.user, ADMIN_ROLE):
            qs = qs.filter(cashier=self.request.user)
        params = validated_filters(self.request.query_params, ids=('cashier', 'register'))
        for key in ('cashier', 'register'):
            if params.get(key):
                qs = qs.filter(**{f'{key}_id': params[key]})
        if params.get('date_from'):
            qs = qs.filter(opened_at__date__gte=params['date_from'])
        if params.get('date_to'):
            qs = qs.filter(opened_at__date__lte=params['date_to'])
        return qs

    @action(detail=False, methods=('get',))
    def current(self, request):
        session = self.get_queryset().filter(cashier=request.user, closed_at__isnull=True).first()
        return Response(self.get_serializer(session).data if session else None)

    @action(detail=False, methods=('get',))
    def authorizers(self, request):
        users = get_user_model().objects.filter(is_active=True).filter(groups__name=ADMIN_ROLE) | get_user_model().objects.filter(is_active=True, is_superuser=True)
        return Response([{'id': user.pk, 'email': user.email} for user in users.exclude(authorization_pin_hash='').distinct()])

    @action(detail=False, methods=('post',))
    def open(self, request):
        data = OpenSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        session = open_session(user=request.user, register_id=data.validated_data['register'].pk, opening_amount=data.validated_data['opening_amount'])
        return Response(self.get_serializer(session).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=('get', 'post'))
    def movements(self, request, pk=None):
        session = self.get_object()
        if request.method == 'GET':
            return Response(MovementSerializer(session.movements.select_related('user'), many=True).data)
        data = MovementInputSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        event = manual_movement(user=request.user, session=session, **data.validated_data)
        return Response(MovementSerializer(event).data, status=201)

    @action(detail=True, methods=('post',))
    def close(self, request, pk=None):
        session = self.get_object()
        data = CloseSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        values = data.validated_data
        admin = verify_admin_pin(values['admin_id'], values['pin'])
        # Lock the authorizer so a concurrent role/PIN change cannot authorize closure.
        with transaction.atomic():
            current_admin = lock_operation_users(request.user, admin)
            from rest_framework.exceptions import PermissionDenied
            if not current_admin.is_active or not has_role(current_admin, ADMIN_ROLE) or current_admin.authorization_pin_hash != admin.authorization_pin_hash:
                raise PermissionDenied('La autorización ya no está vigente.')
            result = close_session(user=request.user, session=session, counted=values['counted'], notes=values['notes'], authorizer=current_admin)
        return Response(self.get_serializer(result).data)
