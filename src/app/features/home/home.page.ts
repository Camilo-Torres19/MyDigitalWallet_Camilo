import { Component, ViewChild, ElementRef } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { AuthService } from 'src/app/core/services/auth';
import { CardService } from 'src/app/core/services/card.service';
import { EditCardModalComponent } from 'src/app/shared/components/edit-card/edit-card.component';
import { AddCardModalComponent } from 'src/app/shared/components/add-card/add-card.component';
import { UserService } from 'src/app/core/services/user';
import { take } from 'rxjs/operators';
import { BiometricService } from 'src/app/core/services/biometric.service';
import { CardCarouselModalComponent } from 'src/app/shared/components/carouselcard/carouselcard.component';
import { PaymentModalComponent } from 'src/app/shared/components/payment-simulator/payment-simulator.component';
import { PaymentService, Transaction } from 'src/app/core/services/payment';
import { Observable, of } from 'rxjs';
import { TotalExpensesModalComponent } from 'src/app/shared/components/total-expenses-modal/total-expenses/total-expenses.component';
import { NotificationService } from 'src/app/core/services/notification';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {
  isProfileModalOpen = false;
  userProfile$ = this.auth.userProfile$;
  cards$ = this.cardService.cards$;
  userPs$ = this.userService.getUserProfile$();

  editableProfile: any = {
    uid: 'USER_UID',
    firstName: '',
    lastName: '',
    biometrics: false,
    email: ''
  };

  userPassword: string = '';
  defaultCardTransactions$: Observable<Transaction[]> = of([]);
  activeCard: any = null;

  @ViewChild('cardsScroll') cardsScrollRef!: ElementRef;
  @ViewChild('dotsContainer') dotsContainer!: ElementRef;

  constructor(
    public auth: AuthService,
    public cardService: CardService,
    private modalCtrl: ModalController,
    private userService: UserService,
    private alertCtrl: AlertController,
    private biometricService: BiometricService,
    private paymentService: PaymentService,
    private notificationService: NotificationService
  ) {}

  async ionViewWillEnter() {
    await this.loadTransactions();
  }

  ionViewDidEnter() {
    this.buildDots();
  }

  private async loadTransactions() {
    const user = this.auth.getCurrentUser();
    if (!user?.uid) return;

    const cards = await this.cardService.loadCardsByUser(user.uid);
    this.activeCard = cards?.find((c: any) => c.isDefault) || cards[0];

    if (this.activeCard) {
      await this.paymentService.loadTransactionsByDefaultCard(
        user.uid,
        this.activeCard.id
      );
      this.defaultCardTransactions$ = this.paymentService.transactions$;
    } else {
      this.defaultCardTransactions$ = of([]);
    }

    // Rebuild dots after cards reload
    setTimeout(() => this.buildDots(), 100);
  }

  buildDots() {
    const cards = (this.cardService.cards$.value || []).length;
    const container = this.dotsContainer?.nativeElement;
    if (!container || !cards) return;
    container.innerHTML = '';
    for (let i = 0; i < cards; i++) {
      const d = document.createElement('div');
      d.className = 'dot' + (i === 0 ? ' active' : '');
      container.appendChild(d);
    }
  }

  onCardsScroll() {
    const el = this.cardsScrollRef?.nativeElement;
    const container = this.dotsContainer?.nativeElement;
    if (!el || !container) return;
    const idx = Math.round(el.scrollLeft / 282);
    container.querySelectorAll('.dot').forEach((d: Element, i: number) => {
      d.classList.toggle('active', i === idx);
    });
  }

  openProfileModal() {
    this.isProfileModalOpen = true;
    this.userPs$.pipe(take(1)).subscribe(profile => {
      if (profile) {
        this.editableProfile = { ...profile };
      }
    });
  }

  closeProfileModal() {
    this.isProfileModalOpen = false;
  }

  async openAddCardModal() {
    const modal = await this.modalCtrl.create({
      component: AddCardModalComponent
    });
    await modal.present();

    const { data, role } = await modal.onWillDismiss();
    if (role === 'confirm' && data?.saved) {
      await this.loadTransactions();
    }
  }

  async updateCard(card: any) {
    const modal = await this.modalCtrl.create({
      component: EditCardModalComponent,
      componentProps: { card }
    });
    await modal.present();

    const { data, role } = await modal.onWillDismiss();
    if (role === 'confirm' && data) {
      const uid = this.auth.getCurrentUser()?.uid;
      if (uid && data.id) {
        await this.cardService.updateCard(data.id, uid, data);
        await this.loadTransactions();
      }
    }
  }

  async deleteCard(card: any) {
    const alert = await this.alertCtrl.create({
      header: 'Confirmar eliminación',
      message: `¿Seguro que quieres eliminar la tarjeta terminada en ${card.cardNumber.slice(-4)}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            const uid = this.auth.getCurrentUser()?.uid;
            if (uid) {
              await this.cardService.deleteCard(card.id, uid);
              await this.loadTransactions();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async saveProfile() {
    const uid = this.auth.getCurrentUser()?.uid;
    if (uid) {
      await this.userService.updateUserProfile(uid, this.editableProfile);
      this.closeProfileModal();
    }
  }

  async toggleBiometric() {
    if (this.editableProfile.biometrics) {
      const available = await this.biometricService.isAvailable();
      if (!available) {
        const alert = await this.alertCtrl.create({
          header: 'No compatible',
          message: 'Tu dispositivo no soporta autenticación biométrica.',
          buttons: ['OK']
        });
        await alert.present();
        this.editableProfile.biometrics = false;
        return;
      }

      const alert = await this.alertCtrl.create({
        header: 'Activar Biometría',
        message: 'Introduce tu contraseña para vincular tu huella/FaceID',
        inputs: [{ name: 'password', type: 'password', placeholder: 'Contraseña' }],
        buttons: [
          { text: 'Cancelar', role: 'cancel',
            handler: () => { this.editableProfile.biometrics = false; }
          },
          { text: 'Confirmar', role: 'confirm' }
        ]
      });
      await alert.present();

      // Esperar el resultado del alert correctamente
      const { data, role } = await alert.onDidDismiss();
      if (role !== 'confirm') {
        this.editableProfile.biometrics = false;
        return;
      }

      const password = data?.values?.password;
      if (!password) {
        this.editableProfile.biometrics = false;
        return;
      }

      // Verificar huella primero
      const verified = await this.biometricService.verifyIdentity();
      if (verified) {
        await this.biometricService.enrollBiometric(
          this.editableProfile.uid,
          this.editableProfile.email,
          password
        );
        // Guardar en Firestore inmediatamente
        const uid = this.auth.getCurrentUser()?.uid;
        if (uid) {
          await this.userService.updateUserProfile(uid, { biometrics: true });
        }
      } else {
        this.editableProfile.biometrics = false;
      }
    } else {
      await this.biometricService.disableBiometric(this.editableProfile.uid);
      const uid = this.auth.getCurrentUser()?.uid;
      if (uid) {
        await this.userService.updateUserProfile(uid, { biometrics: false });
      }
    }
  }

  async openCardCarousel() {
    const user = this.auth.getCurrentUser();
    if (user?.uid) {
      const cards = await this.cardService.loadCardsByUser(user.uid);
      const modal = await this.modalCtrl.create({
        component: CardCarouselModalComponent,
        componentProps: { cards }
      });
      await modal.present();
      await modal.onWillDismiss();
      await this.loadTransactions();
    }
  }

  async openPaymentModal() {
    const defaultCard = this.cardService.cards$.value.find(c => c.isDefault);
    const modal = await this.modalCtrl.create({
      component: PaymentModalComponent,
      componentProps: { selectedCardId: defaultCard?.id }
    });
    await modal.present();

    const { data, role } = await modal.onWillDismiss();
    if (role === 'confirm' && data) {
      await this.loadTransactions();
    }
  }

  async openTotalExpenses() {
    const modal = await this.modalCtrl.create({
      component: TotalExpensesModalComponent
    });
    await modal.present();
    await modal.onWillDismiss();
    await this.loadTransactions();
  }

  async testNotification() {
    const user = this.auth.getCurrentUser();
    if (user?.uid) {
      await this.notificationService.notifyPaymentSuccess(
        user.uid,
        'Tienda Test',
        50000
      );
      console.log('Notificación enviada');
    }
  }
}