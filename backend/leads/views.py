from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Lead
from .serializers import LeadSerializer, LeadCreateSerializer


class LeadViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Lead management
    - List: ADMIN/SELLER only
    - Create: Any authenticated user
    - Update: ADMIN/SELLER only
    """
    queryset = Lead.objects.all()
    serializer_class = LeadSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return LeadCreateSerializer
        return LeadSerializer
    
    def get_queryset(self):
        user = self.request.user
        role = getattr(user, 'role', '').upper()
        if role == 'ADMIN':
            return Lead.objects.all()
        if role == 'SELLER':
            return Lead.objects.filter(assigned_to=user)
        return Lead.objects.none()
    
    def perform_create(self, serializer):
        # Auto-assign user if BUYER
        user = self.request.user
        if user.role == 'BUYER':
            serializer.save(user=user)
        elif user.role in ['SELLER', 'ADMIN']:
            serializer.save(assigned_to=user)
        else:
            serializer.save()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        lead_instance = serializer.instance
        read_serializer = LeadSerializer(lead_instance, context=self.get_serializer_context())
        headers = self.get_success_headers(read_serializer.data)
        return Response({'success': True, 'data': read_serializer.data}, status=status.HTTP_201_CREATED, headers=headers)
    
    @action(detail=False, methods=['get'], url_path='my-leads')
    def my_leads(self, request):
        """Get leads for current BUYER user"""
        user = request.user
        # If buyers shouldn't receive lead responses at all, return empty set
        if user.role != 'BUYER':
            # Non-buyers don't have a dedicated "my-leads" concept; return empty
            leads = Lead.objects.none()
        else:
            # Previously buyers could fetch their own leads; now we return none
            # to avoid exposing lead data to buyer role as requested.
            leads = Lead.objects.none()

        serializer = self.get_serializer(leads, many=True)
        return Response({
            'success': True,
            'count': leads.count(),
            'data': serializer.data
        })
