import { Component, Input, OnInit } from '@angular/core';
import { ModalController, ActionSheetController } from '@ionic/angular';
import { CardService } from 'src/app/core/services/card.service';
import { PaymentService, Transaction } from 'src/app/core/services/payment';
import { AuthService } from 'src/app/core/services/auth';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'app-total-expenses-modal',
  templateUrl: 'total-expenses.component.html',
  styleUrls: ['total-expenses.component.scss'],
  standalone: false,
})
export class TotalExpensesModalComponent {

  selectedCard: any = null;
  allCards: any[] = [];

  selectedDate: Date = new Date();
  currentMonth: Date = new Date();

  transactions: Transaction[] = [];
  totalSpend: number = 0;
  monthlyLimit: number = 2000; // puedes hacerlo dinámico si tienes ese dato

  calendarDays: (number | null)[] = [];
  weekDays = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  constructor(
    private modalCtrl: ModalController,
    private actionSheetCtrl: ActionSheetController,
    private cardService: CardService,
    private paymentService: PaymentService,
    private auth: AuthService
  ) {}

  async ionViewWillEnter() {
    await this.loadData();
  }

  private async loadData() {
    const user = this.auth.getCurrentUser();
    if (!user?.uid) return;

    this.allCards = await this.cardService.loadCardsByUser(user.uid);
    this.selectedCard = this.allCards.find(c => c.isDefault) || this.allCards[0];

    this.buildCalendar();
    await this.loadTransactionsForDate(this.selectedDate);
    await this.loadMonthlyTotal();
  }

  buildCalendar() {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    this.calendarDays = [];
    for (let i = 0; i < firstDay; i++) {
      this.calendarDays.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      this.calendarDays.push(d);
    }
  }

  async prevMonth() {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() - 1,
      1
    );
    this.buildCalendar();
  }

  async nextMonth() {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      1
    );
    this.buildCalendar();
  }

  async selectDay(day: number | null) {
    if (!day) return;
    this.selectedDate = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth(),
      day
    );
    await this.loadTransactionsForDate(this.selectedDate);
  }

  isSelectedDay(day: number | null): boolean {
    if (!day) return false;
    return (
      this.selectedDate.getDate() === day &&
      this.selectedDate.getMonth() === this.currentMonth.getMonth() &&
      this.selectedDate.getFullYear() === this.currentMonth.getFullYear()
    );
  }

  isToday(day: number | null): boolean {
    if (!day) return false;
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === this.currentMonth.getMonth() &&
      today.getFullYear() === this.currentMonth.getFullYear()
    );
  }

  private async loadTransactionsForDate(date: Date) {
    if (!this.selectedCard) return;
    const user = this.auth.getCurrentUser();
    if (!user?.uid) return;

    const all = await this.paymentService.loadTransactionsByDefaultCard(user.uid, this.selectedCard.id);
    this.transactions = all.filter(tx => {
      const txDate = tx.date instanceof Date ? tx.date : (tx.date as any).toDate();
      return (
        txDate.getDate() === date.getDate() &&
        txDate.getMonth() === date.getMonth() &&
        txDate.getFullYear() === date.getFullYear()
      );
    });
  }

  private async loadMonthlyTotal() {
    if (!this.selectedCard) return;
    const user = this.auth.getCurrentUser();
    if (!user?.uid) return;

    const all = await this.paymentService.loadTransactionsByDefaultCard(user.uid, this.selectedCard.id);
    this.totalSpend = all
      .filter(tx => tx.status === 'approved')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }

  dayHasTransaction(day: number | null): boolean {
  if (!day || !this.transactions.length) return false;
  return this.transactions.some(tx => {
    const txDate = tx.date instanceof Date ? tx.date : (tx.date as any).toDate();
    return (
      txDate.getDate() === day &&
      txDate.getMonth() === this.currentMonth.getMonth() &&
      txDate.getFullYear() === this.currentMonth.getFullYear()
    );
  });
}

  get spendPercent(): number {
    return Math.min((this.totalSpend / this.monthlyLimit) * 100, 100);
  }

  get currentMonthLabel(): string {
    return this.currentMonth.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  }

async openChangeCard() {
  const buttons: any[] = this.allCards.map(card => ({
    text: `${card.brand} •••• ${card.cardNumber.slice(-4)} ${card.isDefault ? '✓' : ''}`,
    handler: async () => {
      this.selectedCard = card;
      await this.loadTransactionsForDate(this.selectedDate);
      await this.loadMonthlyTotal();
    }
  }));

  buttons.push({ text: 'Cancelar', role: 'cancel' });

  const sheet = await this.actionSheetCtrl.create({
    header: 'Selecciona una tarjeta',
    buttons
  });
  await sheet.present();
}

  close() {
    this.modalCtrl.dismiss();
  }

  getCardClass(brand: string): string {
  if (brand === 'Visa') return 'acf-visa';
  if (brand === 'Mastercard') return 'acf-mc';
  return 'acf-unknown';
}

getTxIcon(tx: any): string {
  const m = (tx.merchant || '').toLowerCase();
  if (m.includes('mc') || m.includes('burger') || m.includes('pizza') || m.includes('food')) return 'fast-food-outline';
  if (m.includes('zara') || m.includes('shop') || m.includes('store')) return 'bag-outline';
  if (m.includes('amazon') || m.includes('apple') || m.includes('tech')) return 'laptop-outline';
  return 'storefront-outline';
}

getTxIconClass(tx: any): string {
  const icon = this.getTxIcon(tx);
  if (icon === 'fast-food-outline') return 'food';
  if (icon === 'bag-outline') return 'shop';
  if (icon === 'laptop-outline') return 'tech';
  return 'other';
}

get selectedDayLabel(): string {
  if (!this.selectedDate) return '';
  return this.selectedDate.toLocaleDateString('es-CO', { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short' 
  });
}
}
