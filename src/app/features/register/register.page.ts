import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/core/services/auth';
import { Router } from '@angular/router';
import { HttpService } from 'src/app/core/services/http';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
})
export class RegisterPage implements OnInit {

  name: string = '';
  lastName: string = '';
  documentType: string = '';
  documentNumber: string = '';
  country: string = '';
  email: string = '';
  password: string = '';

  departments: any[] = [];

  constructor(
    private authService: AuthService,
    private router: Router,
    private httpService: HttpService,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.loadDepartments();
  }

  loadDepartments() {
    this.httpService.getDepartments().subscribe((data: any) => {
      this.departments = data;
    });
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'danger') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'top',
    });
    await toast.present();
  }

  async register() {
    if (
      !this.name ||
      !this.lastName ||
      !this.documentType ||
      !this.documentNumber ||
      !this.country ||
      !this.email ||
      !this.password
    ) {
      await this.showToast('Todos los campos son obligatorios', 'warning');
      return;
    }

    if (this.password.length < 6) {
      await this.showToast('La contraseña debe tener mínimo 6 caracteres', 'warning');
      return;
    }

    try {
      await this.authService.register(this.email, this.password, {
        name: this.name,
        lastName: this.lastName,
        documentType: this.documentType,
        documentNumber: this.documentNumber,
        country: this.country
      });

      await this.showToast('¡Registro exitoso! Bienvenido.', 'success');

    } catch (error) {
      console.error(error);
      await this.showToast('Error al registrar. Intenta de nuevo.', 'danger');
    }
  }
}
