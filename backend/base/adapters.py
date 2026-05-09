from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.shortcuts import redirect
from rest_framework_simplejwt.tokens import RefreshToken
from allauth.account.adapter import DefaultAccountAdapter


class CustomAccountAdapter(DefaultAccountAdapter):
    def get_login_redirect_url(self, request):
        # You can do additional processing here before redirecting
        user = request.user
        if user.is_authenticated:
            tokens = get_tokens_for_user(user)
            #redirect_url = f'http://localhost:3000/accounts/google/login/callback?access={tokens["access"]}&refresh={tokens["refresh"]}&id={user.id}&username={user.username}&email={user.email}'
            redirect_url = f'https://www.wedmangal.com/accounts/google/login/callback?access={tokens["access"]}&refresh={tokens["refresh"]}&id={user.id}&username={user.username}&email={user.email}'

            return redirect(redirect_url)


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

class MySocialAccountAdapter(DefaultSocialAccountAdapter):
    def save_user(self, request, sociallogin, form=None):
        user = super().save_user(request, sociallogin, form)
        tokens = get_tokens_for_user(user)
        sociallogin.token = tokens  # Attach tokens to the response
        return user

    def get_login_redirect_url(self, request):
        user = request.user
        if user.is_authenticated:
            tokens = get_tokens_for_user(user)
            redirect_url = f'https://www.wedmangal.com/accounts/google/login/callback?access={tokens["access"]}&refresh={tokens["refresh"]}&id={user.id}&username={user.username}&email={user.email}'

           

            return redirect(redirect_url)
        return super().get_login_redirect_url(request)
