import { Injectable } from '@angular/core';
import { doc, docData, Firestore, setDoc } from '@angular/fire/firestore';
import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserService {
  private userProfile$ = new BehaviorSubject<any>(null);

  constructor(private firestore: Firestore, private auth: Auth) {

    onAuthStateChanged(this.auth, (user: User | null) => {
      if (user) {
        this.listenUserProfile(user.uid);
      } else {
        this.userProfile$.next(null); 
      }
    });
  }

  getUserProfile$(): Observable<any> {
    return this.userProfile$.asObservable();
  }

  private listenUserProfile(uid: string) {
    const ref = doc(this.firestore, `users/${uid}`);
    docData(ref).subscribe(profile => {
      this.userProfile$.next(profile);
    });
  }

  
  updateUserProfile(uid: string, data: any) {
    const ref = doc(this.firestore, `users/${uid}`);
    return setDoc(ref, data, { merge: true });
  }
}
