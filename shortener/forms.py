from django import forms
from .models import URLMapping
from django.core.validators import URLValidator
from django.core.exceptions import ValidationError

class URLShortenForm(forms.ModelForm):
    original_url = forms.URLField(
        widget=forms.URLInput(attrs={
            'class': 'form-control',
            'placeholder': 'Enter your long URL here...',
            'required': True
        }),
        label='Long URL',
        help_text='Enter a valid URL (including http:// or https://)'
    )
    
    custom_code = forms.CharField(
        max_length=20,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Optional: Custom short code'
        }),
        label='Custom Short Code (Optional)',
        help_text='Leave blank for auto-generated code'
    )
    
    expires_in_days = forms.IntegerField(
        initial=7,
        min_value=1,
        max_value=365,
        widget=forms.NumberInput(attrs={
            'class': 'form-control',
            'min': 1,
            'max': 365
        }),
        label='Expires in (days)',
        help_text='URL will expire after specified days (1-365)'
    )
    
    class Meta:
        model = URLMapping
        fields = ['original_url']
    
    def clean_original_url(self):
        url = self.cleaned_data['original_url']
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        
        # Validate URL format
        validator = URLValidator()
        try:
            validator(url)
        except ValidationError:
            raise forms.ValidationError("Please enter a valid URL.")
        
        return url
    
    def clean_custom_code(self):
        custom_code = self.cleaned_data.get('custom_code')
        if custom_code:
            if URLMapping.objects.filter(short_code=custom_code).exists():
                raise forms.ValidationError("This custom code is already taken.")
            if not custom_code.replace('_', '').replace('-', '').isalnum():
                raise forms.ValidationError("Custom code can only contain letters, numbers, hyphens, and underscores.")
        return custom_code