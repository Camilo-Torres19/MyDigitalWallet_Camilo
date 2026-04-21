import { Component, Input, ElementRef, ViewChild, AfterViewInit, NgZone } from '@angular/core';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { CardService } from 'src/app/core/services/card.service';
import { AuthService } from 'src/app/core/services/auth';

@Component({
  selector: 'app-card-carousel-modal',
  templateUrl: './carouselcard.component.html',
  styleUrls: ['./carouselcard.component.scss'],
  standalone: false,
})
export class CardCarouselModalComponent implements AfterViewInit {
  @Input() cards: any[] = [];
  @ViewChild('swiperRef') swiperRef!: ElementRef;

  currentIndex = 0;
  activeIndex = 0;

  constructor(
    private modalCtrl: ModalController,
    private cardService: CardService,
    private authService: AuthService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private zone: NgZone
  ) {}

  ngAfterViewInit() {
    setTimeout(() => {
      this.initSwiper();
    }, 300);
  }

  initSwiper() {
    const swiperEl = this.swiperRef?.nativeElement;
    if (!swiperEl) return;

    Object.assign(swiperEl, {
      slidesPerView: 1,
      centeredSlides: true,
      pagination: { clickable: true },
      spaceBetween: 20,
      on: {
        slideChange: (swiper: any) => {
          this.zone.run(() => {
            this.currentIndex = swiper.activeIndex;
            this.activeIndex = swiper.activeIndex; // ← sincroniza los dots
          });
        }
      }
    });

    // ← el addEventListener va AQUÍ, dentro del método, después de Object.assign
    swiperEl.addEventListener('swiperslidechange', (e: any) => {
      this.zone.run(() => {
        this.activeIndex = e.detail[0].activeIndex;
      });
    });

    swiperEl.initialize();
  }

  async confirmSetDefault() {
    const card = this.cards[this.currentIndex];
    if (!card) return;

    const brand = this.detectBrand(card.cardNumber);
    const last4 = card.cardNumber.slice(-4);

    const alert = await this.alertCtrl.create({
      header: 'Confirmar tarjeta',
      message: `¿Establecer la tarjeta ${brand} **** ${last4} como predeterminada para pagos?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Confirmar', handler: () => this.setDefault(card) }
      ]
    });
    await alert.present();
  }

  async setDefault(card: any) {
    const user = await this.authService.getCurrentUser();
    if (user?.uid) {
      await this.cardService.setDefaultCard(card.id, user.uid);
      const toast = await this.toastCtrl.create({
        message: `Tarjeta ${this.detectBrand(card.cardNumber)} **** ${card.cardNumber.slice(-4)} establecida como predeterminada`,
        duration: 2500,
        color: 'success',
        position: 'top'
      });
      await toast.present();
      this.modalCtrl.dismiss();
    }
  }

  close() {
    this.modalCtrl.dismiss();
  }

  detectBrand(num: string): string {
    if (!num) return 'Unknown';
    if (num.startsWith('4')) return 'Visa';
    if (num.startsWith('5')) return 'Mastercard';
    return 'Unknown';
  }

  formatCardNumber(num: string): string {
    if (!num) return '**** **** **** ****';
    return num.replace(/\d{4}(?=.)/g, '$& ');
  }
}