import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-edit-card-modal',
  templateUrl: './edit-card-modal.component.html',
  styleUrls: ['./edit-card-modal.component.scss'],
  standalone: false,
})
export class EditCardModalComponent {
  @Input() card: any;

  constructor(private modalCtrl: ModalController) {}

save() {
  this.modalCtrl.dismiss({
    id: this.card.id,
    cardNumber: this.card.cardNumber ?? '',
    brand: this.card.brand ?? '',
     expiryDate: this.card.expiryDate ?? '',
     cardholderName: this.card.cardholderName ?? ''
  }, 'confirm');
  console.log('Card dentro del modal:', this.card);

}



  cancel() {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  detectBrand(cardNumber: string): string {
  const num = (cardNumber || '').replace(/\s+/g, '');
  if (/^4/.test(num)) return 'Visa';
  if (/^5[1-5]/.test(num) || /^2/.test(num)) return 'Mastercard';
  return 'Unknown';
}



getBrandKey(cardNumber: string): string {
  const n = (cardNumber || '').replace(/\s/g, '');
  if (/^4/.test(n)) return 'visa';
  if (/^5[1-5]|^2[2-7]/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  return 'unknown';
}

getCardClass(cardNumber: string): string {
  const map: Record<string, string> = {
    visa: 'acf-visa', mastercard: 'acf-mc',
    amex: 'acf-amex', unknown: 'acf-unknown'
  };
  return map[this.getBrandKey(cardNumber)] || 'acf-unknown';
}

formatCardNumber(num: string): string {
  if (!num) return '';
  const clean = num.replace(/\D/g, '');
  return clean.replace(/(.{4})/g, '$1 ').trim();
}

onCardNumberInput(event: any) {
  let val = event.target.value.replace(/\D/g, '').slice(0, 16);
  this.card.cardNumber = val.replace(/(.{4})/g, '$1 ').trim();
}

onExpiryInput(event: any) {
  let val = event.target.value.replace(/\D/g, '').slice(0, 4);
  if (val.length >= 3) val = val.slice(0, 2) + '/' + val.slice(2);
  this.card.expiryDate = val;
}

}

