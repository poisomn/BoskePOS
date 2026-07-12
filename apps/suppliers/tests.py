from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Supplier
from apps.accounts.permissions import INVENTORY_ROLE


class SuppliersApiTests(APITestCase):
    def setUp(self):
        call_command('seed_roles', verbosity=0)
        self.user = get_user_model().objects.create_user(
            email='suppliers@boskepos.cl',
            password='strong-test-password',
        )
        self.user.groups.add(Group.objects.get(name=INVENTORY_ROLE))
        self.client.force_authenticate(user=self.user)

    def test_supplier_crud_normalizes_rut(self):
        create_response = self.client.post(
            reverse('suppliers:supplier-list'),
            {
                'name': 'Proveedor Industrial',
                'rut': '76.543.210-3',
                'email': 'ventas@proveedor.cl',
                'phone': '+56223456789',
                'address': 'Av. Industrial 100',
                'city': 'Santiago',
            },
            format='json',
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data['rut'], '76543210-3')

        supplier_id = create_response.data['id']
        detail_url = reverse('suppliers:supplier-detail', args=[supplier_id])

        update_response = self.client.patch(
            detail_url,
            {'phone': '+56229876543'},
            format='json',
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data['phone'], '+56229876543')

    def test_search_by_name_or_formatted_rut(self):
        Supplier.objects.create(name='Bosch Chile', rut='12345678-5')
        Supplier.objects.create(name='Makita Chile', rut='11111111-1')

        name_response = self.client.get(
            reverse('suppliers:supplier-list'),
            {'search': 'bosch'},
        )
        self.assertEqual(name_response.status_code, status.HTTP_200_OK)
        self.assertEqual(name_response.data['count'], 1)
        self.assertEqual(name_response.data['results'][0]['name'], 'Bosch Chile')

        rut_response = self.client.get(
            reverse('suppliers:supplier-list'),
            {'search': '11.111.111-1'},
        )
        self.assertEqual(rut_response.status_code, status.HTTP_200_OK)
        self.assertEqual(rut_response.data['count'], 1)
        self.assertEqual(rut_response.data['results'][0]['name'], 'Makita Chile')

    def test_rut_is_valid_and_unique_when_present(self):
        Supplier.objects.create(name='Proveedor Base', rut='12345678-5')

        invalid_response = self.client.post(
            reverse('suppliers:supplier-list'),
            {'name': 'Proveedor Invalido', 'rut': '12.345.678-9'},
            format='json',
        )
        self.assertEqual(invalid_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('rut', invalid_response.data)

        duplicate_response = self.client.post(
            reverse('suppliers:supplier-list'),
            {'name': 'Proveedor Duplicado', 'rut': '12.345.678-5'},
            format='json',
        )
        self.assertEqual(duplicate_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('rut', duplicate_response.data)

        without_rut_response = self.client.post(
            reverse('suppliers:supplier-list'),
            {'name': 'Proveedor sin RUT'},
            format='json',
        )
        self.assertEqual(without_rut_response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(without_rut_response.data['rut'])

    def test_filter_and_toggle_active_state(self):
        active = Supplier.objects.create(name='Proveedor Activo', rut='22222222-2')
        Supplier.objects.create(name='Proveedor Inactivo', rut='33333333-3', is_active=False)

        list_response = self.client.get(
            reverse('suppliers:supplier-list'),
            {'is_active': 'false'},
        )
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data['count'], 1)
        self.assertFalse(list_response.data['results'][0]['is_active'])

        deactivate_response = self.client.post(
            reverse('suppliers:supplier-deactivate', args=[active.id]),
        )
        self.assertEqual(deactivate_response.status_code, status.HTTP_200_OK)
        active.refresh_from_db()
        self.assertFalse(active.is_active)

        activate_response = self.client.post(
            reverse('suppliers:supplier-activate', args=[active.id]),
        )
        self.assertEqual(activate_response.status_code, status.HTTP_200_OK)
        active.refresh_from_db()
        self.assertTrue(active.is_active)

    def test_name_email_and_authentication_validation(self):
        name_response = self.client.post(
            reverse('suppliers:supplier-list'),
            {'name': '   '},
            format='json',
        )
        self.assertEqual(name_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', name_response.data)

        email_response = self.client.post(
            reverse('suppliers:supplier-list'),
            {'name': 'Proveedor Email', 'email': 'correo-invalido'},
            format='json',
        )
        self.assertEqual(email_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', email_response.data)

        self.client.force_authenticate(user=None)
        auth_response = self.client.get(reverse('suppliers:supplier-list'))
        self.assertEqual(auth_response.status_code, status.HTTP_401_UNAUTHORIZED)

