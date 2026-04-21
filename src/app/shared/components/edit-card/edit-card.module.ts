import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { EditCardModalComponent } from './edit-card.component';

@NgModule({
  declarations: [EditCardModalComponent],
  imports: [
    CommonModule,
    FormsModule,   
    IonicModule     
  ],
  exports: [EditCardModalComponent]
})
export class EditCardModule {}
