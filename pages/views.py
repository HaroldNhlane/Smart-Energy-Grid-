from django.shortcuts import render

def index(request):
    """A simple view that renders the index.html template."""
    return render(request, 'index.html')