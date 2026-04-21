import { Injectable } from '@angular/core';
import { NativeBiometric } from 'capacitor-native-biometric';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore'; // ✅ API modular

@Injectable({
  providedIn: 'root'
})
export class BiometricService {

  constructor(private firestore: Firestore) {} // ✅ reemplaza AngularFirestore

  async isAvailable(): Promise<boolean> {
    const result = await NativeBiometric.isAvailable();
    return result.isAvailable;
  }

  async enrollBiometric(uid: string, username: string, password: string): Promise<void> {
    await NativeBiometric.setCredentials({
      username,
      password,
      server: 'myapp.com'
    });

    // ✅ reemplaza this.afs.collection('users').doc(uid).update()
    await updateDoc(doc(this.firestore, `users/${uid}`), {
      biometrics: true
    });
  }

  async disableBiometric(uid: string): Promise<void> {
    await NativeBiometric.deleteCredentials({ server: 'myapp.com' });

    await updateDoc(doc(this.firestore, `users/${uid}`), {
      biometrics: false
    });
  }

  async getCredentials(): Promise<{ username: string; password: string } | null> {
    try {
      const creds = await NativeBiometric.getCredentials({ server: 'myapp.com' });
      return creds;
    } catch {
      return null;
    }
  }

  async verifyIdentity(): Promise<boolean> {
    try {
      const result: any = await NativeBiometric.verifyIdentity({
        reason: 'Acceso seguro al perfil',
        title: 'Autenticación biométrica'
      });

      if (result && typeof result === 'object' && 'verified' in result) {
        return result.verified === true;
      }
      if (typeof result === 'boolean') {
        return result;
      }
      return false;
    } catch (error) {
      console.error('Biometric verification failed:', error);
      return false;
    }
  }
}