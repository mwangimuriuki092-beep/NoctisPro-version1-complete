from django.shortcuts import render
from django.contrib.auth.decorators import login_required


@login_required
def system_status(request):
    """System status check page"""
    context = {
        'domain_name': request.get_host(),
        'is_https': request.is_secure(),
        'user_id': request.user.id if request.user.is_authenticated else None,
    }
    return render(request, 'system_status.html', context)