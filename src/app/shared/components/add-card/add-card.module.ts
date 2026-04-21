import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { AddCardModalComponent } from './add-card.component';

@NgModule({
  declarations: [AddCardModalComponent],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ],
  exports: [AddCardModalComponent]
})
export class AddCardModule {}
