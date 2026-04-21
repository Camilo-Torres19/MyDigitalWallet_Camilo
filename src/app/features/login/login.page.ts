import { Component } from '@angular/core';
import { AuthService } from 'src/app/core/services/auth';
import { BiometricService } from 'src/app/core/services/biometric.service';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage {

  email: string = '';
  password: string = '';
  isLoading: boolean = false;
  isGoogleLoading: boolean = false;

  constructor(
    private authService: AuthService,
    private biometricService: BiometricService,
    private router: Router,
    private toastCtrl: ToastController
  ) {}

  // ── Login con email/password ──────────────────────────────
  async login() {
    if (!this.email || !this.password) {
      await this.showToast('Por favor completa todos los campos', 'warning');
      return;
    }
    this.isLoading = true;
    try {
      await this.authService.login(this.email, this.password);
      await this.showToast('¡Bienvenido de nuevo!', 'success');
      this.router.navigateByUrl('/home');
    } catch (error: any) {
      const msg = this.getFirebaseError(error.code);
      await this.showToast(msg, 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  // ── Login con Google ──────────────────────────────────────
  async loginGoogle() {
    this.isGoogleLoading = true;
    try {
      await this.authService.loginWithGoogle();
      await this.showToast('¡Bienvenido!', 'success');
      this.router.navigateByUrl('/home');
    } catch (error: any) {
      await this.showToast('Error al iniciar con Google', 'danger');
    } finally {
      this.isGoogleLoading = false;
    }
  }

  // ── Login biométrico ──────────────────────────────────────
  async loginBiometric() {
    try {
      const available = await this.biometricService.isAvailable();
      if (!available) {
        await this.showToast('Tu dispositivo no soporta biometría', 'warning');
        return;
      }

      const verified = await this.biometricService.verifyIdentity();
      if (!verified) {
        await this.showToast('Autenticación biométrica fallida', 'danger');
        return;
      }

      const credentials = await this.biometricService.getCredentials();
      if (!credentials?.username || !credentials?.password) {
        await this.showToast('Primero activa la biometría desde tu perfil', 'warning');
        return;
      }

      await this.authService.login(credentials.username, credentials.password);
      await this.showToast('¡Bienvenido!', 'success');
      this.router.navigateByUrl('/home');
    } catch (error: any) {
      await this.showToast('Error en autenticación biométrica', 'danger');
    }
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'top',
    });
    await toast.present();
  }

  private getFirebaseError(code: string): string {
    switch (code) {
      case 'auth/user-not-found':    return 'Usuario no encontrado';
      case 'auth/wrong-password':    return 'Contraseña incorrecta';
      case 'auth/invalid-email':     return 'Correo inválido';
      case 'auth/too-many-requests': return 'Demasiados intentos, intenta más tarde';
      case 'auth/invalid-credential':return 'Credenciales inválidas';
      default:                       return 'Error al iniciar sesión';
    }
  }
}
