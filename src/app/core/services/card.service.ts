import { Injectable } from '@angular/core';
import { Firestore, doc, setDoc, collection, query, where, getDocs, deleteDoc, updateDoc, getDoc } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth';
import { ToastController } from '@ionic/angular';

@Injectable({ providedIn: 'root' })
export class CardService {
  cards$ = new BehaviorSubject<any[]>([]);

  constructor(private firestore: Firestore, private authService: AuthService, private toastCtrl: ToastController) {}

  async saveCard(card: any, uid: string) {
    const brand = this.detectBrand(card.cardNumber);
    const q = query(collection(this.firestore, 'cards'), where('uid', '==', uid));
    const snap = await getDocs(q);
    const isDefault = snap.empty;
    const newCard = { ...card, brand, uid, createdAt: new Date(), isDefault };
    const cardId = `${uid}_${Date.now()}`;
    await setDoc(doc(this.firestore, `cards/${cardId}`), newCard);
    await this.loadCardsByUser(uid);
    return cardId;
  }

  async loadCardsByUser(uid: string): Promise<any[]> {
    const q = query(collection(this.firestore, 'cards'), where('uid', '==', uid));
    const snap = await getDocs(q);
    const cards = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    this.cards$.next(cards);
    return cards;
  }

  clearCards() {
    this.cards$.next([]);
  }

  private detectBrand(cardNumber: string): string {
    const num = cardNumber.replace(/\s+/g, '');
    if (/^4/.test(num)) return 'Visa';
    if (/^5[1-5]/.test(num) || /^2/.test(num)) return 'Mastercard';
    return 'Unknown';
  }

  async deleteCard(cardId: string, uid: string) {
    await deleteDoc(doc(this.firestore, `cards/${cardId}`));
    await this.loadCardsByUser(uid);
  }

  async updateCard(cardId: string, uid: string, data: any) {
    const ref = doc(this.firestore, `cards/${cardId}`);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      console.error('Documento no existe:', cardId);
      return;
    }
    const updateData: any = {};
    if (data.brand !== undefined) updateData.brand = data.brand;
    if (data.cardNumber !== undefined) updateData.cardNumber = data.cardNumber;
    if (data.expiryDate !== undefined) updateData.expiryDate = data.expiryDate;
    if (data.cardholderName !== undefined) updateData.cardholderName = data.cardholderName;
    await updateDoc(ref, updateData);
    // Una sola llamada para recargar y loggear (corregido: era doble)
    const cards = await this.loadCardsByUser(uid);
    console.log('Tarjetas recargadas:', cards);
  }

  async setDefaultCard(cardId: string, uid: string) {
    const q = query(collection(this.firestore, 'cards'), where('uid', '==', uid));
    const snap = await getDocs(q);

    for (const d of snap.docs) {
      if (d.id === cardId) {
        await updateDoc(d.ref, { isDefault: true });
      } else {
        await updateDoc(d.ref, { isDefault: false });
      }
    }

    const cards = await this.loadCardsByUser(uid);
    const defaultCard = cards.find(c => c.isDefault === true);
    console.log('✅ Tarjeta predeterminada:', defaultCard);
  }

  async changeCard(card: any) {
    const user = await this.authService.getCurrentUser();
    if (user?.uid) {
      await this.setDefaultCard(card.id, user.uid);
      const toast = await this.toastCtrl.create({
        message: 'Tarjeta establecida como predeterminada',
        duration: 2000,
        color: 'success'
      });
      await toast.present();
    }
  }
}
