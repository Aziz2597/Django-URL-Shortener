from django.apps import AppConfig


class ShortenerConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'shortener'
    verbose_name = 'URL Shortener'
    
    def ready(self):
        """
        This method is called when the app is ready.
        It's a good place to register signals or perform other initialization.
        """
        pass