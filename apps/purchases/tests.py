from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.inventory.models import Category, Product, StockMovement
from apps.suppliers.models import Supplier
from apps.accounts.permissions import ADMIN_ROLE

from .models import Purchase


class PurchasesApiTests(APITestCase):
    def setUp(self):
        call_command('seed_roles', verbosity=0)
        self.user = get_user_model().objects.create_user(
            email='purchases@boskepos.cl',
            password='strong-test-password',
        )
        self.user.groups.add(Group.objects.get(name=ADMIN_ROLE))
        self.client.force_authenticate(user=self.user)
        self.supplier = Supplier.objects.create(name='Proveedor Compra', rut='12345678-5')
        self.category = Category.objects.create(name='Compras Test')
        self.product = Product.objects.create(
            category=self.category,
            name='Martillo Compra',
            sku='CMP-001',
            barcode='CMP001',
            cost_price=Decimal('1000.00'),
            sale_price=Decimal('1500.00'),
            stock=5,
            minimum_stock=1,
        )

    def test_create_draft_purchase_calculates_totals_in_backend(self):
        response = self.client.post(
            reverse('purchases:purchase-list'),
            self._payload(unit_cost='1200.50', quantity=2),
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], Purchase.Status.DRAFT)
        self.assertEqual(response.data['subtotal'], '2401.00')
        self.assertEqual(response.data['total'], '2401.00')
        self.assertEqual(len(response.data['items']), 1)

    def test_confirm_purchase_increases_stock_once_and_creates_movement(self):
        purchase_id = self._create_purchase_id(quantity=3)

        response = self.client.post(reverse('purchases:purchase-confirm', args=[purchase_id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], Purchase.Status.CONFIRMED)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 8)
        self.assertEqual(
            StockMovement.objects.filter(
                product=self.product,
                movement_type=StockMovement.MovementType.ENTRY,
                reference=f'purchase:{purchase_id}',
            ).count(),
            1,
        )

        second_response = self.client.post(reverse('purchases:purchase-confirm', args=[purchase_id]))
        self.assertEqual(second_response.status_code, status.HTTP_409_CONFLICT)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 8)

    def test_cancel_confirmed_purchase_compensates_stock(self):
        purchase_id = self._create_purchase_id(quantity=2)
        self.client.post(reverse('purchases:purchase-confirm', args=[purchase_id]))

        response = self.client.post(reverse('purchases:purchase-cancel', args=[purchase_id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], Purchase.Status.CANCELLED)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 5)

    def test_cancel_rejects_when_compensation_would_make_stock_negative(self):
        purchase_id = self._create_purchase_id(quantity=4)
        self.client.post(reverse('purchases:purchase-confirm', args=[purchase_id]))
        self.product.stock = 2
        self.product.save(update_fields=('stock',))

        response = self.client.post(reverse('purchases:purchase-cancel', args=[purchase_id]))

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        Purchase.objects.get(pk=purchase_id).refresh_from_db()
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 2)

    def test_rejects_empty_lines_invalid_quantity_and_inactive_supplier(self):
        empty_response = self.client.post(
            reverse('purchases:purchase-list'),
            {'supplier_id': self.supplier.id, 'items': []},
            format='json',
        )
        self.assertEqual(empty_response.status_code, status.HTTP_400_BAD_REQUEST)

        quantity_response = self.client.post(
            reverse('purchases:purchase-list'),
            self._payload(quantity=0),
            format='json',
        )
        self.assertEqual(quantity_response.status_code, status.HTTP_400_BAD_REQUEST)

        self.supplier.is_active = False
        self.supplier.save(update_fields=('is_active',))
        supplier_response = self.client.post(
            reverse('purchases:purchase-list'),
            self._payload(),
            format='json',
        )
        self.assertEqual(supplier_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_filter_search_and_authentication(self):
        purchase_id = self._create_purchase_id()

        list_response = self.client.get(
            reverse('purchases:purchase-list'),
            {'status': Purchase.Status.DRAFT, 'search': str(purchase_id)},
        )
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data['count'], 1)

        self.client.force_authenticate(user=None)
        auth_response = self.client.get(reverse('purchases:purchase-list'))
        self.assertEqual(auth_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_confirmed_purchase_cannot_be_edited_or_deleted(self):
        purchase_id = self._create_purchase_id()
        self.client.post(reverse('purchases:purchase-confirm', args=[purchase_id]))
        detail_url = reverse('purchases:purchase-detail', args=[purchase_id])

        patch_response = self.client.patch(detail_url, self._payload(reference='EDIT'), format='json')
        delete_response = self.client.delete(detail_url)

        self.assertEqual(patch_response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(delete_response.status_code, status.HTTP_409_CONFLICT)

    def _create_purchase_id(self, **kwargs):
        response = self.client.post(
            reverse('purchases:purchase-list'),
            self._payload(**kwargs),
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response.data['id']

    def _payload(self, unit_cost='1000.00', quantity=1, reference='OC-TEST'):
        return {
            'supplier_id': self.supplier.id,
            'reference': reference,
            'notes': 'Compra de prueba',
            'items': [
                {
                    'product_id': self.product.id,
                    'quantity': quantity,
                    'unit_cost': unit_cost,
                }
            ],
        }

