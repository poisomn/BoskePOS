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
            {'name': ' Herramientas ', 'description': 'Categoria general'},
            format='json',
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data['name'], 'Herramientas')

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

    def test_category_list_requires_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(reverse('inventory:category-list'))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_category_list_is_paginated(self):
        for index in range(9):
            Category.objects.create(name=f'Categoria {index:02d}')

        response = self.client.get(reverse('inventory:category-list'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 9)
        self.assertEqual(len(response.data['results']), 8)
        self.assertIsNotNone(response.data['next'])
        self.assertIsNone(response.data['previous'])

    def test_category_search_by_name(self):
        Category.objects.create(name='Herramientas Manuales')
        Category.objects.create(name='Pinturas')

        response = self.client.get(
            reverse('inventory:category-list'),
            {'search': 'herramientas'},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['name'], 'Herramientas Manuales')

    def test_category_filter_by_active_state(self):
        Category.objects.create(name='Activa', is_active=True)
        Category.objects.create(name='Inactiva', is_active=False)

        response = self.client.get(
            reverse('inventory:category-list'),
            {'is_active': 'false'},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['name'], 'Inactiva')

    def test_category_name_is_required_after_trim(self):
        response = self.client.post(
            reverse('inventory:category-list'),
            {'name': '   ', 'description': 'Sin nombre valido'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', response.data)

    def test_category_name_must_be_unique_case_insensitive(self):
        Category.objects.create(name='Pinturas')

        response = self.client.post(
            reverse('inventory:category-list'),
            {'name': ' pinturas ', 'description': 'Duplicada'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', response.data)

    def test_category_can_be_updated_without_false_duplicate(self):
        category = Category.objects.create(name='Electricidad', description='Inicial')

        response = self.client.patch(
            reverse('inventory:category-detail', args=[category.id]),
            {'name': ' Electricidad ', 'description': 'Actualizada'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Electricidad')
        self.assertEqual(response.data['description'], 'Actualizada')

    def test_category_update_rejects_duplicate_name(self):
        Category.objects.create(name='Pinturas')
        category = Category.objects.create(name='Electricidad')

        response = self.client.patch(
            reverse('inventory:category-detail', args=[category.id]),
            {'name': 'pinturas'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', response.data)

    def test_category_activate_and_deactivate(self):
        category = Category.objects.create(name='Plomeria', is_active=True)

        deactivate_response = self.client.post(
            reverse('inventory:category-deactivate', args=[category.id]),
            format='json',
        )
        self.assertEqual(deactivate_response.status_code, status.HTTP_200_OK)
        self.assertFalse(deactivate_response.data['is_active'])

        activate_response = self.client.post(
            reverse('inventory:category-activate', args=[category.id]),
            format='json',
        )
        self.assertEqual(activate_response.status_code, status.HTTP_200_OK)
        self.assertTrue(activate_response.data['is_active'])

    def test_category_detail_not_found(self):
        response = self.client.get(reverse('inventory:category-detail', args=[99999]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_category_with_products_is_not_deleted_physically(self):
        category = Category.objects.create(name='Ferreteria')
        Product.objects.create(
            category=category,
            name='Martillo',
            sku='CAT-DEL-001',
            sale_price=Decimal('3990.00'),
        )

        response = self.client.delete(reverse('inventory:category-detail', args=[category.id]))

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertTrue(Category.objects.filter(id=category.id).exists())

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
