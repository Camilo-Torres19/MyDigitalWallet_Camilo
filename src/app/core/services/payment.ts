import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, query, where, getDocs, orderBy, limit } from '@angular/fire/firestore';
import { BehaviorSubject, map } from 'rxjs';

export interface Transaction {
  id?: string;
  cardId: string;
  uid: string;
  merchant: string;
  merchantCategory: string;
  amount: number;
  currency: string;
  date: Date;
  status: 'approved' | 'declined';
  emoji?: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  transactions$ = new BehaviorSubject<Transaction[]>([]);

  // ── Caché en memoria ──────────────────────────────────────────────────────
  private cachedCardId: string | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL_MS = 60 * 1000; // 1 minuto

  constructor(private firestore: Firestore) {}

  // ── Guardar transacción ───────────────────────────────────────────────────
  async processPayment(transaction: Omit<Transaction, 'id'>): Promise<string> {
    const ref = await addDoc(collection(this.firestore, 'transactions'), {
      ...transaction,
      date: new Date(),
    });
    // Agregar al caché local sin recargar
    const newTx: Transaction = { id: ref.id, ...transaction, date: new Date() };
    const current = this.transactions$.value;
    this.transactions$.next([newTx, ...current].slice(0, 3));
    this.cacheTimestamp = Date.now();
    return ref.id;
  }

  // ── Cargar transacciones con caché ────────────────────────────────────────
  async loadTransactionsByDefaultCard(uid: string, defaultCardId: string, forceRefresh = false): Promise<Transaction[]> {
    const now = Date.now();
    const cacheValid = this.cachedCardId === defaultCardId &&
                       (now - this.cacheTimestamp) < this.CACHE_TTL_MS &&
                       this.transactions$.value.length > 0;

    if (cacheValid && !forceRefresh) {
      return this.transactions$.value;
    }

    const q = query(
      collection(this.firestore, 'transactions'),
      where('uid', '==', uid),
      where('cardId', '==', defaultCardId),
      orderBy('date', 'desc'),
      limit(3)
    );
    const snap = await getDocs(q);
    const txs = snap.docs.map(d => {
      const data = d.data() as any;
      return {
        id: d.id, ...data,
        date: (data.date as any)?.toDate?.() ?? new Date()
      } as Transaction;
    });

    this.transactions$.next(txs);
    this.cachedCardId = defaultCardId;
    this.cacheTimestamp = now;
    return txs;
  }

  invalidateCache() {
    this.cacheTimestamp = 0;
    this.cachedCardId = null;
  }

  async loadTransactionsByUser(uid: string): Promise<Transaction[]> {
    const q = query(
      collection(this.firestore, 'transactions'),
      where('uid', '==', uid),
      orderBy('date', 'desc')
    );
    const snap = await getDocs(q);
    const transactions = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Transaction[];
    this.transactions$.next(transactions);
    return transactions;
  }

  getDefaultCardTransactions(uid: string, defaultCardId: string) {
    return this.transactions$.pipe(
      map(txs => txs.filter(tx => tx.cardId === defaultCardId))
    );
  }
}
