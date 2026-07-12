from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.permissions import ADMIN_ROLE, INVENTORY_ROLE, SELLER_ROLE
from apps.inventory.models import Product
from apps.sales.models import Sale


class AccountsApiTests(APITestCase):
    def setUp(self):
        call_command('seed_roles', verbosity=0)
        self.user = get_user_model().objects.create_user(
            email='admin@boskepos.cl',
            password='strong-test-password',
            first_name='Admin',
            last_name='Boske',
        )

    def test_login_returns_tokens_and_user(self):
        response = self.client.post(
            reverse('accounts:login'),
            {'email': 'admin@boskepos.cl', 'password': 'strong-test-password'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['email'], self.user.email)
        self.assertIn('roles', response.data['user'])
        self.assertIn('permissions', response.data['user'])

    def test_login_rejects_inactive_user(self):
        self.user.is_active = False
        self.user.save(update_fields=('is_active',))

        response = self.client.post(
            reverse('accounts:login'),
            {'email': 'admin@boskepos.cl', 'password': 'strong-test-password'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_authenticated_user(self):
        self.user.groups.add(Group.objects.get(name=SELLER_ROLE))
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse('accounts:me'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], self.user.email)
        self.assertIn(SELLER_ROLE, response.data['roles'])
        self.assertIn('sales:write', response.data['permissions'])

    def test_refresh_token_returns_new_access_token(self):
        login_response = self.client.post(
            reverse('accounts:login'),
            {'email': 'admin@boskepos.cl', 'password': 'strong-test-password'},
            format='json',
        )

        response = self.client.post(
            reverse('accounts:token_refresh'),
            {'refresh': login_response.data['refresh']},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_refresh_token_rejects_invalid_token(self):
        response = self.client.post(
            reverse('accounts:token_refresh'),
            {'refresh': 'invalid-token'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_blacklists_refresh_token(self):
        login_response = self.client.post(
            reverse('accounts:login'),
            {'email': 'admin@boskepos.cl', 'password': 'strong-test-password'},
            format='json',
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}"
        )

        response = self.client.post(
            reverse('accounts:logout'),
            {'refresh': login_response.data['refresh']},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_seed_roles_is_idempotent(self):
        call_command('seed_roles', verbosity=0)

        self.assertEqual(Group.objects.filter(name=ADMIN_ROLE).count(), 1)
        self.assertEqual(Group.objects.filter(name=SELLER_ROLE).count(), 1)
        self.assertEqual(Group.objects.filter(name=INVENTORY_ROLE).count(), 1)


class RolePermissionTests(APITestCase):
    def setUp(self):
        call_command('seed_roles', verbosity=0)
        self.seller = get_user_model().objects.create_user(
            email='seller@boskepos.cl',
            password='strong-test-password',
        )
        self.seller.groups.add(Group.objects.get(name=SELLER_ROLE))
        self.inventory_user = get_user_model().objects.create_user(
            email='inventory@boskepos.cl',
            password='strong-test-password',
        )
        self.inventory_user.groups.add(Group.objects.get(name=INVENTORY_ROLE))
        self.admin_user = get_user_model().objects.create_user(
            email='role-admin@boskepos.cl',
            password='strong-test-password',
        )
        self.admin_user.groups.add(Group.objects.get(name=ADMIN_ROLE))
        self.product = Product.objects.create(
            name='Producto permisos',
            sku='PERM-001',
            barcode='PERM001',
            cost_price='1000.00',
            sale_price='1500.00',
            stock=5,
        )

    def test_seller_cannot_adjust_stock_or_see_costs(self):
        self.client.force_authenticate(user=self.seller)

        product_response = self.client.get(reverse('inventory:product-detail', args=[self.product.id]))
        adjust_response = self.client.post(
            reverse('inventory:product-adjust-stock', args=[self.product.id]),
            {
                'movement_type': 'positive_adjustment',
                'quantity': 1,
                'reason': 'Prueba de permisos',
            },
            format='json',
        )

        self.assertEqual(product_response.status_code, status.HTTP_200_OK)
        self.assertNotIn('cost_price', product_response.data)
        self.assertEqual(adjust_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_inventory_user_can_adjust_stock_and_see_costs(self):
        self.client.force_authenticate(user=self.inventory_user)

        product_response = self.client.get(reverse('inventory:product-detail', args=[self.product.id]))
        adjust_response = self.client.post(
            reverse('inventory:product-adjust-stock', args=[self.product.id]),
            {
                'movement_type': 'positive_adjustment',
                'quantity': 1,
                'reason': 'Prueba de permisos',
            },
            format='json',
        )

        self.assertEqual(product_response.status_code, status.HTTP_200_OK)
        self.assertIn('cost_price', product_response.data)
        self.assertEqual(adjust_response.status_code, status.HTTP_201_CREATED)

    def test_inventory_user_cannot_create_sale(self):
        self.client.force_authenticate(user=self.inventory_user)

        response = self.client.post(
            reverse('sales:sale-list'),
            {'items': [{'product_id': self.product.id, 'quantity': 1}]},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_seller_cannot_cancel_sale(self):
        self.client.force_authenticate(user=self.seller)
        sale = Sale.objects.create(
            user=self.seller,
            subtotal='0.00',
            total='0.00',
        )

        response = self.client.post(reverse('sales:sale-cancel', args=[sale.id]))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_cancel_sale_endpoint(self):
        self.client.force_authenticate(user=self.admin_user)
        sale = Sale.objects.create(
            user=self.seller,
            subtotal='0.00',
            total='0.00',
        )

        response = self.client.post(reverse('sales:sale-cancel', args=[sale.id]))

        self.assertNotEqual(response.status_code, status.HTTP_403_FORBIDDEN)

