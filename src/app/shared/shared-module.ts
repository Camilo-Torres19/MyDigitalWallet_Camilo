import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { TotalExpensesModalComponent } from './components/total-expenses-modal/total-expenses/total-expenses.component';

@NgModule({
  declarations: [
    TotalExpensesModalComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule
  ],
  exports: [
    CommonModule,
    IonicModule,
    FormsModule,
    TotalExpensesModalComponent
  ]
})
export class SharedModule {}