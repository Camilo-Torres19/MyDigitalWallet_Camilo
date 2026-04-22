import { Injectable } from '@angular/core';
import { Firestore, doc, setDoc, collection, query, where, getDocs, deleteDoc, updateDoc, getDoc } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth';
import { ToastController } from '@ionic/angular';

@Injectable({ providedIn: 'root' })
export class CardService {
  cards$ = new BehaviorSubject<any[]>([]);

  // ── Caché en memoria ──────────────────────────────────────────────────────
  private cachedUid: string | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL_MS = 60 * 1000; // 1 minuto

  constructor(
    private firestore: Firestore,
    private authService: AuthService,
    private toastCtrl: ToastController
  ) {}

  // ── Guardar tarjeta ───────────────────────────────────────────────────────
  async saveCard(card: any, uid: string) {
    const brand = this.detectBrand(card.cardNumber);
    const existingCards = this.cards$.value;
    const isDefault = existingCards.length === 0;
    const newCard = { ...card, brand, uid, createdAt: new Date(), isDefault };
    const cardId = `${uid}_${Date.now()}`;
    await setDoc(doc(this.firestore, `cards/${cardId}`), newCard);
    // Actualizar caché local sin ir a Firestore
    const updated = [...existingCards, { id: cardId, ...newCard }];
    this.cards$.next(updated);
    this.cacheTimestamp = Date.now();
    return cardId;
  }

  // ── Cargar tarjetas con caché ─────────────────────────────────────────────
  async loadCardsByUser(uid: string, forceRefresh = false): Promise<any[]> {
    const now = Date.now();
    const cacheValid = this.cachedUid === uid &&
                       (now - this.cacheTimestamp) < this.CACHE_TTL_MS &&
                       this.cards$.value.length > 0;

    // Devolver caché si es válida y no se fuerza recarga
    if (cacheValid && !forceRefresh) {
      return this.cards$.value;
    }

    // Ir a Firestore solo cuando es necesario
    const q = query(collection(this.firestore, 'cards'), where('uid', '==', uid));
    const snap = await getDocs(q);
    const cards = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    this.cards$.next(cards);
    this.cachedUid = uid;
    this.cacheTimestamp = now;
    return cards;
  }

  // ── Invalidar caché (llamar cuando hay cambios reales) ────────────────────
  invalidateCache() {
    this.cacheTimestamp = 0;
    this.cachedUid = null;
  }

  clearCards() {
    this.cards$.next([]);
    this.invalidateCache();
  }

  // ── Eliminar tarjeta ──────────────────────────────────────────────────────
  async deleteCard(cardId: string, uid: string) {
    await deleteDoc(doc(this.firestore, `cards/${cardId}`));
    // Actualizar caché local sin ir a Firestore
    const updated = this.cards$.value.filter(c => c.id !== cardId);
    this.cards$.next(updated);
    this.cacheTimestamp = Date.now();
  }

  // ── Actualizar tarjeta ────────────────────────────────────────────────────
  async updateCard(cardId: string, uid: string, data: any) {
    const ref = doc(this.firestore, `cards/${cardId}`);
    const snap = await getDoc(ref);
    if (!snap.exists()) { console.error('Documento no existe:', cardId); return; }

    const updateData: any = {};
    if (data.brand !== undefined) updateData.brand = data.brand;
    if (data.cardNumber !== undefined) updateData.cardNumber = data.cardNumber;
    if (data.expiryDate !== undefined) updateData.expiryDate = data.expiryDate;
    if (data.cardholderName !== undefined) updateData.cardholderName = data.cardholderName;

    await updateDoc(ref, updateData);
    // Actualizar caché local
    const updated = this.cards$.value.map(c =>
      c.id === cardId ? { ...c, ...updateData } : c
    );
    this.cards$.next(updated);
    this.cacheTimestamp = Date.now();
  }

  // ── Establecer tarjeta predeterminada ─────────────────────────────────────
  async setDefaultCard(cardId: string, uid: string) {
    const cards = this.cards$.value;
    // Batch de escrituras — solo actualiza las que cambian
    for (const c of cards) {
      const shouldBeDefault = c.id === cardId;
      if (c.isDefault !== shouldBeDefault) {
        await updateDoc(doc(this.firestore, `cards/${c.id}`), { isDefault: shouldBeDefault });
      }
    }
    // Actualizar caché local
    const updated = cards.map(c => ({ ...c, isDefault: c.id === cardId }));
    this.cards$.next(updated);
    this.cacheTimestamp = Date.now();
  }

  async changeCard(card: any) {
    const user = await this.authService.getCurrentUser();
    if (user?.uid) {
      await this.setDefaultCard(card.id, user.uid);
      const toast = await this.toastCtrl.create({
        message: 'Tarjeta establecida como predeterminada',
        duration: 2000, color: 'success'
      });
      await toast.present();
    }
  }

  // ── Utilidades ────────────────────────────────────────────────────────────
  private detectBrand(cardNumber: string): string {
    const num = cardNumber.replace(/\s+/g, '');
    if (/^4/.test(num)) return 'Visa';
    if (/^5[1-5]/.test(num) || /^2/.test(num)) return 'Mastercard';
    return 'Unknown';
  }
}
