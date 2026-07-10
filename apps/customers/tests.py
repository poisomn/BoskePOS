from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Customer


class CustomersApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email='customers@boskepos.cl',
            password='strong-test-password',
        )
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
        self.assertEqual(len(name_response.data), 1)
        self.assertEqual(name_response.data[0]['name'], 'Maria Gonzalez')

        rut_response = self.client.get(
            reverse('customers:customer-list'),
            {'search': '22222222'},
        )
        self.assertEqual(rut_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(rut_response.data), 1)
        self.assertEqual(rut_response.data[0]['name'], 'Carlos Rojas')

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
