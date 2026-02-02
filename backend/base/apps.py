# apps.py or any other location where AppConfig is defined
from django.apps import AppConfig
# apps.py




class BaseConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'base'

    def ready(self):
        import base.signals  # Import your signals module
