import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiService } from './api.service';
@Component({selector:'sclf-root',standalone:true,imports:[RouterOutlet],template:'<router-outlet />'})
export class AppComponent { api=inject(ApiService); constructor(){this.api.loadUser()} }
