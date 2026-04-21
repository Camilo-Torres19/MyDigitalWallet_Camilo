import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth-guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadChildren: () =>
      import('./features/login/login.module').then(m => m.LoginPageModule),
  },
  {
    path: 'register',
    loadChildren: () =>
      import('./features/register/register.module').then(m => m.RegisterPageModule),
  },
  {
     path: 'home',
  loadChildren: () => import('./features/home/home.module').then(m => m.HomePageModule),
  },
  {
    path: 'add-card',
    loadChildren: () =>
      import('./shared/components/add-card/add-card.module').then(m => m.AddCardModule),

  },
   {
    path: 'edit-card',
    loadChildren: () =>
      import('./shared/components/edit-card/edit-card.module').then(m => m.EditCardModule),

  },
  {
    path: 'payment',
    loadChildren: () =>
      import('./features/payment/payment.module').then(m => m.PaymentPageModule),
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
