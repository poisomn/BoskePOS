from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.customers.models import Customer
from apps.inventory.models import Product, StockMovement
from apps.sales.models import Sale, SaleItem
from apps.accounts.permissions import ADMIN_ROLE


class PosApiTests(APITestCase):
    def setUp(self):
        call_command('seed_roles', verbosity=0)
        self.user = get_user_model().objects.create_user(
            email='pos@boskepos.cl',
            password='strong-test-password',
        )
        self.user.groups.add(Group.objects.get(name=ADMIN_ROLE))
        self.client.force_authenticate(user=self.user)
        self.hammer = Product.objects.create(
            name='Martillo carpintero',
            sku='FER-001',
            barcode='780000000001',
            sale_price=Decimal('3990.00'),
            stock=10,
        )
        self.screwdriver = Product.objects.create(
            name='Destornillador paleta',
            sku='FER-002',
            barcode='780000000002',
            sale_price=Decimal('1990.00'),
            stock=5,
        )
        Product.objects.create(
            name='Producto inactivo',
            sku='FER-003',
            sale_price=Decimal('1000.00'),
            stock=10,
            is_active=False,
        )

    def test_search_products_by_name_sku_or_barcode(self):
        name_response = self.client.get(reverse('sales:pos-product-search'), {'search': 'martillo'})
        self.assertEqual(name_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(name_response.data), 1)
        self.assertEqual(name_response.data[0]['sku'], self.hammer.sku)

        sku_response = self.client.get(reverse('sales:pos-product-search'), {'search': 'fer-002'})
        self.assertEqual(sku_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(sku_response.data), 1)
        self.assertEqual(sku_response.data[0]['sku'], self.screwdriver.sku)

        barcode_response = self.client.get(
            reverse('sales:pos-product-search'),
            {'search': '780000000001'},
        )
        self.assertEqual(barcode_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(barcode_response.data), 1)
        self.assertEqual(barcode_response.data[0]['id'], self.hammer.id)

    def test_cart_quote_calculates_subtotal_and_total(self):
        response = self.client.post(
            reverse('sales:pos-cart-quote'),
            {
                'items': [
                    {'product_id': self.hammer.id, 'quantity': 2},
                    {'product_id': self.screwdriver.id, 'quantity': 1},
                ]
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['subtotal'], '9970.00')
        self.assertEqual(response.data['tax_total'], '1591.85')
        self.assertEqual(response.data['total'], '9970.00')
        self.assertEqual(len(response.data['items']), 2)
        self.assertEqual(response.data['items'][0]['line_subtotal'], '7980.00')
        self.assertEqual(response.data['items'][0]['tax_total'], '1274.12')
        self.hammer.refresh_from_db()
        self.assertEqual(self.hammer.stock, 10)

    def test_cart_quote_supports_quantity_changes_and_removing_items(self):
        changed_quantity_response = self.client.post(
            reverse('sales:pos-cart-quote'),
            {'items': [{'product_id': self.hammer.id, 'quantity': 3}]},
            format='json',
        )
        self.assertEqual(changed_quantity_response.status_code, status.HTTP_200_OK)
        self.assertEqual(changed_quantity_response.data['total'], '11970.00')

        empty_cart_response = self.client.post(
            reverse('sales:pos-cart-quote'),
            {'items': []},
            format='json',
        )
        self.assertEqual(empty_cart_response.status_code, status.HTTP_200_OK)
        self.assertEqual(empty_cart_response.data['items'], [])
        self.assertEqual(empty_cart_response.data['total'], '0.00')

    def test_cart_quote_supports_duplicate_product_lines_with_aggregate_stock(self):
        response = self.client.post(
            reverse('sales:pos-cart-quote'),
            {
                'items': [
                    {'line_id': 'a', 'product_id': self.hammer.id, 'quantity': 1},
                    {
                        'line_id': 'b',
                        'product_id': self.hammer.id,
                        'quantity': 2,
                        'discount_amount': '500.00',
                        'note': 'Promocion meson',
                    },
                ]
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['items']), 2)
        self.assertEqual(response.data['subtotal'], '11970.00')
        self.assertEqual(response.data['discount_total'], '500.00')
        self.assertEqual(response.data['tax_total'], '1831.35')
        self.assertEqual(response.data['total'], '11470.00')
        self.assertEqual(response.data['items'][1]['line_id'], 'b')
        self.assertEqual(response.data['items'][1]['note'], 'Promocion meson')

    def test_cart_quote_rejects_insufficient_stock(self):
        response = self.client.post(
            reverse('sales:pos-cart-quote'),
            {'items': [{'product_id': self.screwdriver.id, 'quantity': 99}]},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('items', response.data)

    def test_register_sale_creates_detail_and_discounts_inventory(self):
        customer = Customer.objects.create(name='Cliente POS', rut='12345678-5')

        response = self.client.post(
            reverse('sales:sale-list'),
            {
                'customer_id': customer.id,
                'items': [
                    {'product_id': self.hammer.id, 'quantity': 2},
                    {'product_id': self.screwdriver.id, 'quantity': 1},
                ],
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], Sale.Status.COMPLETED)
        self.assertEqual(response.data['total'], '9970.00')
        self.assertEqual(len(response.data['items']), 2)
        self.assertEqual(Sale.objects.count(), 1)
        self.assertEqual(SaleItem.objects.count(), 2)
        sale_id = response.data['id']

        self.hammer.refresh_from_db()
        self.screwdriver.refresh_from_db()
        self.assertEqual(self.hammer.stock, 8)
        self.assertEqual(self.screwdriver.stock, 4)
        self.assertEqual(
            StockMovement.objects.filter(
                movement_type=StockMovement.MovementType.EXIT,
                reference=f'sale:{sale_id}',
            ).count(),
            2,
        )

    def test_register_sale_without_customer(self):
        response = self.client.post(
            reverse('sales:sale-list'),
            {'items': [{'product_id': self.hammer.id, 'quantity': 1}]},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data['customer'])
        self.assertEqual(response.data['total'], '3990.00')

    def test_failed_sale_rolls_back_everything(self):
        response = self.client.post(
            reverse('sales:sale-list'),
            {
                'items': [
                    {'product_id': self.hammer.id, 'quantity': 1},
                    {'product_id': self.screwdriver.id, 'quantity': 99},
                ],
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Sale.objects.count(), 0)
        self.assertEqual(SaleItem.objects.count(), 0)
        self.assertEqual(StockMovement.objects.count(), 0)

        self.hammer.refresh_from_db()
        self.screwdriver.refresh_from_db()
        self.assertEqual(self.hammer.stock, 10)
        self.assertEqual(self.screwdriver.stock, 5)

    def test_register_sale_supports_discount_payment_and_notes(self):
        response = self.client.post(
            reverse('sales:sale-list'),
            {
                'payment_method': Sale.PaymentMethod.CASH,
                'amount_paid': '10000.00',
                'notes': 'Venta con descuento autorizado',
                'items': [
                    {
                        'product_id': self.hammer.id,
                        'quantity': 2,
                        'discount_amount': '980.00',
                        'note': 'Descuento meson',
                    },
                ],
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['subtotal'], '7980.00')
        self.assertEqual(response.data['discount_total'], '980.00')
        self.assertEqual(response.data['tax_total'], '1117.65')
        self.assertEqual(response.data['total'], '7000.00')
        self.assertEqual(response.data['amount_paid'], '10000.00')
        self.assertEqual(response.data['change_amount'], '3000.00')
        self.assertEqual(response.data['notes'], 'Venta con descuento autorizado')
        self.assertEqual(response.data['items'][0]['note'], 'Descuento meson')

    def test_pending_sale_does_not_discount_stock_until_completed(self):
        create_response = self.client.post(
            reverse('sales:sale-list'),
            {
                'status': Sale.Status.PENDING,
                'items': [{'product_id': self.hammer.id, 'quantity': 2}],
            },
            format='json',
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data['status'], Sale.Status.PENDING)
        self.hammer.refresh_from_db()
        self.assertEqual(self.hammer.stock, 10)
        self.assertFalse(
            StockMovement.objects.filter(reference=f'sale:{create_response.data["id"]}').exists()
        )

        complete_response = self.client.post(
            reverse('sales:sale-complete', args=[create_response.data['id']]),
            {'payment_method': Sale.PaymentMethod.DEBIT},
            format='json',
        )

        self.assertEqual(complete_response.status_code, status.HTTP_200_OK)
        self.assertEqual(complete_response.data['status'], Sale.Status.COMPLETED)
        self.hammer.refresh_from_db()
        self.assertEqual(self.hammer.stock, 8)

    def test_pending_sale_completion_validates_aggregate_stock_for_duplicate_lines(self):
        create_response = self.client.post(
            reverse('sales:sale-list'),
            {
                'status': Sale.Status.PENDING,
                'items': [
                    {'product_id': self.screwdriver.id, 'quantity': 2},
                    {'product_id': self.screwdriver.id, 'quantity': 2},
                ],
            },
            format='json',
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.screwdriver.stock = 3
        self.screwdriver.save(update_fields=('stock',))

        complete_response = self.client.post(
            reverse('sales:sale-complete', args=[create_response.data['id']]),
            {'payment_method': Sale.PaymentMethod.DEBIT},
            format='json',
        )

        self.assertEqual(complete_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('items', complete_response.data)

    def test_pending_sale_can_be_updated_and_discarded(self):
        create_response = self.client.post(
            reverse('sales:sale-list'),
            {
                'status': Sale.Status.PENDING,
                'items': [{'product_id': self.hammer.id, 'quantity': 1}],
            },
            format='json',
        )
        sale_id = create_response.data['id']

        update_response = self.client.patch(
            reverse('sales:sale-detail', args=[sale_id]),
            {
                'items': [
                    {
                        'product_id': self.screwdriver.id,
                        'quantity': 2,
                        'discount_amount': '100.00',
                        'note': 'Linea actualizada',
                    },
                ],
                'notes': 'Venta suspendida',
            },
            format='json',
        )

        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data['total'], '3880.00')
        self.assertEqual(update_response.data['items'][0]['note'], 'Linea actualizada')

        discard_response = self.client.post(reverse('sales:sale-discard', args=[sale_id]))

        self.assertEqual(discard_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Sale.objects.filter(id=sale_id).exists())

    def test_completed_sale_cannot_be_discarded(self):
        create_response = self.client.post(
            reverse('sales:sale-list'),
            {'items': [{'product_id': self.hammer.id, 'quantity': 1}]},
            format='json',
        )

        response = self.client.post(reverse('sales:sale-discard', args=[create_response.data['id']]))

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_cancel_completed_sale_restores_stock_with_auditable_movements(self):
        create_response = self.client.post(
            reverse('sales:sale-list'),
            {'items': [{'product_id': self.hammer.id, 'quantity': 2}]},
            format='json',
        )
        sale_id = create_response.data['id']

        cancel_response = self.client.post(reverse('sales:sale-cancel', args=[sale_id]))

        self.assertEqual(cancel_response.status_code, status.HTTP_200_OK)
        self.assertEqual(cancel_response.data['status'], Sale.Status.CANCELLED)
        self.hammer.refresh_from_db()
        self.assertEqual(self.hammer.stock, 10)
        self.assertEqual(
            StockMovement.objects.filter(
                movement_type=StockMovement.MovementType.ENTRY,
                reference=f'sale-cancel:{sale_id}',
            ).count(),
            1,
        )

        second_cancel_response = self.client.post(reverse('sales:sale-cancel', args=[sale_id]))
        self.assertEqual(second_cancel_response.status_code, status.HTTP_409_CONFLICT)

    def test_completed_sale_cannot_be_completed_twice(self):
        create_response = self.client.post(
            reverse('sales:sale-list'),
            {'items': [{'product_id': self.hammer.id, 'quantity': 1}]},
            format='json',
        )

        response = self.client.post(reverse('sales:sale-complete', args=[create_response.data['id']]))

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.hammer.refresh_from_db()
        self.assertEqual(self.hammer.stock, 9)

    def test_sales_list_is_paginated_and_filterable(self):
        customer = Customer.objects.create(name='Cliente Filtro', rut='11111111-1')
        self.client.post(
            reverse('sales:sale-list'),
            {'customer_id': customer.id, 'items': [{'product_id': self.hammer.id, 'quantity': 1}]},
            format='json',
        )

        response = self.client.get(
            reverse('sales:sale-list'),
            {'status': Sale.Status.COMPLETED, 'search': 'Cliente Filtro'},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['customer_name'], 'Cliente Filtro')

    def test_sales_requires_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(reverse('sales:sale-list'))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

