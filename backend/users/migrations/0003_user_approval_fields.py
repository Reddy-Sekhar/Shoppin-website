from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_passwordresetrequest'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='approval_notes',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='user',
            name='approval_status',
            field=models.CharField(choices=[('APPROVED', 'Approved'), ('PENDING', 'Pending Review'), ('REJECTED', 'Rejected')], default='APPROVED', max_length=20),
        ),
        migrations.AddField(
            model_name='user',
            name='approved_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='approved_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='approved_users', to=settings.AUTH_USER_MODEL),
        ),
    ]
