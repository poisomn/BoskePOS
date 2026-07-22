from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.permissions import ADMIN_ROLE, SELLER_ROLE

from .models import BusinessSettings


class BusinessSettingsApiTests(APITestCase):
    def setUp(self):
        call_command('seed_roles', verbosity=0)
        self.admin = get_user_model().objects.create_user(
            email='settings-admin@boskepos.cl',
            password='strong-test-password',
        )
        self.admin.groups.add(Group.objects.get(name=ADMIN_ROLE))
        self.seller = get_user_model().objects.create_user(
            email='settings-seller@boskepos.cl',
            password='strong-test-password',
        )
        self.seller.groups.add(Group.objects.get(name=SELLER_ROLE))

    def test_admin_can_read_and_update_business_settings(self):
        self.client.force_authenticate(user=self.admin)

        read_response = self.client.get(reverse('system_settings:business'))
        self.assertEqual(read_response.status_code, status.HTTP_200_OK)
        self.assertEqual(read_response.data['business_name'], 'BoskePOS')

        update_response = self.client.patch(
            reverse('system_settings:business'),
            {
                'business_name': 'Ferreteria Boske',
                'currency': 'clp',
                'default_tax_rate': '19.00',
            },
            format='json',
        )

        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data['business_name'], 'Ferreteria Boske')
        self.assertEqual(update_response.data['currency'], 'CLP')
        self.assertEqual(BusinessSettings.objects.count(), 1)

    def test_seller_cannot_update_business_settings(self):
        self.client.force_authenticate(user=self.seller)

        response = self.client.patch(
            reverse('system_settings:business'),
            {'business_name': 'Cambio indebido'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_requires_authentication(self):
        response = self.client.get(reverse('system_settings:business'))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
