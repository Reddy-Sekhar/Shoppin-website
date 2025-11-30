from rest_framework import serializers
from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    owner_email = serializers.EmailField(source='owner.email', read_only=True)
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'owner']

    def get_owner_name(self, obj):
        if not obj.owner:
            return None
        full_name = obj.owner.get_full_name().strip()
        if full_name:
            return full_name
        return obj.owner.email or obj.owner.username
