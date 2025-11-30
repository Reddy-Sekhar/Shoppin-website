import logging
import random
from datetime import timedelta

from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.mail import send_mail
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone
from django.db.models import Q
from rest_framework.exceptions import ValidationError

from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    AdminUserUpdateSerializer,
    ChangePasswordSerializer,
    PasswordResetRequestSerializer,
    PasswordResetVerifySerializer,
    PasswordResetConfirmSerializer,
    CustomTokenObtainPairSerializer,
)
from .models import PasswordResetRequest
from .permissions import IsAdminRole

User = get_user_model()
logger = logging.getLogger(__name__)


class RegisterView(generics.CreateAPIView):
    """User registration endpoint"""
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = UserCreateSerializer


class CustomTokenObtainPairView(TokenObtainPairView):
    """Login endpoint - returns JWT tokens + user data"""
    serializer_class = CustomTokenObtainPairSerializer



class CurrentUserView(generics.RetrieveUpdateAPIView):
    """Get or update current authenticated user data"""
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UserUpdateSerializer
        return UserSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        read_serializer = UserSerializer(user, context={'request': request})
        return Response(read_serializer.data, status=status.HTTP_200_OK)


class PasswordResetRequestView(generics.GenericAPIView):
    """Initiate password reset by sending an OTP to the user's email."""

    permission_classes = [AllowAny]
    serializer_class = PasswordResetRequestSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email'].strip().lower()
        user = User.objects.filter(email__iexact=email).first()

        if not user:
            return Response(
                {'error': 'No account found with that email address.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Remove previous unused requests
        PasswordResetRequest.objects.filter(user=user, used_at__isnull=True).delete()

        otp = f"{random.randint(0, 999999):06d}"
        expires_at = timezone.now() + timedelta(minutes=getattr(settings, 'PASSWORD_RESET_OTP_EXPIRY_MINUTES', 10))

        reset_request = PasswordResetRequest.objects.create(
            user=user,
            otp_hash=make_password(otp),
            expires_at=expires_at,
        )

        subject = 'Your Prime Apparel password reset code'
        message = (
            f"Hello {user.get_full_name() or 'there'},\n\n"
            f"Your password reset code is {otp}. This code will expire in "
            f"{getattr(settings, 'PASSWORD_RESET_OTP_EXPIRY_MINUTES', 10)} minutes.\n\n"
            "If you did not request this, you can safely ignore this email.\n\n"
            "Thank you,\nPrime Apparel Team"
        )

        try:
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)
        except Exception:  # pragma: no cover - depends on SMTP configuration
            logger.exception('Failed to send password reset email for %s', user.email)
            reset_request.delete()
            return Response(
                {'error': 'Unable to send OTP email right now. Please try again later.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({
            'message': 'If an account exists for this email, an OTP has been sent.'
        }, status=status.HTTP_200_OK)


class PasswordResetVerifyView(generics.GenericAPIView):
    """Verify the OTP sent to the user's email address."""

    permission_classes = [AllowAny]
    serializer_class = PasswordResetVerifySerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email'].strip().lower()
        otp = serializer.validated_data['otp']

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response(
                {'error': 'Invalid or expired OTP. Please request a new code.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reset_request = (
            PasswordResetRequest.objects
            .filter(user=user, used_at__isnull=True)
            .order_by('-created_at')
            .first()
        )

        if not reset_request:
            return Response(
                {'error': 'No active OTP found. Please request a new code.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if reset_request.expires_at < timezone.now():
            reset_request.used_at = timezone.now()
            reset_request.save(update_fields=['used_at'])
            return Response(
                {'error': 'This OTP has expired. Please request a new one.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not check_password(otp, reset_request.otp_hash):
            reset_request.attempt_count += 1
            update_fields = ['attempt_count']

            max_attempts = getattr(settings, 'PASSWORD_RESET_MAX_ATTEMPTS', 5)
            if max_attempts and reset_request.attempt_count >= max_attempts:
                reset_request.used_at = timezone.now()
                update_fields.append('used_at')

            reset_request.save(update_fields=update_fields)

            if max_attempts and reset_request.attempt_count >= max_attempts:
                return Response(
                    {'error': 'Too many invalid attempts. Please request a new OTP.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            return Response(
                {'error': 'Invalid OTP. Please try again.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reset_request.verified_at = timezone.now()
        reset_request.attempt_count = 0
        reset_request.save(update_fields=['verified_at', 'attempt_count'])

        return Response(
            {
                'message': 'OTP verified successfully.',
                'reset_token': str(reset_request.token),
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(generics.GenericAPIView):
    """Set a new password after OTP verification."""

    permission_classes = [AllowAny]
    serializer_class = PasswordResetConfirmSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email'].strip().lower()
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response(
                {'error': 'Invalid password reset request.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reset_request = (
            PasswordResetRequest.objects
            .filter(user=user, token=token, used_at__isnull=True)
            .order_by('-created_at')
            .first()
        )

        if not reset_request:
            return Response(
                {'error': 'Invalid or expired reset token.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if reset_request.expires_at < timezone.now():
            reset_request.used_at = timezone.now()
            reset_request.save(update_fields=['used_at'])
            return Response(
                {'error': 'Reset token has expired. Please request a new OTP.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not reset_request.verified_at:
            return Response(
                {'error': 'OTP has not been verified yet.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save()

        reset_request.used_at = timezone.now()
        reset_request.save(update_fields=['used_at'])

        # Clean up any other stale requests for this user
        PasswordResetRequest.objects.filter(user=user).exclude(pk=reset_request.pk).delete()

        return Response({'message': 'Password reset successfully.'}, status=status.HTTP_200_OK)


class ChangePasswordView(generics.GenericAPIView):
    """Change password endpoint for authenticated users"""
    permission_classes = [IsAuthenticated]
    serializer_class = ChangePasswordSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()

        return Response({'message': 'Password updated successfully'}, status=status.HTTP_200_OK)


class AdminUserListView(generics.ListAPIView):
    """Allow admins to view/search all non-admin users."""

    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get_queryset(self):
        queryset = super().get_queryset().exclude(role='ADMIN')
        search = self.request.query_params.get('search', '').strip()
        role = self.request.query_params.get('role', '').strip().upper()

        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(company__icontains=search)
            )

        if role:
            queryset = queryset.filter(role__iexact=role)

        status_param = self.request.query_params.get('status', '').strip().upper()
        if status_param:
            queryset = queryset.filter(approval_status=status_param)

        return queryset


class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Allow admins to view, edit, or delete a specific user."""

    queryset = User.objects.exclude(role='ADMIN')
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return AdminUserUpdateSerializer
        return UserSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        if instance.pk == request.user.pk:
            raise ValidationError('You cannot edit your own admin account here.')
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        previous_status = instance.approval_status
        user = serializer.save()
        if user.approval_status != previous_status:
            self._handle_status_transition(user)
        elif user.approval_status == 'APPROVED' and not user.is_active:
            user.is_active = True
            user.save(update_fields=['is_active'])
        read_serializer = UserSerializer(user, context={'request': request})
        return Response(read_serializer.data, status=status.HTTP_200_OK)

    def perform_destroy(self, instance):
        if instance.pk == self.request.user.pk:
            raise ValidationError('You cannot delete your own account while logged in.')
        instance.delete()

    def _handle_status_transition(self, user):
        new_status = user.approval_status
        update_fields = ['approval_status']

        if new_status == 'APPROVED':
            user.is_active = True
            user.approved_at = timezone.now()
            user.approved_by = self.request.user
            update_fields.extend(['is_active', 'approved_at', 'approved_by'])
            user.save(update_fields=update_fields)
            self._send_status_email(user, approved=True)
        elif new_status == 'REJECTED':
            user.is_active = False
            user.approved_at = None
            user.approved_by = None
            update_fields.extend(['is_active', 'approved_at', 'approved_by'])
            user.save(update_fields=update_fields)
            self._send_status_email(user, approved=False)
        else:  # pending reset
            user.is_active = False
            user.approved_at = None
            user.approved_by = None
            update_fields.extend(['is_active', 'approved_at', 'approved_by'])
            user.save(update_fields=update_fields)

    def _send_status_email(self, user, approved=True):
        if not user.email:
            return
        subject = 'Your Prime Apparel account has been approved' if approved else 'Update on your Prime Apparel account'
        if approved:
            message = (
                f"Hello {user.get_full_name() or 'there'},\n\n"
                "Your seller/designer account has been approved by our team. "
                "You can now log in and start using the Prime Apparel platform.\n\n"
                "Thank you for partnering with us!"
            )
        else:
            notes = user.approval_notes or 'Unfortunately, we could not approve your account at this time.'
            message = (
                f"Hello {user.get_full_name() or 'there'},\n\n"
                "We reviewed your seller/designer application but could not approve it at this time.\n"
                f"Reason: {notes}\n\n"
                "If you believe this is a mistake or wish to re-apply, please contact our support team."
            )

        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@primeapparel.local')
        try:
            send_mail(subject, message, from_email, [user.email], fail_silently=False)
        except Exception:
            logger.exception('Failed to send approval notification to %s', user.email)
