from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Category, Product


class InventoryApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email='inventory@boskepos.cl',
            password='strong-test-password',
        )
        self.client.force_authenticate(user=self.user)

    def test_category_crud(self):
        create_response = self.client.post(
            reverse('inventory:category-list'),
            {'name': 'Herramientas', 'description': 'Categoria general'},
            format='json',
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        category_id = create_response.data['id']
        detail_url = reverse('inventory:category-detail', args=[category_id])

        update_response = self.client.patch(
            detail_url,
            {'description': 'Herramientas manuales y electricas'},
            format='json',
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)

        delete_response = self.client.delete(detail_url)
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

    def test_product_crud_and_sku_normalization(self):
        category = Category.objects.create(name='Pinturas')

        create_response = self.client.post(
            reverse('inventory:product-list'),
            {
                'category': category.id,
                'name': 'Esmalte al agua blanco',
                'sku': ' pin-001 ',
                'barcode': '',
                'cost_price': '4500.00',
                'sale_price': '6990.00',
                'stock': 12,
                'minimum_stock': 3,
            },
            format='json',
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data['sku'], 'PIN-001')
        self.assertIsNone(create_response.data['barcode'])
        self.assertEqual(create_response.data['brand'], '')
        self.assertEqual(create_response.data['unit'], Product.ProductUnit.UNIT)
        self.assertEqual(create_response.data['location'], '')
        self.assertIsNone(create_response.data['image'])
        self.assertEqual(create_response.data['tax_rate'], '19.00')

        product_id = create_response.data['id']
        detail_url = reverse('inventory:product-detail', args=[product_id])

        update_response = self.client.patch(detail_url, {'stock': 8}, format='json')
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data['stock'], 8)

        delete_response = self.client.delete(detail_url)
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

    def test_product_name_search(self):
        Product.objects.create(name='Martillo carpintero', sku='FER-001', sale_price=Decimal('3990'))
        Product.objects.create(name='Destornillador paleta', sku='FER-002', sale_price=Decimal('1990'))

        response = self.client.get(reverse('inventory:product-list'), {'search': 'martillo'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Martillo carpintero')

    def test_product_sku_must_be_unique(self):
        Product.objects.create(name='Producto base', sku='SKU-001', sale_price=Decimal('1000'))

        response = self.client.post(
            reverse('inventory:product-list'),
            {'name': 'Producto duplicado', 'sku': 'sku-001', 'sale_price': '1200.00'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('sku', response.data)

    def test_barcode_is_optional_but_unique_when_present(self):
        Product.objects.create(
            name='Producto con codigo',
            sku='BAR-001',
            barcode='780000000001',
            sale_price=Decimal('1000'),
        )

        empty_barcode_response = self.client.post(
            reverse('inventory:product-list'),
            {
                'name': 'Producto sin codigo',
                'sku': 'BAR-002',
                'barcode': '',
                'sale_price': '1000.00',
            },
            format='json',
        )
        self.assertEqual(empty_barcode_response.status_code, status.HTTP_201_CREATED)

        duplicate_barcode_response = self.client.post(
            reverse('inventory:product-list'),
            {
                'name': 'Producto codigo duplicado',
                'sku': 'BAR-003',
                'barcode': '780000000001',
                'sale_price': '1000.00',
            },
            format='json',
        )
        self.assertEqual(duplicate_barcode_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('barcode', duplicate_barcode_response.data)

    def test_product_can_be_created_with_brand_unit_and_location(self):
        category = Category.objects.create(name='Herramientas Electricas')

        response = self.client.post(
            reverse('inventory:product-list'),
            {
                'category': category.id,
                'name': 'Taladro percutor 650W',
                'sku': 'tal-001',
                'barcode': '780000000010',
                'brand': 'Bosch',
                'unit': Product.ProductUnit.UNIT,
                'location': 'A-01-01',
                'cost_price': '34990.00',
                'sale_price': '49990.00',
                'stock': 7,
                'minimum_stock': 2,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['brand'], 'Bosch')
        self.assertEqual(response.data['unit'], Product.ProductUnit.UNIT)
        self.assertEqual(response.data['location'], 'A-01-01')
        self.assertIsNone(response.data['image'])

    def test_product_tax_rate_defaults_to_19_percent(self):
        product = Product.objects.create(
            name='Producto con IVA por defecto',
            sku='IVA-001',
            sale_price=Decimal('1000.00'),
        )

        self.assertEqual(product.tax_rate, Decimal('19.00'))

    def test_product_rejects_invalid_unit(self):
        response = self.client.post(
            reverse('inventory:product-list'),
            {
                'name': 'Producto unidad invalida',
                'sku': 'UNI-001',
                'unit': 'metros',
                'sale_price': '1000.00',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('unit', response.data)
