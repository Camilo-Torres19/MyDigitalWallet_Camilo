import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AddCardModalComponent } from './add-card.component';

const routes: Routes = [
  {
    path: '',
    component: AddCardModalComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AddCardPageRoutingModule {}
