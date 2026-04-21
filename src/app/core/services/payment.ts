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

  constructor(private firestore: Firestore) {}

  async processPayment(transaction: Omit<Transaction, 'id'>): Promise<string> {
    const ref = await addDoc(collection(this.firestore, 'transactions'), {
      ...transaction,
      date: new Date(),
    });
    return ref.id;
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

  async loadTransactionsByCard(cardId: string): Promise<Transaction[]> {
    const q = query(
      collection(this.firestore, 'transactions'),
      where('cardId', '==', cardId),
      orderBy('date', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Transaction[];
  }

  // Corregido: orderBy + limit directo en Firestore, no en memoria
  async loadTransactionsByDefaultCard(uid: string, defaultCardId: string): Promise<Transaction[]> {
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
        id: d.id,
        ...data,
        date: (data.date as any).toDate()
      } as Transaction;
    });

    this.transactions$.next(txs);
    return txs;
  }
}
