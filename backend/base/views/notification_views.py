"""Fast2SMS WhatsApp delivery reports.

    POST /api/notifications/whatsapp/?token=<FAST2SMS_WEBHOOK_SECRET>

Configure in Fast2SMS → WhatsApp → Webhooks: method POST (JSON), payload
    {"request_id": "{{request_id}}", "status": "{{status}}", "udf1": "{{udf1}}", "error": "{{failure_reason}}"}

The secret is accepted from the `token` query parameter or Fast2SMS's `webhook_secret_key` signing header
(nginx drops header names with underscores by default, so the URL token is the dependable option).
"""
import logging

from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from base import notifications

logger = logging.getLogger(__name__)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def whatsapp_status(request):
    secret = request.query_params.get('token') or request.META.get('HTTP_WEBHOOK_SECRET_KEY', '')
    if not notifications.webhook_secret_ok(secret):
        return Response(status=status.HTTP_403_FORBIDDEN)
    data = request.data if isinstance(request.data, dict) else {}
    try:
        result = notifications.apply_whatsapp_status(
            data.get('request_id'), data.get('udf1'), data.get('status'), str(data.get('error') or '')[:200])
    except Exception:
        logger.exception('WhatsApp status webhook failed')
        return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR)   # Fast2SMS retries up to 3 times
    return Response({'result': result})                                  # 2xx stops retries
