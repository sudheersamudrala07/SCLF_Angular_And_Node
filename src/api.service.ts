import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
export interface User {user_id:number;name:string;email:string;role:'student'|'admin'}
@Injectable({providedIn:'root'})
export class ApiService {
 user=signal<User|null>(null); items=signal<any[]>([]); categories=signal<any[]>([]); claims=signal<any[]>([]); logs=signal<any[]>([]); dbStatus=signal<any>(null);
 constructor(private http:HttpClient){}
 async call<T=any>(url:string, options:any={}):Promise<T>{const result:any=await firstValueFrom(this.http.request(options.method||'GET',url,{body:options.body,params:options.params,withCredentials:true})); if(result?.success===false) throw new Error(result.message||'Request failed'); return result;}
 async loadUser(){try{const r:any=await this.call('/api/auth/me');this.user.set(r.user)}catch{this.user.set(null)}}
 async refresh(params:Record<string,string>={}){const q=new URLSearchParams(params).toString();const [items,cats,db]=await Promise.all([this.call<any>(`/api/items${q?'?'+q:''}`),this.call<any>('/api/categories'),this.call<any>('/api/db-status')]);this.items.set(items.data||[]);this.categories.set(cats.data||[]);this.dbStatus.set(db); if(this.user()?.role==='admin'){const [cl,lg]=await Promise.all([this.call<any>('/api/claims'),this.call<any>('/api/audit-logs')]);this.claims.set(cl.data||[]);this.logs.set(lg.data||[])}else{this.claims.set([]);this.logs.set([])}}
}
