import { Component, OnInit } from '@angular/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { environment } from '../environments/environment';
import { NotificationService } from 'src/app/core/services/notification';
import { AuthService } from 'src/app/core/services/auth';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: false
})
export class AppComponent implements OnInit {

  constructor(
    private notificationService: NotificationService,
    private auth: AuthService
  ) {}

  async ngOnInit() {
    // Social Login init
    await SocialLogin.initialize({
      google: {
        webClientId: environment.googleWebClientId,
      },
    });

    // Notificaciones: espera a que el usuario esté autenticado
  this.auth.userProfile$.pipe(
    filter(user => !!user),
  ).subscribe(async (user: any) => {
    await this.notificationService.init(user.uid);
  });
}
}