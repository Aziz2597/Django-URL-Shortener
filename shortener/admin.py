from django.contrib import admin
from .models import URLMapping, ClickAnalytics

@admin.register(URLMapping)
class URLMappingAdmin(admin.ModelAdmin):
    list_display = ['short_code', 'original_url_truncated', 'click_count', 'created_at', 'expires_at', 'is_active', 'is_expired_status']
    list_filter = ['is_active', 'created_at', 'expires_at']
    search_fields = ['short_code', 'original_url']
    readonly_fields = ['created_at', 'click_count', 'short_url']
    list_editable = ['is_active']
    ordering = ['-created_at']
    
    def original_url_truncated(self, obj):
        return obj.original_url[:50] + "..." if len(obj.original_url) > 50 else obj.original_url
    original_url_truncated.short_description = 'Original URL'
    
    def is_expired_status(self, obj):
        return "Yes" if obj.is_expired() else "No"
    is_expired_status.short_description = 'Expired'
    is_expired_status.boolean = True
    
    fieldsets = (
        (None, {
            'fields': ('original_url', 'short_code', 'short_url')
        }),
        ('Settings', {
            'fields': ('is_active', 'expires_at')
        }),
        ('Statistics', {
            'fields': ('click_count', 'created_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(ClickAnalytics)
class ClickAnalyticsAdmin(admin.ModelAdmin):
    list_display = ['url_mapping', 'clicked_at', 'ip_address', 'user_agent_truncated']
    list_filter = ['clicked_at', 'url_mapping']
    search_fields = ['url_mapping__short_code', 'ip_address']
    readonly_fields = ['clicked_at']
    ordering = ['-clicked_at']
    
    def user_agent_truncated(self, obj):
        return obj.user_agent[:50] + "..." if len(obj.user_agent) > 50 else obj.user_agent
    user_agent_truncated.short_description = 'User Agent'

# Customize admin site
admin.site.site_header = "URL Shortener Admin"
admin.site.site_title = "URL Shortener"
admin.site.index_title = "Welcome to URL Shortener Administration"