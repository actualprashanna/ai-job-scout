from django.db import models
from django.contrib.auth.models import User

class SavedJob(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    link = models.URLField()
    snippet = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)


    class Meta:
        unique_together = ('user', 'link') # Prevent saving same job twice
        
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    cv_file = models.FileField(upload_to='resumes/', null=True, blank=True)
    raw_input = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.user.username