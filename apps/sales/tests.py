from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.inventory.models import Product


class PosApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email='pos@boskepos.cl',
            password='strong-test-password',
        )
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
        self.assertEqual(response.data['total'], '9970.00')
        self.assertEqual(len(response.data['items']), 2)
        self.assertEqual(response.data['items'][0]['line_subtotal'], '7980.00')
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

    def test_cart_quote_rejects_duplicate_products(self):
        response = self.client.post(
            reverse('sales:pos-cart-quote'),
            {
                'items': [
                    {'product_id': self.hammer.id, 'quantity': 1},
                    {'product_id': self.hammer.id, 'quantity': 2},
                ]
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('items', response.data)

    def test_cart_quote_rejects_insufficient_stock(self):
        response = self.client.post(
            reverse('sales:pos-cart-quote'),
            {'items': [{'product_id': self.screwdriver.id, 'quantity': 99}]},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('items', response.data)
