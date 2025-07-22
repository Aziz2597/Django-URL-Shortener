from django.urls import path
from . import views

app_name = 'shortener'

urlpatterns = [
    path('', views.HomeView.as_view(), name='home'),
    path('analytics/', views.AnalyticsView.as_view(), name='analytics'),
    path('api/info/<str:short_code>/', views.url_info, name='url_info'),
    path('<str:short_code>/', views.redirect_url, name='redirect'),
]