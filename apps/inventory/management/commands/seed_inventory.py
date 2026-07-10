from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.inventory.models import Category, Product


class Command(BaseCommand):
    help = 'Crea categorias y productos iniciales para el modulo de inventario.'

    @transaction.atomic
    def handle(self, *args, **options):
        categories_data = [
            {
                'name': 'Abrasivos',
                'description': 'Discos de corte, lijas, escobillas y accesorios abrasivos.',
            },
            {
                'name': 'Soldadura',
                'description': 'Electrodos, mascaras y accesorios para soldadura.',
            },
            {
                'name': 'Plomería',
                'description': 'Tubos, llaves, fittings y accesorios para instalaciones sanitarias.',
            },
            {
                'name': 'Iluminación',
                'description': 'Ampolletas, tubos LED y accesorios electricos de iluminacion.',
            },
            {
                'name': 'Fijaciones Químicas',
                'description': 'Adhesivos, anclajes quimicos y soluciones epoxicas.',
            },
            {
                'name': 'Escaleras y Andamios',
                'description': 'Escaleras, plataformas y accesorios de trabajo en altura.',
            },
            {
                'name': 'Cadenas y Cuerdas',
                'description': 'Cadenas, cuerdas, piolas y accesorios de sujecion.',
            },
            {
                'name': 'Lubricantes',
                'description': 'Aceites, grasas, lubricantes multiuso y productos de mantenimiento.',
            },
        ]

        categories = {}

        self.stdout.write('Creando categorias...')

        for category_data in categories_data:
            category, created = Category.objects.update_or_create(
                name=category_data['name'],
                defaults={
                    'description': category_data['description'],
                    'is_active': True,
                },
            )

            categories[category.name] = category

            status = 'creada' if created else 'actualizada'
            self.stdout.write(
                self.style.SUCCESS(
                    f'  Categoria {status}: {category.name}'
                )
            )

        products_data = [
            {
                'category': 'Abrasivos',
                'name': 'Disco de Corte Metal 4.5"',
                'sku': 'AB001',
                'barcode': '781200000001',
                'description': 'Disco abrasivo para corte de acero y perfiles metalicos.',
                'brand': '3M',
                'unit': Product.ProductUnit.UNIT,
                'location': 'A-01-01',
                'cost_price': Decimal('950.00'),
                'sale_price': Decimal('1990.00'),
                'stock': 24,
                'minimum_stock': 6,
                'tax_rate': Decimal('19.00'),
                'image': None,
            },
            {
                'category': 'Abrasivos',
                'name': 'Lija al Agua Grano 120',
                'sku': 'ABR-3M-002',
                'barcode': '781200100002',
                'description': 'Lija al agua para terminaciones finas en metal y pintura.',
                'brand': '3M',
                'unit': Product.ProductUnit.BOX,
                'location': 'A-01-02',
                'cost_price': Decimal('8900.00'),
                'sale_price': Decimal('12990.00'),
                'stock': 10,
                'minimum_stock': 3,
                'tax_rate': Decimal('19.00'),
                'image': None,
            },
            {
                'category': 'Soldadura',
                'name': 'Electrodo 6013 3/32"',
                'sku': 'SOL-GEN-001',
                'barcode': '781200200001',
                'description': 'Electrodo rutílico para soldadura de estructuras livianas.',
                'brand': 'Genérico',
                'unit': Product.ProductUnit.KILOGRAM,
                'location': 'A-02-01',
                'cost_price': Decimal('2600.00'),
                'sale_price': Decimal('3990.00'),
                'stock': 35,
                'minimum_stock': 8,
                'tax_rate': Decimal('19.00'),
                'image': None,
            },
            {
                'category': 'Soldadura',
                'name': 'Mascara de Soldar Fotosensible',
                'sku': 'SOL-HEL-002',
                'barcode': '781200200002',
                'description': 'Mascara fotosensible con regulacion para trabajos de soldadura.',
                'brand': 'Hela',
                'unit': Product.ProductUnit.UNIT,
                'location': 'A-02-02',
                'cost_price': Decimal('18990.00'),
                'sale_price': Decimal('29990.00'),
                'stock': 8,
                'minimum_stock': 2,
                'tax_rate': Decimal('19.00'),
                'image': None,
            },
            {
                'category': 'Plomería',
                'name': 'Tubo PVC Sanitario 110 mm',
                'sku': 'PLO-HOF-001',
                'barcode': '781200300001',
                'description': 'Tubo PVC sanitario para descargas domiciliarias.',
                'brand': 'Hoffens',
                'unit': Product.ProductUnit.METER,
                'location': 'B-01-01',
                'cost_price': Decimal('2190.00'),
                'sale_price': Decimal('3490.00'),
                'stock': 60,
                'minimum_stock': 12,
                'tax_rate': Decimal('19.00'),
                'image': None,
            },
            {
                'category': 'Plomería',
                'name': 'Llave Bola 1/2"',
                'sku': 'PLO-HOF-002',
                'barcode': '781200300002',
                'description': 'Llave de bola para corte de paso en instalaciones de agua.',
                'brand': 'Hoffens',
                'unit': Product.ProductUnit.UNIT,
                'location': 'B-01-02',
                'cost_price': Decimal('2190.00'),
                'sale_price': Decimal('3990.00'),
                'stock': 32,
                'minimum_stock': 8,
                'tax_rate': Decimal('19.00'),
                'image': None,
            },
            {
                'category': 'Iluminación',
                'name': 'Ampolleta LED 9W E27 Luz Fria',
                'sku': 'ILU-PHI-001',
                'barcode': '781200400001',
                'description': 'Ampolleta LED de bajo consumo con soquete E27.',
                'brand': 'Philips',
                'unit': Product.ProductUnit.UNIT,
                'location': 'B-02-01',
                'cost_price': Decimal('1290.00'),
                'sale_price': Decimal('2490.00'),
                'stock': 80,
                'minimum_stock': 20,
                'tax_rate': Decimal('19.00'),
                'image': None,
            },
            {
                'category': 'Iluminación',
                'name': 'Tubo LED 18W 120 cm',
                'sku': 'ILU-HEL-002',
                'barcode': '781200400002',
                'description': 'Tubo LED para reemplazo de fluorescente tradicional.',
                'brand': 'Hela',
                'unit': Product.ProductUnit.UNIT,
                'location': 'B-02-02',
                'cost_price': Decimal('2990.00'),
                'sale_price': Decimal('4990.00'),
                'stock': 45,
                'minimum_stock': 10,
                'tax_rate': Decimal('19.00'),
                'image': None,
            },
            {
                'category': 'Fijaciones Químicas',
                'name': 'Anclaje Quimico AnchorFix-1',
                'sku': 'FIQ-SIK-001',
                'barcode': '781200500001',
                'description': 'Anclaje quimico para fijaciones estructurales en hormigon.',
                'brand': 'Sika',
                'unit': Product.ProductUnit.UNIT,
                'location': 'C-01-01',
                'cost_price': Decimal('6990.00'),
                'sale_price': Decimal('10990.00'),
                'stock': 18,
                'minimum_stock': 5,
                'tax_rate': Decimal('19.00'),
                'image': None,
            },
            {
                'category': 'Fijaciones Químicas',
                'name': 'Adhesivo Epoxico Sikadur 31',
                'sku': 'FIQ-SIK-002',
                'barcode': '781200500002',
                'description': 'Adhesivo epoxico para reparaciones y pegado de alta resistencia.',
                'brand': 'Sika',
                'unit': Product.ProductUnit.KILOGRAM,
                'location': 'C-01-02',
                'cost_price': Decimal('18990.00'),
                'sale_price': Decimal('28990.00'),
                'stock': 9,
                'minimum_stock': 3,
                'tax_rate': Decimal('19.00'),
                'image': None,
            },
            {
                'category': 'Escaleras y Andamios',
                'name': 'Escalera Aluminio 6 Peldaños',
                'sku': 'ESC-GEN-001',
                'barcode': '781200600001',
                'description': 'Escalera de aluminio liviana para uso domestico y comercial.',
                'brand': 'Genérico',
                'unit': Product.ProductUnit.UNIT,
                'location': 'C-02-01',
                'cost_price': Decimal('24990.00'),
                'sale_price': Decimal('39990.00'),
                'stock': 7,
                'minimum_stock': 2,
                'tax_rate': Decimal('19.00'),
                'image': None,
            },
            {
                'category': 'Escaleras y Andamios',
                'name': 'Plataforma de Andamio Metalica',
                'sku': 'ESC-GEN-002',
                'barcode': '781200600002',
                'description': 'Plataforma metalica antideslizante para andamios modulares.',
                'brand': 'Genérico',
                'unit': Product.ProductUnit.UNIT,
                'location': 'C-02-02',
                'cost_price': Decimal('32990.00'),
                'sale_price': Decimal('52990.00'),
                'stock': 5,
                'minimum_stock': 2,
                'tax_rate': Decimal('19.00'),
                'image': None,
            },
            {
                'category': 'Cadenas y Cuerdas',
                'name': 'Cadena Galvanizada 6 mm',
                'sku': 'CAD-GEN-001',
                'barcode': '781200700001',
                'description': 'Cadena galvanizada para sujecion, portones y usos generales.',
                'brand': 'Genérico',
                'unit': Product.ProductUnit.METER,
                'location': 'D-01-01',
                'cost_price': Decimal('1290.00'),
                'sale_price': Decimal('2290.00'),
                'stock': 120,
                'minimum_stock': 25,
                'tax_rate': Decimal('19.00'),
                'image': None,
            },
            {
                'category': 'Cadenas y Cuerdas',
                'name': 'Cuerda Polipropileno 10 mm',
                'sku': 'CAD-GEN-002',
                'barcode': '781200700002',
                'description': 'Rollo de cuerda de polipropileno para amarre y uso general.',
                'brand': 'Genérico',
                'unit': Product.ProductUnit.ROLL,
                'location': 'D-01-02',
                'cost_price': Decimal('10990.00'),
                'sale_price': Decimal('16990.00'),
                'stock': 16,
                'minimum_stock': 4,
                'tax_rate': Decimal('19.00'),
                'image': None,
            },
            {
                'category': 'Lubricantes',
                'name': 'Lubricante Multiuso WD-40 400 ml',
                'sku': 'LUB-WD40-001',
                'barcode': '781200800001',
                'description': 'Lubricante multiuso para proteger, desplazar humedad y destrabar piezas.',
                'brand': 'WD-40',
                'unit': Product.ProductUnit.UNIT,
                'location': 'D-02-01',
                'cost_price': Decimal('3990.00'),
                'sale_price': Decimal('6990.00'),
                'stock': 28,
                'minimum_stock': 8,
                'tax_rate': Decimal('19.00'),
                'image': None,
            },
            {
                'category': 'Lubricantes',
                'name': 'Aceite Cadena Motosierra 1 L',
                'sku': 'LUB-MAK-002',
                'barcode': '781200800002',
                'description': 'Aceite para lubricacion de cadenas de motosierra.',
                'brand': 'Makita',
                'unit': Product.ProductUnit.LITER,
                'location': 'D-02-02',
                'cost_price': Decimal('3490.00'),
                'sale_price': Decimal('5990.00'),
                'stock': 22,
                'minimum_stock': 6,
                'tax_rate': Decimal('19.00'),
                'image': None,
            },
        ]

        created_products = 0
        updated_products = 0

        self.stdout.write('Creando productos...')

        for product_data in products_data:
            category = categories[product_data['category']]
            product_defaults = {
                key: value
                for key, value in product_data.items()
                if key not in ('category', 'sku')
            }

            product, created = Product.objects.update_or_create(
                sku=product_data['sku'],
                defaults={
                    **product_defaults,
                    'category': category,
                    'is_active': True,
                },
            )

            if created:
                created_products += 1
                status = 'creado'
            else:
                updated_products += 1
                status = 'actualizado'

            self.stdout.write(
                self.style.SUCCESS(
                    f'  Producto {status}: {product.name} [{product.sku}]'
                )
            )

        self.stdout.write('')
        self.stdout.write(
            self.style.SUCCESS(
                'Seed de inventario completado correctamente.'
            )
        )
        self.stdout.write(f'Productos creados: {created_products}')
        self.stdout.write(f'Productos actualizados: {updated_products}')
