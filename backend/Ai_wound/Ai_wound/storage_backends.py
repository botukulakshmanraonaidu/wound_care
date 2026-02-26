"""
Custom Cloudinary storage backend for Django 6.0+
Replaces django-cloudinary-storage (incompatible with Django 6.0).
Uses the official cloudinary SDK directly.
"""
import os
import io
import cloudinary
import cloudinary.uploader
import cloudinary.api
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible


@deconstructible
class CloudinaryMediaStorage(Storage):
    """
    Django 6.0-compatible storage backend for Cloudinary.
    Stores all media files (wound images, reports) to Cloudinary.
    """

    def _upload(self, name, content):
        """Upload file content to Cloudinary and return the result."""
        # Determine folder from the upload_to path
        folder = os.path.dirname(name) if '/' in name else ''
        
        # Read the file content
        if hasattr(content, 'read'):
            file_data = content.read()
        else:
            file_data = content

        # Build upload options
        upload_options = {
            'use_filename': True,
            'unique_filename': True,
            'overwrite': False,
        }
        if folder:
            upload_options['folder'] = folder

        # Upload to Cloudinary as a raw file (supports images, PDFs, etc.)
        result = cloudinary.uploader.upload(
            file_data,
            resource_type='auto',
            **upload_options
        )
        return result

    def _save(self, name, content):
        """Save a file and return the Cloudinary public_id as the name."""
        content.seek(0)
        result = self._upload(name, content)
        # Return the public_id — this is what gets stored in the DB field
        return result['public_id']

    def _open(self, name, mode='rb'):
        """Open a file — download from Cloudinary."""
        url = self.url(name)
        import urllib.request
        response = urllib.request.urlopen(url)
        return io.BytesIO(response.read())

    def url(self, name):
        """Return the full Cloudinary URL for the given resource name/public_id."""
        if not name:
            return ''
        # If it's already a full URL, return it
        if name.startswith('http://') or name.startswith('https://'):
            return name
        # Generate the Cloudinary URL from the public_id — signed for authorization
        return cloudinary.CloudinaryImage(name).build_url(secure=True, sign_url=True)

    def exists(self, name):
        """Check if a file exists in Cloudinary."""
        try:
            cloudinary.api.resource(name)
            return True
        except cloudinary.api.NotFound:
            return False
        except Exception:
            return False

    def delete(self, name):
        """Delete a file from Cloudinary."""
        try:
            cloudinary.uploader.destroy(name, resource_type='auto')
        except Exception:
            pass

    def size(self, name):
        """Return the file size in bytes from Cloudinary metadata."""
        try:
            resource = cloudinary.api.resource(name)
            return resource.get('bytes', 0)
        except Exception:
            return 0

    def get_available_name(self, name, max_length=None):
        """Cloudinary handles unique naming — return name as-is."""
        return name
