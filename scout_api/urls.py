from django.urls import path
from .views import (
    TransformInputView, AnalyzeCVView, SearchJobsView, 
    AutoScoutView, RegisterView, LoginView, ProfileView
)

urlpatterns = [
    # Auth Endpoints
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),

    # New CV-First Workflow Endpoint
    path('auto-scout/', AutoScoutView.as_view(), name='auto-scout'),
    
    # Legacy & Auxiliary Endpoints
    path('transform-input/', TransformInputView.as_view(), name='transform-input'),
    path('analyze-cv/', AnalyzeCVView.as_view(), name='analyze-cv'),
    path('search-jobs/', SearchJobsView.as_view(), name='search-jobs'),
    path('profile/', ProfileView.as_view(), name='profile'),
]