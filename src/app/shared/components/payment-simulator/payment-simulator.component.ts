import { Component, Input, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { faker } from '@faker-js/faker';
import { PaymentService } from 'src/app/core/services/payment';
import { AuthService } from 'src/app/core/services/auth';
import { CardService } from 'src/app/core/services/card.service';
import { NotificationService } from 'src/app/core/services/notification';

interface Merchant {
  name: string;
  category: string;
  icon: string;
  amount: number;
}

@Component({
  selector: 'app-payment-modal',
  templateUrl: './payment-simulator.component.html',
  styleUrls: ['./payment-simulator.component.scss'],
  standalone: false,
})
export class PaymentModalComponent implements OnInit {
  @Input() selectedCardId?: string;

  merchants: Merchant[] = [];
  selectedMerchant: Merchant | null = null;
  customAmount: number | null = null;
  isProcessing = false;
  defaultCard: any = null;
  cards: any[] = [];

  categories = [
    { label: 'Restaurantes', icon: '🍔' },
    { label: 'Supermercado', icon: '🛒' },
    { label: 'Transporte', icon: '🚕' },
    { label: 'Entretenimiento', icon: '🎬' },
    { label: 'Salud', icon: '💊' },
    { label: 'Ropa', icon: '👗' },
  ];

  constructor(
    private modalCtrl: ModalController,
    private paymentService: PaymentService,
    private authService: AuthService,
    private cardService: CardService,
    private toastCtrl: ToastController,
    private notificationService: NotificationService,
  ) {}

  ngOnInit() {
    this.generateMerchants();
    this.loadCards();
  }

  generateMerchants() {
    this.merchants = Array.from({ length: 6 }, (_, i) => {
      const category = this.categories[i];
      return {
        name: faker.company.name(),
        category: category.label,
        icon: category.icon,
        amount: parseFloat(faker.finance.amount({ min: 5, max: 500, dec: 2 })),
      };
    });
  }

  async loadCards() {
    const user = this.authService.getCurrentUser();
    if (user?.uid) {
      const cards = await this.cardService.loadCardsByUser(user.uid);
      this.cards = cards;
      this.defaultCard = cards.find((c) => c.isDefault) || cards[0];
    }
  }

  selectMerchant(merchant: Merchant) {
    this.selectedMerchant = merchant;
    this.customAmount = null;
  }

  get totalAmount(): number {
    return this.customAmount ?? this.selectedMerchant?.amount ?? 0;
  }

  get activeCard(): any {
    return (
      this.cards.find((c) => c.id === this.selectedCardId) || this.defaultCard
    );
  }

  async pay() {
    if (!this.selectedMerchant || !this.activeCard) return;
    this.isProcessing = true;

    try {
      const user = this.authService.getCurrentUser();
      if (!user?.uid) throw new Error('No hay usuario autenticado');

      // Guardar transacción en Firestore con timeout de 15s
      await Promise.race([
        this.paymentService.processPayment({
          cardId: this.activeCard.id,
          uid: user.uid,
          merchant: this.selectedMerchant.name,
          merchantCategory: this.selectedMerchant.category,
          amount: this.totalAmount,
          currency: 'COP',
          date: new Date(),
          status: 'approved',
        }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Timeout guardando transacción')),
            15000,
          ),
        ),
      ]);

      // Notificación en segundo plano — nunca bloquea el flujo del pago
      this.notificationService
        .notifyPaymentSuccess(
          user.uid,
          this.selectedMerchant.name,
          this.totalAmount,
        )
        .catch((err) => console.warn('Notificación no enviada:', err));

      const toast = await this.toastCtrl.create({
        message: `✅ Pago de $${this.totalAmount.toLocaleString()} a ${this.selectedMerchant.name} aprobado`,
        duration: 3000,
        color: 'success',
        position: 'top',
      });
      await toast.present();
      this.modalCtrl.dismiss({ success: true });
    } catch (err: any) {
      console.error('Error en pago:', err?.message || err);
      await this.notificationService.hapticError();
      const toast = await this.toastCtrl.create({
        message: '❌ Error procesando el pago. Intenta de nuevo.',
        duration: 2500,
        color: 'danger',
        position: 'top',
      });
      await toast.present();
    } finally {
      this.isProcessing = false;
    }
  }

  shuffleMerchants() {
    this.generateMerchants();
    this.selectedMerchant = null;
  }

  close() {
    this.modalCtrl.dismiss();
  }

  getCardClass(brand: string): string {
    const b = this.getBrandKey(brand);
    const map: any = {
      visa: 'acf-visa',
      mastercard: 'acf-mc',
      amex: 'acf-amex',
    };
    return map[b] || 'acf-unknown';
  }

  getBrandKey(brand: string): string {
    const b = (brand || '').toLowerCase();
    if (b.includes('visa')) return 'visa';
    if (b.includes('master')) return 'mastercard';
    if (b.includes('amex') || b.includes('american')) return 'amex';
    return 'unknown';
  }

  formatCardNumber(num: string): string {
    if (!num) return '**** **** **** ****';
    const clean = num.replace(/\D/g, '');
    return clean.replace(/(.{4})/g, '$1  ').trim();
  }
}
