import { Routes } from '@angular/router';
import { AuthPageComponent } from './auth-page.component';
import { HomeComponent } from './home.component';
export const routes: Routes = [
 {path:'login', component:AuthPageComponent, data:{mode:'login'}},
 {path:'register', component:AuthPageComponent, data:{mode:'register'}},
 {path:'', component:HomeComponent},
 {path:'**', redirectTo:''}
];
