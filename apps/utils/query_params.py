"""Validate public filters before passing them to the ORM."""
from rest_framework import serializers


class QueryFilters(serializers.Serializer):
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)

    def validate(self, attrs):
        if attrs.get('date_from') and attrs.get('date_to') and attrs['date_from'] > attrs['date_to']:
            raise serializers.ValidationError({'date_to': 'La fecha final no puede ser anterior a la inicial.'})
        return attrs


def validated_filters(params, *, ids=(), choices=None):
    serializer = QueryFilters(data={key: value for key, value in params.items() if value != ''})
    for name in ids:
        serializer.fields[name] = serializers.IntegerField(required=False, min_value=1, max_value=9223372036854775807)
    for name, values in (choices or {}).items():
        serializer.fields[name] = serializers.ChoiceField(required=False, choices=values)
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


def optional_date(value, field):
    if not value:
        return None
    try:
        return serializers.DateField().run_validation(value)
    except serializers.ValidationError as exc:
        raise serializers.ValidationError({field: exc.detail}) from exc
