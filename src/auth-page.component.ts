import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ApiService } from './api.service';
@Component({selector:'sclf-auth',standalone:true,imports:[CommonModule,FormsModule,RouterLink],template:`
<main class="auth-page"><section class="auth-card"><a routerLink="/" class="auth-brand">SF <span>Smart Campus<br>Lost &amp; Found</span></a><div class="auth-icon">{{register?'✦':'↗'}}</div><p class="eyebrow">CAMPUS PROPERTY RECOVERY</p><h1>{{register?'Create your account':'Welcome back'}}</h1><p class="auth-copy">{{register?'Join the campus community to report items, submit claims and chat privately.':'Sign in to report property, manage your items and continue private conversations.'}}</p>
<form (ngSubmit)="submit()" #f="ngForm"><label *ngIf="register">Full name<input name="name" [(ngModel)]="name" required minlength="2" maxlength="120" autocomplete="name" placeholder="Your name"></label><label>Email address<input name="email" [(ngModel)]="email" required type="email" maxlength="254" autocomplete="email" placeholder="you@campus.edu"></label><label>Password<input name="password" [(ngModel)]="password" required [minlength]="12" maxlength="200" type="password" [autocomplete]="register?'new-password':'current-password'" placeholder="At least 12 characters"></label><button class="primary-button auth-submit" [disabled]="busy||f.invalid">{{busy?'Please wait…':register?'Create student account':'Sign in'}}</button></form><p class="auth-error" *ngIf="message">{{message}}</p><p class="auth-switch">{{register?'Already have an account?':'New to the service?'}} <a [routerLink]="register?'/login':'/register'">{{register?'Sign in':'Create account'}}</a></p><p class="privacy-note">Only your name appears on public reports. Contact details and student ID stay private.</p></section></main>
`})
export class AuthPageComponent implements OnInit {api=inject(ApiService);router=inject(Router); register=false;name='';email='';password='';busy=false;message='';
 ngOnInit(){this.register=location.pathname==='/register'}
 async submit(){this.busy=true;this.message='';try{const r:any=await this.api.call('/api/auth/'+(this.register?'register':'login'),{method:'POST',body:{name:this.name,email:this.email,password:this.password}});this.api.user.set(r.user);await this.router.navigateByUrl('/')}catch(e:any){this.message=e.error?.message||e.message||'Could not sign in.'}finally{this.busy=false}}
}
