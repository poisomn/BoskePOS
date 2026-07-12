from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.utils.rut import RutError, normalize_rut
from apps.accounts.permissions import SELLER_ROLE

from .models import Customer


class RutUtilityTests(APITestCase):
    def test_normalizes_common_chilean_rut_formats(self):
        self.assertEqual(normalize_rut('12.345.678-5'), '12345678-5')
        self.assertEqual(normalize_rut(' 1 000 005 k '), '1000005-K')
        self.assertIsNone(normalize_rut(''))

    def test_rejects_invalid_rut_verifier(self):
        with self.assertRaises(RutError):
            normalize_rut('12.345.678-9')


class CustomersApiTests(APITestCase):
    def setUp(self):
        call_command('seed_roles', verbosity=0)
        self.user = get_user_model().objects.create_user(
            email='customers@boskepos.cl',
            password='strong-test-password',
        )
        self.user.groups.add(Group.objects.get(name=SELLER_ROLE))
        self.client.force_authenticate(user=self.user)

    def test_customer_crud(self):
        create_response = self.client.post(
            reverse('customers:customer-list'),
            {
                'name': 'Juan Perez',
                'rut': '12.345.678-5',
                'email': 'juan@example.com',
                'phone': '+56912345678',
                'address': 'Av. Siempre Viva 123',
                'city': 'Santiago',
            },
            format='json',
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data['rut'], '12345678-5')

        customer_id = create_response.data['id']
        detail_url = reverse('customers:customer-detail', args=[customer_id])

        update_response = self.client.patch(
            detail_url,
            {'phone': '+56987654321'},
            format='json',
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data['phone'], '+56987654321')

        delete_response = self.client.delete(detail_url)
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

    def test_search_by_name_or_rut(self):
        Customer.objects.create(name='Maria Gonzalez', rut='11111111-1')
        Customer.objects.create(name='Carlos Rojas', rut='22222222-2')

        name_response = self.client.get(
            reverse('customers:customer-list'),
            {'search': 'maria'},
        )
        self.assertEqual(name_response.status_code, status.HTTP_200_OK)
        self.assertEqual(name_response.data['count'], 1)
        self.assertEqual(name_response.data['results'][0]['name'], 'Maria Gonzalez')

        rut_response = self.client.get(
            reverse('customers:customer-list'),
            {'search': '22.222.222-2'},
        )
        self.assertEqual(rut_response.status_code, status.HTTP_200_OK)
        self.assertEqual(rut_response.data['count'], 1)
        self.assertEqual(rut_response.data['results'][0]['name'], 'Carlos Rojas')

    def test_filter_by_active_state_and_toggle_state(self):
        active = Customer.objects.create(name='Cliente Activo', rut='33333333-3')
        Customer.objects.create(name='Cliente Inactivo', rut='44444444-4', is_active=False)

        list_response = self.client.get(
            reverse('customers:customer-list'),
            {'is_active': 'false'},
        )
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data['count'], 1)
        self.assertFalse(list_response.data['results'][0]['is_active'])

        deactivate_response = self.client.post(
            reverse('customers:customer-deactivate', args=[active.id]),
        )
        self.assertEqual(deactivate_response.status_code, status.HTTP_200_OK)
        active.refresh_from_db()
        self.assertFalse(active.is_active)

        activate_response = self.client.post(
            reverse('customers:customer-activate', args=[active.id]),
        )
        self.assertEqual(activate_response.status_code, status.HTTP_200_OK)
        active.refresh_from_db()
        self.assertTrue(active.is_active)

    def test_rut_must_be_valid_when_provided(self):
        response = self.client.post(
            reverse('customers:customer-list'),
            {'name': 'Cliente Invalido', 'rut': '12.345.678-9'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('rut', response.data)

    def test_rut_is_optional_but_unique_when_present(self):
        Customer.objects.create(name='Cliente Base', rut='12345678-5')

        without_rut_response = self.client.post(
            reverse('customers:customer-list'),
            {'name': 'Cliente sin RUT'},
            format='json',
        )
        self.assertEqual(without_rut_response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(without_rut_response.data['rut'])

        duplicate_response = self.client.post(
            reverse('customers:customer-list'),
            {'name': 'Cliente Duplicado', 'rut': '12.345.678-5'},
            format='json',
        )
        self.assertEqual(duplicate_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('rut', duplicate_response.data)

    def test_name_and_email_validation(self):
        name_response = self.client.post(
            reverse('customers:customer-list'),
            {'name': '   '},
            format='json',
        )
        self.assertEqual(name_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', name_response.data)

        email_response = self.client.post(
            reverse('customers:customer-list'),
            {'name': 'Cliente Email', 'email': 'correo-invalido'},
            format='json',
        )
        self.assertEqual(email_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', email_response.data)

    def test_anonymous_user_cannot_access_customers(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(reverse('customers:customer-list'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

