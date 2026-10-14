import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHmac, timingSafeEqual } from 'node:crypto';
import dotenv from 'dotenv';
import * as db from './db.js';
dotenv.config();
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.PORT)||5000;
const secret=process.env.SESSION_SECRET||(process.env.NODE_ENV==='production'?null:'local-development-session-secret');
if(process.env.NODE_ENV==='production'&&(!secret||secret.length<32)) throw new Error('SESSION_SECRET must contain at least 32 characters in production.');
const attempts=new Map(), registrations=new Map();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ico':'image/x-icon','.woff2':'font/woff2'};
function cookie(req){return Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim().split(/=(.*)/s).slice(0,2)).filter(x=>x[0]));}
function makeToken(user){const p=Buffer.from(JSON.stringify({sub:user.user_id,name:user.name,email:user.email,role:user.role,exp:Date.now()+43200000})).toString('base64url');return `${p}.${createHmac('sha256',secret).update(p).digest('base64url')}`;}
function currentUser(req){try{const t=decodeURIComponent(cookie(req).campus_session||'');const [p,s]=t.split('.');if(!p||!s)return null;const expected=createHmac('sha256',secret).update(p).digest();const actual=Buffer.from(s,'base64url');if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;const u=JSON.parse(Buffer.from(p,'base64url').toString());return u.exp>Date.now()?{user_id:u.sub,name:u.name,email:u.email,role:u.role}:null}catch{return null}}
function send(res,status,data,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(data));}
function sessionCookie(token,maxAge=43200){return `campus_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${process.env.NODE_ENV==='production'?'; Secure':''}`;}
async function body(req){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>100000)throw Object.assign(new Error('Request body too large.'),{status:413})}return raw?JSON.parse(raw):{}}
function safeItem(item,user){if(!item)return item;const {contactInfo,admissionNumber,reported_by_user_id,...publicItem}=item;return {...publicItem,isOwner:Boolean(user&&Number(user.user_id)===Number(reported_by_user_id)),chatAvailable:Boolean(reported_by_user_id)}}
function requireUser(user){if(!user)throw Object.assign(new Error('Please sign in to continue.'),{status:401});return user}
function requireAdmin(user){requireUser(user);if(user.role!=='admin')throw Object.assign(new Error('Administrator access is required.'),{status:403});return user}
async function serveStatic(req,res,url){const distCandidates=[path.join(root,'dist','browser'),path.join(root,'dist')];let dist=distCandidates.find(d=>fs.existsSync(path.join(d,'index.html')));if(!dist)return send(res,404,{success:false,message:'Frontend build not found. Run npm run build.'});let target=path.resolve(dist,'.'+decodeURIComponent(url.pathname));const relative=path.relative(path.resolve(dist),target);if(relative.startsWith('..')||path.isAbsolute(relative))return send(res,403,{success:false,message:'Forbidden'});if(fs.existsSync(target)&&fs.statSync(target).isFile()){res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':path.extname(target)==='.html'?'no-cache':'public, max-age=31536000, immutable'});return fs.createReadStream(target).pipe(res)}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});fs.createReadStream(path.join(dist,'index.html')).pipe(res)}
async function handle(req,res){const url=new URL(req.url,'http://localhost');const p=url.pathname;const method=req.method;let data={};try{if(method!=='GET'&&method!=='HEAD')data=await body(req);const user=currentUser(req);
 if(p==='/api/auth/me'&&method==='GET')return send(res,200,{success:true,user});
 if(p==='/api/auth/register'&&method==='POST'){const key=req.socket.remoteAddress||'unknown';const prev=(registrations.get(key)||[]).filter(t=>Date.now()-t<3600000);if(prev.length>=5)throw Object.assign(new Error('Too many account creation attempts. Try again later.'),{status:429});registrations.set(key,[...prev,Date.now()]);try{const account=await db.createUser({...data,role:'student'});return send(res,201,{success:true,user:account},{'Set-Cookie':sessionCookie(makeToken(account))})}catch(e){throw Object.assign(new Error(e.code==='ER_DUP_ENTRY'?'An account with this email already exists.':e.message),{status:400})}}
 if(p==='/api/auth/login'&&method==='POST'){const key=req.socket.remoteAddress||'unknown';const prev=(attempts.get(key)||[]).filter(t=>Date.now()-t<900000);if(prev.length>=10)throw Object.assign(new Error('Too many sign-in attempts. Try again later.'),{status:429});const account=await db.verifyUserPassword(data.email,data.password);if(!account){attempts.set(key,[...prev,Date.now()]);throw Object.assign(new Error('Email or password is incorrect.'),{status:401})}attempts.delete(key);return send(res,200,{success:true,user:account},{'Set-Cookie':sessionCookie(makeToken(account))})}
 if(p==='/api/auth/logout'&&method==='POST')return send(res,200,{success:true},{'Set-Cookie':sessionCookie('',0)});
 if(p==='/api/db-status'&&method==='GET'){const s=await db.getDatabaseStatus();return send(res,200,{success:true,connected:s.connected,mode:s.connected?'Database connected':'Temporary development data'})}
 if(p==='/api/categories'&&method==='GET'){const rows=await db.getAllCategories();return send(res,200,{success:true,count:rows.length,data:rows})}
 if(p==='/api/categories'&&method==='POST'){requireAdmin(user);const result=await db.createCategory(data);return send(res,201,{success:true,message:'Category created',data:result})}
 let m=p.match(/^\/api\/categories\/(\d+)$/);if(m&&method==='DELETE'){requireAdmin(user);const result=await db.deleteCategory(m[1]);return send(res,result?200:404,{success:Boolean(result),data:result})}
 if(p==='/api/items'&&method==='GET'){const rows=await db.getAllItems({status:url.searchParams.get('status'),search:url.searchParams.get('search'),branch:url.searchParams.get('branch'),categoryId:url.searchParams.get('categoryId')});return send(res,200,{success:true,count:rows.length,data:rows.map(x=>safeItem(x,user))})}
 m=p.match(/^\/api\/items\/(\d+)$/);if(m&&method==='GET'){const row=await db.getItemById(m[1]);return send(res,row?200:404,{success:Boolean(row),data:safeItem(row,user)})}
 if(p==='/api/items'&&method==='POST'){requireUser(user);const row=await db.createItem({...data,studentName:user.name},user.user_id);return send(res,201,{success:true,message:'Report submitted successfully',data:safeItem(row,user)})}
 if(m&&method==='PUT'){requireUser(user);const old=await db.getItemById(m[1]);if(!old)return send(res,404,{success:false,message:'Report not found.'});if(user.role!=='admin'&&Number(old.reported_by_user_id)!==Number(user.user_id))throw Object.assign(new Error('You can only manage reports you submitted.'),{status:403});if(user.role!=='admin'&&data.status==='Claimed')throw Object.assign(new Error('Only campus staff can mark an item as claimed.'),{status:403});const row=await db.updateItem(m[1],data);return send(res,200,{success:true,data:safeItem(row,user)})}
 if(m&&method==='DELETE'){requireUser(user);const old=await db.getItemById(m[1]);if(!old)return send(res,404,{success:false,message:'Report not found.'});if(user.role!=='admin'&&Number(old.reported_by_user_id)!==Number(user.user_id))throw Object.assign(new Error('You can only manage reports you submitted.'),{status:403});const row=await db.deleteItem(m[1]);return send(res,200,{success:true,data:safeItem(row,user)})}
 if(p==='/api/claims'&&method==='GET'){requireAdmin(user);const rows=await db.getAllClaims();return send(res,200,{success:true,count:rows.length,data:rows})}
 if(p==='/api/claims/submit'&&method==='POST'){requireUser(user);return send(res,200,await db.submitClaimTransaction(data))}
 m=p.match(/^\/api\/claims\/(\d+)\/review$/);if(m&&method==='PATCH'){requireAdmin(user);return send(res,200,await db.reviewClaim(m[1],data.decision))}
 m=p.match(/^\/api\/items\/(\d+)\/conversations$/);if(m&&method==='POST'){requireUser(user);return send(res,200,{success:true,...await db.openItemConversation(m[1],user.user_id)})}
 m=p.match(/^\/api\/conversations\/(\d+)\/messages$/);if(m&&method==='GET'){requireUser(user);return send(res,200,{success:true,data:await db.getConversationMessages(m[1],user.user_id)})}if(m&&method==='POST'){requireUser(user);return send(res,201,await db.sendConversationMessage(m[1],user.user_id,data.body))}
 if(p==='/api/audit-logs'&&method==='GET'){requireAdmin(user);const rows=await db.getAuditLogs();return send(res,200,{success:true,count:rows.length,data:rows})}
 if(p.startsWith('/api/'))return send(res,404,{success:false,message:'API route not found'});
 if(process.env.NODE_ENV==='production')return await serveStatic(req,res,url);return send(res,404,{success:false,message:'Route not found'});
 }catch(error){return send(res,error.status||400,{success:false,message:error.message||'Request failed'})}}
const server=http.createServer((req,res)=>void handle(req,res));
await db.initDatabaseConnection();await db.ensureAdminAccount();server.listen(port,'0.0.0.0',()=>console.log(`Smart Campus Lost & Found Node API running at port ${port}`));
