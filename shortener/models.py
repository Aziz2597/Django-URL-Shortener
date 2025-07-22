import string
import random
from django.db import models
from django.utils import timezone
from datetime import timedelta
from django.conf import settings

class URLMapping(models.Model):
    original_url = models.URLField(max_length=2000)
    short_code = models.CharField(max_length=10, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    click_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'URL Mapping'
        verbose_name_plural = 'URL Mappings'
    
    def __str__(self):
        return f"{self.short_code} -> {self.original_url[:50]}..."
    
    def save(self, *args, **kwargs):
        if not self.short_code:
            self.short_code = self.generate_short_code()
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=7)  # Default 7 days expiration
        super().save(*args, **kwargs)
    
    def generate_short_code(self):
        """Generate a unique short code"""
        characters = string.ascii_letters + string.digits
        while True:
            short_code = ''.join(random.choice(characters) for _ in range(settings.SHORT_URL_LENGTH))
            if not URLMapping.objects.filter(short_code=short_code).exists():
                return short_code
    
    def is_expired(self):
        """Check if URL has expired"""
        return self.expires_at and timezone.now() > self.expires_at
    
    def increment_click(self):
        """Increment click count"""
        self.click_count += 1
        self.save(update_fields=['click_count'])
    
    @property
    def short_url(self):
        """Return full short URL"""
        return f"{settings.BASE_URL}/{self.short_code}"

class ClickAnalytics(models.Model):
    url_mapping = models.ForeignKey(URLMapping, on_delete=models.CASCADE, related_name='clicks')
    clicked_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    referer = models.URLField(max_length=1000, blank=True)
    
    class Meta:
        ordering = ['-clicked_at']
        verbose_name = 'Click Analytics'
        verbose_name_plural = 'Click Analytics'
    
    def __str__(self):
        return f"Click on {self.url_mapping.short_code} at {self.clicked_at}"