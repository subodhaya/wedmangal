from django.db.models.signals import pre_save
from django.contrib.auth.models import User
# signals.py

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import Profile
from django.dispatch import receiver




@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    # Skip on fixture loads (manage.py loaddata) — the fixture brings its own
    # Profile rows, and creating one here collides with them on the unique
    # user_id constraint.
    if kwargs.get('raw'):
        return
    if created:
        # Create a Profile with a default role
        Profile.objects.create(
            user=instance,
            role='customer'  # Set default role here
        )

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if kwargs.get('raw'):
        return
    instance.profile.save()



@receiver(post_save, sender=User)
def update_user(sender, instance, created, **kwargs):
    if kwargs.get('raw'):
        return

    if created:  # Only run this for newly created users
        if not instance.username:  # Check if username is empty
            instance.username = instance.email.split('@')[0]  # or any custom logic you need
            instance.save(update_fields=['username'])




