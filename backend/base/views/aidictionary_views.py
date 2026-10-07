from django.http import Http404, HttpResponse

from base import aidictionary


def aidictionary_page(request, slug):
    """Server-rendered, crawlable knowledge record (no JavaScript needed to read it)."""
    record = aidictionary.get_record(slug)
    if record is None:
        raise Http404('No AI Dictionary record')
    return HttpResponse(aidictionary.render(record))
