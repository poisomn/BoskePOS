from rest_framework.throttling import AnonRateThrottle


class LoginThrottle(AnonRateThrottle):
    scope = 'login'


class RefreshThrottle(AnonRateThrottle):
    scope = 'token_refresh'
