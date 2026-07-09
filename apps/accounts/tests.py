from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class AccountsApiTests(APITestCase):
    def setUp(self):
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

    def test_me_returns_authenticated_user(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse('accounts:me'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], self.user.email)

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
