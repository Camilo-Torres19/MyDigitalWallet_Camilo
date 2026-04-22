import { Injectable } from '@angular/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Firestore, doc, setDoc, getDoc } from '@angular/fire/firestore';
import { Capacitor } from '@capacitor/core';

const BACKEND_URL = 'https://sendnotificationfirebase-production.up.railway.app';
const BACKEND_EMAIL = 'camilo.torresospino@unicolombo.edu.co';
const BACKEND_PASSWORD = 'Camilo123456';
const FETCH_TIMEOUT_MS = 10000;

@Injectable({ providedIn: 'root' })
export class NotificationService {

  private jwtToken: string | null = null;
  private jwtExpires: number = 0;
  private fcmToken: string | null = null;

  constructor(private firestore: Firestore) {}

  // ─── 1. Inicializar permisos y obtener FCM token ──────────────────────────
  async init(uid: string) {
    // PushNotifications solo funciona en dispositivo nativo
    if (!Capacitor.isNativePlatform()) {
      console.warn('PushNotifications no disponible en web/emulador sin Google Play');
      return;
    }

    try {
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive !== 'granted') {
        console.warn('Permiso de notificaciones denegado');
        return;
      }

      await PushNotifications.register();

      PushNotifications.addListener('registration', async (token: Token) => {
        this.fcmToken = token.value;
        console.log('FCM Token registrado:', token.value.slice(0, 20) + '...');
        await this.saveFcmToken(uid, token.value);
      });

      PushNotifications.addListener('registrationError', (err) => {
        console.warn('Error registrando FCM (puede ser normal en emulador):', err);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('Notificación recibida en primer plano:', notification.title);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        console.log('Acción de notificación:', action.actionId);
      });
    } catch (err) {
      console.warn('Error inicializando notificaciones:', err);
    }
  }

  // ─── 2. Guardar FCM token en Firestore ───────────────────────────────────
  private async saveFcmToken(uid: string, token: string) {
    try {
      const ref = doc(this.firestore, `users/${uid}`);
      await setDoc(ref, { fcmToken: token }, { merge: true });
      console.log('FCM token guardado en Firestore ✅');
    } catch (err) {
      console.warn('Error guardando FCM token:', err);
    }
  }

  // ─── 3. Obtener FCM token del usuario desde Firestore ────────────────────
  async getFcmTokenFromFirestore(uid: string): Promise<string | null> {
    try {
      const ref = doc(this.firestore, `users/${uid}`);
      const snap = await getDoc(ref);
      return snap.exists() ? snap.data()?.['fcmToken'] ?? null : null;
    } catch (err) {
      console.warn('Error obteniendo FCM token de Firestore:', err);
      return null;
    }
  }

  // ─── 4. Login al backend con timeout ─────────────────────────────────────
  private fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    return fetch(url, { ...options, signal: controller.signal })
      .finally(() => clearTimeout(timer));
  }

  private async getJwtToken(): Promise<string> {
    if (this.jwtToken && Date.now() < this.jwtExpires) return this.jwtToken;

    const res = await this.fetchWithTimeout(`${BACKEND_URL}/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: BACKEND_EMAIL, password: BACKEND_PASSWORD })
    });

    const data = await res.json();
    this.jwtToken = data.token ?? data.access_token;
    this.jwtExpires = Date.now() + 55 * 60 * 1000;
    return this.jwtToken!;
  }

  // ─── 5. Enviar notificación push ─────────────────────────────────────────
  async sendPushNotification(fcmToken: string, title: string, body: string, data?: Record<string, string>) {
    try {
      const jwt = await this.getJwtToken();
      const payload = {
        token: fcmToken,
        notification: { title, body },
        android: { priority: 'high', data: data ?? {} }
      };
      const res = await this.fetchWithTimeout(`${BACKEND_URL}/notifications/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': jwt },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      console.log('Notificación enviada ✅', result);
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        console.warn('Timeout enviando notificación al backend');
      } else {
        console.error('Error enviando notificación:', error);
      }
    }
  }

  // ─── 6. Notificación de pago exitoso ─────────────────────────────────────
  async notifyPaymentSuccess(uid: string, merchant: string, amount: number) {
    // Haptic primero pero sin bloquear si falla en emulador
    try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch (_) {}

    const fcmToken = await this.getFcmTokenFromFirestore(uid);
    if (!fcmToken) {
      console.warn('No FCM token para uid:', uid);
      return;
    }

    const formattedAmount = new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0
    }).format(amount);

    await this.sendPushNotification(
      fcmToken,
      '✅ Pago Exitoso',
      `Pago de ${formattedAmount} en ${merchant} aprobado`,
      { type: 'payment', merchant, amount: String(amount) }
    );
  }

  // ─── 7. Haptics ──────────────────────────────────────────────────────────
  async hapticConfirm() {
    try { await Haptics.impact({ style: ImpactStyle.Light }); } catch (_) {}
  }

  async hapticError() {
    try { await Haptics.impact({ style: ImpactStyle.Heavy }); } catch (_) {}
  }
}
