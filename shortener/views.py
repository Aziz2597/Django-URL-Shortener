from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse, Http404
from django.views.generic import CreateView, ListView
from django.contrib import messages
from django.utils import timezone
from django.db.models import Count
from datetime import timedelta
from .models import URLMapping, ClickAnalytics
from .forms import URLShortenForm

def get_client_ip(request):
    """Get client IP address"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

class HomeView(CreateView):
    model = URLMapping
    form_class = URLShortenForm
    template_name = 'shortener/home.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['recent_urls'] = URLMapping.objects.filter(is_active=True)[:5]
        return context
    
    def form_valid(self, form):
        url_mapping = form.save(commit=False)
        
        # Handle custom code
        custom_code = form.cleaned_data.get('custom_code')
        if custom_code:
            url_mapping.short_code = custom_code
        
        # Set expiration
        expires_in_days = form.cleaned_data.get('expires_in_days', 7)
        url_mapping.expires_at = timezone.now() + timedelta(days=expires_in_days)
        
        url_mapping.save()
        
        # Return JSON response for AJAX
        if self.request.headers.get('Content-Type') == 'application/json':
            return JsonResponse({
                'success': True,
                'short_url': url_mapping.short_url,
                'short_code': url_mapping.short_code,
                'original_url': url_mapping.original_url,
                'expires_at': url_mapping.expires_at.isoformat()
            })
        
        messages.success(self.request, f'Short URL created: {url_mapping.short_url}')
        return render(self.request, 'shortener/home.html', {
            'form': URLShortenForm(),
            'success_url': url_mapping.short_url,
            'short_code': url_mapping.short_code,
            'original_url': url_mapping.original_url,
            'recent_urls': URLMapping.objects.filter(is_active=True)[:5]
        })

def redirect_url(request, short_code):
    """Redirect to original URL and track analytics"""
    url_mapping = get_object_or_404(URLMapping, short_code=short_code, is_active=True)
    
    # Check if expired
    if url_mapping.is_expired():
        raise Http404("This short URL has expired.")
    
    # Track analytics
    ClickAnalytics.objects.create(
        url_mapping=url_mapping,
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        referer=request.META.get('HTTP_REFERER', '')
    )
    
    # Increment click count
    url_mapping.increment_click()
    
    return redirect(url_mapping.original_url)

class AnalyticsView(ListView):
    model = URLMapping
    template_name = 'shortener/analytics.html'
    context_object_name = 'url_mappings'
    paginate_by = 20
    
    def get_queryset(self):
        return URLMapping.objects.filter(is_active=True).annotate(
            total_clicks=Count('clicks')
        ).order_by('-click_count')
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Statistics
        context['total_urls'] = URLMapping.objects.filter(is_active=True).count()
        context['total_clicks'] = sum(url.click_count for url in URLMapping.objects.filter(is_active=True))
        context['active_urls'] = URLMapping.objects.filter(
            is_active=True,
            expires_at__gt=timezone.now()
        ).count()
        
        # Recent clicks (last 24 hours)
        yesterday = timezone.now() - timedelta(days=1)
        context['recent_clicks'] = ClickAnalytics.objects.filter(
            clicked_at__gte=yesterday
        ).count()
        
        return context

def url_info(request, short_code):
    """API endpoint to get URL info"""
    url_mapping = get_object_or_404(URLMapping, short_code=short_code)
    
    return JsonResponse({
        'short_code': url_mapping.short_code,
        'original_url': url_mapping.original_url,
        'created_at': url_mapping.created_at.isoformat(),
        'expires_at': url_mapping.expires_at.isoformat() if url_mapping.expires_at else None,
        'click_count': url_mapping.click_count,
        'is_active': url_mapping.is_active,
        'is_expired': url_mapping.is_expired(),
        'short_url': url_mapping.short_url
    })