// src/app/shared/components/carouselcard/carouselcard.module.ts
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { CardCarouselModalComponent } from './carouselcard.component';

@NgModule({
  declarations: [CardCarouselModalComponent],
  imports: [
    CommonModule,   // habilita ngIf, ngFor, ngClass
    FormsModule,    // habilita ngModel
    IonicModule     // habilita ion-slide, ion-button, etc.
  ],
  exports: [CardCarouselModalComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CarouselcardModule {
  
}
