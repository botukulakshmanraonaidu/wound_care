from rest_framework import serializers
from .models import Admin, ActivityLog, SystemFile  # or User model

class UserCreateSerializer(serializers.ModelSerializer):
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = Admin
        fields = '__all__'
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords do not match")

        role = data.get('role_type')

        if role == 'doctor':
            if not data.get('specialization') or not data.get('license_id'):
                raise serializers.ValidationError(
                    "Doctor must have specialization and license ID"
                )

        if role == 'nurse':
            if not data.get('ward') or not data.get('shift'):
                raise serializers.ValidationError(
                    "Nurse must have ward and shift"
                )

        if role == 'admin':
            if not data.get('access_level'):
                raise serializers.ValidationError(
                    "Admin must have access level"
                )


        return data

    def create(self, validated_data):
        #  REMOVE confirm_password BEFORE SAVING
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')

        # Create user instance but don't save yet
        user = Admin(**validated_data)
        user.raw_password = password # SAVE PLAIN TEXT
        user.set_password(password) # HASH PASSWORD
        user.save()
        return user

class ActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = '__all__'

    def get_user_name(self, obj):
        # Optimization: use user_map from context to avoid N+1 queries
        user_map = self.context.get('user_map')
        if user_map is not None:
            return user_map.get(obj.user_email, obj.user_email)
            
        try:
            user = Admin.objects.filter(email=obj.user_email).only('full_name').first()
            return user.full_name if user else obj.user_email
        except:
            return obj.user_email

class AdminUserSerializer(serializers.ModelSerializer):
    """For listing and updating users"""
    class Meta:
        model = Admin
        fields = [
            'id', 'full_name', 'email', 'role_type', 'job_title', 
            'department', 'specialization', 'license_id', 
            'ward', 'shift', 'access_level', 
            'created_at', 'password', 'raw_password', 'bio', 'is_staff', 'is_superuser'
        ]
        read_only_fields = ['id', 'created_at', 'raw_password']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False}
        }

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.raw_password = password # UPDATE PLAIN TEXT
            instance.set_password(password) # UPDATE HASHED
        instance.save()
        return instance

class SystemFileSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True)

    class Meta:
        model = SystemFile
        fields = ['id', 'name', 'file', 'uploaded_by', 'uploaded_by_name', 'size', 'file_type', 'created_at']
        read_only_fields = ['size', 'file_type', 'created_at', 'uploaded_by']

    def create(self, validated_data):
        file = validated_data.get('file')
        if file:
            # Auto-calculate size
            size_bytes = file.size
            if size_bytes < 1024:
                validated_data['size'] = f"{size_bytes} B"
            elif size_bytes < 1024 * 1024:
                validated_data['size'] = f"{size_bytes / 1024:.1f} KB"
            else:
                validated_data['size'] = f"{size_bytes / (1024 * 1024):.1f} MB"
            
            # Auto-detect type
            import os
            ext = os.path.splitext(file.name)[1].upper().replace('.', '')
            validated_data['file_type'] = ext or 'UNKNOWN'
            
        return super().create(validated_data)
