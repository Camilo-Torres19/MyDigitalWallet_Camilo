import { Injectable } from '@angular/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Firestore, doc, setDoc, getDoc } from '@angular/fire/firestore';

const BACKEND_URL = 'https://sendnotificationfirebase-production.up.railway.app';
const BACKEND_EMAIL = 'camilo.torresospino@unicolombo.edu.co';
const BACKEND_PASSWORD = 'Camilo123456';

@Injectable({ providedIn: 'root' })
export class NotificationService {

  private jwtToken: string | null = null;
  private jwtExpires: number = 0;
  private fcmToken: string | null = null;

  constructor(private firestore: Firestore) {}

  // ─── 1. Inicializar permisos y obtener FCM token ───────────────────────────
  async init(uid: string) {
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') {
      console.warn('Permiso de notificaciones denegado');
      return;
    }

    await PushNotifications.register();

    PushNotifications.addListener('registration', async (token: Token) => {
      this.fcmToken = token.value;
      await this.saveFcmToken(uid, token.value);
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('Error al registrar notificaciones:', err);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Notificación recibida:', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('Acción de notificación:', action);
    });
  }

  // ─── 2. Guardar FCM token en Firestore ────────────────────────────────────
  private async saveFcmToken(uid: string, token: string) {
    const ref = doc(this.firestore, `users/${uid}`);
    await setDoc(ref, { fcmToken: token }, { merge: true });
  }

  // ─── 3. Obtener FCM token del usuario desde Firestore ─────────────────────
  async getFcmTokenFromFirestore(uid: string): Promise<string | null> {
    const ref = doc(this.firestore, `users/${uid}`);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data()?.['fcmToken'] ?? null : null;
  }

  // ─── 4. Login al backend para obtener JWT (con control de expiración) ──────
  private async getJwtToken(): Promise<string> {
    if (this.jwtToken && Date.now() < this.jwtExpires) return this.jwtToken;

    const res = await fetch(`${BACKEND_URL}/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: BACKEND_EMAIL,
        password: BACKEND_PASSWORD
      })
    });

    const data = await res.json();
    this.jwtToken = data.token ?? data.access_token;
    this.jwtExpires = Date.now() + 55 * 60 * 1000; // 55 minutos
    return this.jwtToken!;
  }

  // ─── 5. Enviar notificación push ──────────────────────────────────────────
  async sendPushNotification(fcmToken: string, title: string, body: string, data?: Record<string, string>) {
    try {
      const jwt = await this.getJwtToken();

      const payload = {
        token: fcmToken,
        notification: { title, body },
        android: {
          priority: 'high',
          data: data ?? {}
        }
      };

      const res = await fetch(`${BACKEND_URL}/notifications/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': jwt
        },
        body: JSON.stringify(payload)
      });

      await res.json();

    } catch (error) {
      console.error('Error enviando notificación:', error);
    }
  }

  // ─── 6. Notificación de pago exitoso + haptic ─────────────────────────────
  async notifyPaymentSuccess(uid: string, merchant: string, amount: number) {
    await Haptics.impact({ style: ImpactStyle.Medium });

    const fcmToken = await this.getFcmTokenFromFirestore(uid);
    if (!fcmToken) {
      console.warn('No FCM token found para uid:', uid);
      return;
    }

    const formattedAmount = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(amount);

    await this.sendPushNotification(
      fcmToken,
      '✅ Pago Exitoso',
      `Has realizado un pago de ${formattedAmount} en ${merchant}`,
      { type: 'payment', merchant, amount: String(amount) }
    );
  }

  // ─── 7. Haptic simple para confirmaciones ─────────────────────────────────
  async hapticConfirm() {
    await Haptics.impact({ style: ImpactStyle.Light });
  }

  async hapticError() {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  }
}
