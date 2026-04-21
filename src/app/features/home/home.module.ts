import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { HomePageRoutingModule } from './home-routing.module';

import { HomePage } from './home.page';
import { CarouselcardModule } from 'src/app/shared/components/carouselcard/carouselcard-module';
import { PaymentModalComponent } from 'src/app/shared/components/payment-simulator/payment-simulator.component';
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CarouselcardModule,
    HomePageRoutingModule
  ],
  declarations: [HomePage, PaymentModalComponent]
})
export class HomePageModule {}
