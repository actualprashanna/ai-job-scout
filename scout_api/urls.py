from django.urls import path
from .views import TransformInputView, AnalyzeCVView, SearchJobsView

urlpatterns = [
    path('transform-input/', TransformInputView.as_view(), name='transform-input'),
    path('analyze-cv/', AnalyzeCVView.as_view(), name='analyze-cv'),
    path('search-jobs/', SearchJobsView.as_view(), name='search-jobs'),
]