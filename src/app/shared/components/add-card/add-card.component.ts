import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ToastController } from '@ionic/angular';
import { AuthService } from 'src/app/core/services/auth';
import { CardService } from 'src/app/core/services/card.service';

@Component({
  selector: 'app-add-card-modal',
  templateUrl: './add-card-modal.component.html',
  styleUrls: ['./add-card-modal.component.scss'],
  standalone: false,
})
export class AddCardModalComponent {
  cardholderName = '';
  cardNumber = '';
  expiryDate = '';
  cvc = '';

  constructor(
    private modalCtrl: ModalController,
    private cardService: CardService,
    public auth: AuthService,
    private toastCtrl: ToastController
  ) {}

  async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'danger') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'top',
      color,
    });
    await toast.present();
  }

  async addCard() {
    // 1. Campos vacíos
    if (!this.cardholderName || !this.cardNumber || !this.expiryDate || !this.cvc) {
      await this.showToast('Por favor completa todos los campos', 'warning');
      return;
    }

    // 2. Formato de fecha
    if (!/^\d{2}\/\d{2}$/.test(this.expiryDate)) {
      await this.showToast('Formato de fecha inválido. Usa MM/YY', 'danger');
      return;
    }

    // 3. Validación mes/año con fecha actual (corregido: antes solo comparaba > 26)
    const [monthStr, yearStr] = this.expiryDate.split('/');
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);

    if (month < 1 || month > 12) {
      await this.showToast('Mes inválido', 'danger');
      return;
    }

    const now = new Date();
    const currentYear = now.getFullYear() % 100;
    const currentMonth = now.getMonth() + 1;

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      await this.showToast('La tarjeta está vencida', 'danger');
      return;
    }

    if (year > currentYear + 10) {
      await this.showToast('Año de vencimiento inválido', 'danger');
      return;
    }

    // 4. Luhn
    if (!this.validateLuhn(this.cardNumber)) {
      await this.showToast('Número de tarjeta inválido', 'danger');
      return;
    }

    // 5. Usuario autenticado
    const user = this.auth.getCurrentUser();
    if (!user) {
      await this.showToast('No hay usuario autenticado', 'danger');
      return;
    }

    // 6. Guardar — el CVC nunca se almacena (corregido: antes se guardaba en Firestore)
    const newCard = {
      cardholderName: this.cardholderName,
      cardNumber: this.cardNumber.replace(/\s+/g, ''),
      expiryDate: this.expiryDate,
      brand: this.detectBrand(this.cardNumber),
      createdAt: new Date()
    };

    try {
      await this.cardService.saveCard(newCard, user.uid);
      await this.showToast('¡Tarjeta guardada exitosamente!', 'success');
      await this.modalCtrl.dismiss({ saved: true }, 'confirm');
    } catch (err) {
      console.error('Error al guardar tarjeta:', err);
      await this.showToast('Error al guardar la tarjeta. Intenta de nuevo.', 'danger');
    }
  }

  validateLuhn(cardNumber: string): boolean {
    let sum = 0;
    let shouldDouble = false;
    const digits = cardNumber.replace(/\s+/g, '').split('').reverse();
    for (let digit of digits) {
      let num = parseInt(digit, 10);
      if (shouldDouble) { num *= 2; if (num > 9) num -= 9; }
      sum += num;
      shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
  }

  detectBrand(cardNumber: string): string {
    const num = cardNumber.replace(/\s+/g, '');
    if (/^4/.test(num)) return 'Visa';
    if (/^5[1-5]/.test(num) || /^2(2[2-9][1-9]|[3-6][0-9]{2}|7[01][0-9]|720)/.test(num)) return 'Mastercard';
    return 'Unknown';
  }

  formatCardNumber(num: string): string {
    return num.replace(/\D/g, '').slice(0,16).replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  }

  formatExpiryDate(value: string): string {
    return value.replace(/\D/g, '').slice(0,4).replace(/(\d{2})(?=\d)/, '$1/').trim();
  }

  onCardNumberInput(event: any) {
    const value = event.target.value.replace(/\D/g, '');
    this.cardNumber = this.formatCardNumber(value.slice(0, 16));
  }

  onNameInput(event: any) {
    this.cardholderName = event.target.value.replace(/[^A-Za-z\s]/g, '');
  }

  onExpiryInput(event: any) {
    const value = event.target.value.replace(/\D/g, '').slice(0,4);
    this.expiryDate = value.replace(/(\d{2})(?=\d)/, '$1/');
  }

  cancel() {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  onCvcInput(event: any) {
    this.cvc = event.target.value.replace(/\D/g, '').slice(0, 3);
  }
}
