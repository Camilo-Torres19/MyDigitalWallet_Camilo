import { Injectable, inject } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
} from '@angular/fire/auth';
import { Firestore, doc, setDoc, docData, getDoc } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { CardService } from './card.service';
import { SocialLogin } from '@capgo/capacitor-social-login';


@Injectable({ providedIn: 'root' })
export class AuthService {
  user: any = null;
  userProfile$ = new BehaviorSubject<any>(null);

  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);
  // ✅ Sin CardService aquí

constructor() {
  this.auth.onAuthStateChanged(async (user) => {
    this.user = user;
    if (user) {
      const ref = doc(this.firestore, `users/${user.uid}`);
      docData(ref).subscribe((profile) => {
        // ✅ asegura que el uid siempre esté en el perfil
        this.userProfile$.next({ ...profile, uid: user.uid });
      });
      this.router.navigate(['/home']);
    } else {
      this.userProfile$.next(null);
      this.router.navigate(['/login']);
    }
  });
}

  async register(email: string, password: string, userData: any) {
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);
    const uid = credential.user.uid;
    await setDoc(doc(this.firestore, `users/${uid}`), {
      uid, email,
      name: userData.name,
      lastName: userData.lastName,
      documentType: userData.documentType,
      documentNumber: userData.documentNumber,
      country: userData.country,
      createdAt: new Date(),
    });
    return credential;
  }

  async login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

async loginWithGoogle() {
  try {
  const result = await SocialLogin.login({
    provider: 'google',
    options: {}, // ← quita los scopes completamente
  });

  const idToken = (result as any)?.result?.idToken;

  if (!idToken) {
    throw new Error('No se obtuvo idToken de Google');
  }

  const credential = GoogleAuthProvider.credential(idToken);
  const userCredential = await signInWithCredential(this.auth, credential);
  const user = userCredential.user;

  if (user) {
    const ref = doc(this.firestore, `users/${user.uid}`);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        email: user.email,
        name: user.displayName || '',
        createdAt: new Date(),
      });
    }
  }
  return user;
    } catch (error: any) {
    alert('ERROR: ' + (error?.message || JSON.stringify(error)));
    throw error;
  }
}

  async logout() {
    await signOut(this.auth);
    this.user = null;
    return true;
  }

  getCurrentUser() {
    return this.auth.currentUser;
  }
}