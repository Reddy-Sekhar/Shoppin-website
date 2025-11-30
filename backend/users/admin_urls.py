from django.urls import path
from .views import AdminUserListView, AdminUserDetailView

urlpatterns = [
    path('', AdminUserListView.as_view(), name='admin_user_list'),
    path('<int:pk>/', AdminUserDetailView.as_view(), name='admin_user_detail'),
]
