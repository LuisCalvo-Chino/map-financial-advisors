import{_ as ee,C as te,z as H,A as ne,d as O,b as F,g as se,c as q,h as V,B as ie}from"./firebase-config-BJGMYP3z.js";import{n as ae}from"./webinar-form-ui-BXkUZLQk.js";import{f as re}from"./gmail-backend-alEj_uZ5.js";import{s as oe}from"./logic-admin-3J773kRQ.js";import{f as ce,g as le}from"./messaging-model-CJEiLUj0.js";import"./webinars-header-CRS18hlg.js";import"./auth-handler-CBI4Htsr.js";import"./user-schema-zU-iyuhU.js";import"./ui-shell-CAP1PXY6.js";import"./preload-helper-Dp1pzeXC.js";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const de="functions";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ue{constructor(t,a,i,s){this.app=t,this.auth=null,this.messaging=null,this.appCheck=null,this.serverAppAppCheckToken=null,ne(t)&&t.settings.appCheckToken&&(this.serverAppAppCheckToken=t.settings.appCheckToken),this.auth=a.getImmediate({optional:!0}),this.messaging=i.getImmediate({optional:!0}),this.auth||a.get().then(o=>this.auth=o,()=>{}),this.messaging||i.get().then(o=>this.messaging=o,()=>{}),this.appCheck||s==null||s.get().then(o=>this.appCheck=o,()=>{})}async getAuthToken(){if(this.auth)try{const t=await this.auth.getToken();return t==null?void 0:t.accessToken}catch{return}}async getMessagingToken(){if(!(!this.messaging||!("Notification"in self)||Notification.permission!=="granted"))try{return await this.messaging.getToken()}catch{return}}async getAppCheckToken(t){if(this.serverAppAppCheckToken)return this.serverAppAppCheckToken;if(this.appCheck){const a=t?await this.appCheck.getLimitedUseToken():await this.appCheck.getToken();return a.error?null:a.token}return null}async getContext(t){const a=await this.getAuthToken(),i=await this.getMessagingToken(),s=await this.getAppCheckToken(t);return{authToken:a,messagingToken:i,appCheckToken:s}}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const G="us-central1";class pe{constructor(t,a,i,s,o=G,g=(...l)=>fetch(...l)){this.app=t,this.fetchImpl=g,this.emulatorOrigin=null,this.contextProvider=new ue(t,a,i,s),this.cancelAllRequests=new Promise(l=>{this.deleteService=()=>Promise.resolve(l())});try{const l=new URL(o);this.customDomain=l.origin+(l.pathname==="/"?"":l.pathname),this.region=G}catch{this.customDomain=null,this.region=o}}_delete(){return this.deleteService()}_url(t){const a=this.app.options.projectId;return this.emulatorOrigin!==null?`${this.emulatorOrigin}/${a}/${this.region}/${t}`:this.customDomain!==null?`${this.customDomain}/${t}`:`https://${this.region}-${a}.cloudfunctions.net/${t}`}}const K="@firebase/functions",W="0.13.3";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const me="auth-internal",he="app-check-internal",ge="messaging-internal";function fe(r){const t=(a,{instanceIdentifier:i})=>{const s=a.getProvider("app").getImmediate(),o=a.getProvider(me),g=a.getProvider(ge),l=a.getProvider(he);return new pe(s,o,g,l,i)};ee(new te(de,t,"PUBLIC").setMultipleInstances(!0)),H(K,W,r),H(K,W,"esm2020")}fe();const be='<svg class="webinars-entries-trash-icon" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',we='<svg class="webinars-entries-trash-icon" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>';let m=null,k="asc";function z(r){const t=[...r];return m&&t.sort((a,i)=>{if(m==="_fecha"){const l=a.createdAt?a.createdAt.getTime():0,S=i.createdAt?i.createdAt.getTime():0,C=l-S;return k==="asc"?C:-C}let s="",o="";if(m==="_email")s=a.email,o=i.email;else if(m!=null&&m.startsWith("msg:")){const l=m.slice(4);s=String(a.emailStatus[l]||""),o=String(i.emailStatus[l]||"")}else s=String(a.answers[m]||""),o=String(i.answers[m]||"");const g=s.localeCompare(o,"es",{sensitivity:"base"});return k==="asc"?g:-g}),t}function ve(r){return r==="sent"?"Enviado":r==="failed"?"Error al enviar":r==="skipped"?"Omitido":r==="queued"?"En cola":"Pendiente"}function Y(r){const t=String(r??"");return/[",\n\r]/.test(t)?`"${t.replace(/"/g,'""')}"`:t}async function Fe(r,t){var P;const i=new URLSearchParams(window.location.search).get("id"),s=document.getElementById("webinars-access-guard"),o=document.getElementById("webinars-entries-panel"),g=document.getElementById("entries-table-wrap"),l=document.getElementById("entries-form-title"),S=document.getElementById("entries-status"),C=document.getElementById("entries-btn-edit"),T=document.getElementById("entries-btn-messages"),B=document.getElementById("entries-btn-csv");if(!i||!g||!o){s&&(s.hidden=!1,s.innerHTML='<h2>Formulario no especificado</h2><p>Falta el parámetro <code>id</code> en la URL.</p><p><a href="./index.html">Volver</a></p>');return}s&&(s.hidden=!1),o.hidden=!0;try{let f=function(h,u){if(S){if(!h){S.hidden=!0,S.textContent="",S.classList.remove("webinars-builder-status--error");return}S.hidden=!1,S.textContent=h,S.classList.toggle("webinars-builder-status--error",!!u)}},Q=function(){const h=z($),p=[["Correo",...L.map(n=>n.label),"Fecha de registro",..._.map(n=>n.name)].map(Y).join(",")];for(const n of h){const b=n.createdAt?n.createdAt.toLocaleString("es"):"",d=[n.email,...L.map(w=>String(n.answers[w.id]??"")),b,..._.map(w=>ve(n.emailStatus[w.id]))].map(Y);p.push(d.join(","))}const y=new Blob(["\uFEFF"+p.join(`\r
`)],{type:"text/csv;charset=utf-8"}),e=(I.titulo||"inscripciones").replace(/[^\w\s-]/g,"").trim().replace(/\s+/g,"_").slice(0,80),c=document.createElement("a");c.href=URL.createObjectURL(y),c.download=`${e||"inscripciones"}_${i.slice(0,8)}.csv`,c.click(),URL.revokeObjectURL(c.href),f("")},N=function(){const h=z($),u=L.map(e=>`
        <th scope="col">
          <button type="button" class="webinars-entries-th" data-sort="field:${E(e.id)}">
            ${A(e.label)}${m===e.id?k==="asc"?" ▲":" ▼":""}
          </button>
        </th>`).join(""),p=_.map(e=>`
        <th scope="col">
          <button type="button" class="webinars-entries-th" data-sort="msg:${E(e.id)}">
            ${A(e.name)}${m===`msg:${e.id}`?k==="asc"?" ▲":" ▼":""}
          </button>
        </th>`).join(""),y=h.map(e=>{const c=L.map(d=>`<td>${A(String(e.answers[d.id]??""))}</td>`).join(""),n=_.map(d=>{const w=ye(e.emailStatus[d.id]),v=!!d.enabled&&R&&!!String(e.email||"").trim()?`<button type="button" class="webinars-entries-resend webinars-entries-resend--inline" data-resend-msg="${E(d.id)}" data-resend-participant="${E(e.id)}" data-msg-label="${E(d.name)}" data-participant-email="${E(e.email)}" title="${E(`Enviar «${d.name}» a ${e.email}`)}" aria-label="${E(`Enviar mensaje: ${d.name}`)}">
              ${we}
            </button>`:"";return`<td class="webinars-entries-msg-cell"><div class="webinars-entries-msg-cell__inner"><span class="webinars-entries-msg-cell__status">${w}</span>${v}</div></td>`}).join(""),b=e.createdAt?e.createdAt.toLocaleString("es"):"—";return`<tr data-participant-id="${E(e.id)}">
          <td>${A(e.email)}</td>
          ${c}
          <td>${A(b)}</td>
          ${n}
          <td class="webinars-entries-actions-cell">
            <button type="button" class="webinars-entries-trash" data-delete-entry="${E(e.id)}" aria-label="Eliminar inscripción" title="Eliminar inscripción">
              ${be}
            </button>
          </td>
        </tr>`}).join("");g.innerHTML=`
        <div class="webinars-entries-scroll">
          <table class="webinars-entries-table">
            <thead>
              <tr>
                <th scope="col">
                  <button type="button" class="webinars-entries-th" data-sort="col:_email">
                    Correo${m==="_email"?k==="asc"?" ▲":" ▼":""}
                  </button>
                </th>
                ${u}
                <th scope="col">
                  <button type="button" class="webinars-entries-th" data-sort="col:_fecha">
                    Fecha de registro${m==="_fecha"?k==="asc"?" ▲":" ▼":""}
                  </button>
                </th>
                ${p}
                <th scope="col" class="webinars-entries-th--action" aria-label="Acciones"></th>
              </tr>
            </thead>
            <tbody>${y||`<tr><td colspan="${J}">Sin inscripciones todavía.</td></tr>`}</tbody>
          </table>
        </div>
      `,g.querySelectorAll(".webinars-entries-th").forEach(e=>{e.addEventListener("click",()=>{const c=e.dataset.sort||"",n=c.indexOf(":"),b=n>=0?c.slice(0,n):"",d=n>=0?c.slice(n+1):"",w=b==="field"||b==="col"?d:b==="msg"?`msg:${d}`:null;w&&(m===w?k=k==="asc"?"desc":"asc":(m=w,k="asc"),N())})}),g.querySelectorAll("[data-resend-msg]").forEach(e=>{e.addEventListener("click",async c=>{c.stopPropagation();const n=e,b=n.dataset.resendMsg,d=n.dataset.resendParticipant,w=n.dataset.msgLabel||"este mensaje",D=n.dataset.participantEmail||"";if(!(!b||!d)&&confirm(`¿Encolar el envío de «${w}» a ${D||"este participante"}? Se usará tu cuenta Gmail conectada (MAP).`)){n.disabled=!0;try{f("Enviando correo...");const v=await re("/api/gmail/resend",{webinarId:i,participantId:d,templateKey:b});if(Number((v==null?void 0:v.queued)??0)>0)try{await oe({limit:1}),f("Correo enviado con éxito.")}catch(Z){console.error("Error procesando la cola:",Z),f("Correo encolado. Se enviará en breve en segundo plano.")}else f("Solicitud enviada.");window.setTimeout(()=>f(""),5e3),await X()}catch(v){console.error(v);const U=v&&typeof v=="object"&&"message"in v?String(v.message):"No se pudo encolar el envío.";f(U,!0)}finally{n.disabled=!1}}})}),g.querySelectorAll("[data-delete-entry]").forEach(e=>{e.addEventListener("click",async()=>{const c=e.dataset.deleteEntry;if(c&&confirm("¿Eliminar esta inscripción? No se puede deshacer.")){e.disabled=!0;try{await ie(O(F,"webinars",i,"participantes",c)),$=$.filter(n=>n.id!==c),f("Inscripción eliminada."),window.setTimeout(()=>f(""),3500),N()}catch(n){console.error(n);const b=n&&typeof n=="object"&&"code"in n?String(n.code):"";f(b==="permission-denied"?"No se pudo eliminar (permisos de Firebase). Despliega las reglas de Firestore del repositorio y, si puedes, las Cloud Functions para que las nuevas inscripciones incluyan el campo de dueño. Si ya desplegaste, recarga la página.":"No se pudo eliminar la inscripción. Revisa tu conexión o inténtalo de nuevo.",!0),e.disabled=!1}}})})};const x=O(F,"webinars",i),M=await se(x);if(!M.exists()){s&&(s.innerHTML='<h2>No encontrado</h2><p><a href="./index.html">Volver</a></p>');return}const j=M.data();if(((P=j.createdBy)==null?void 0:P.uid)!==r.uid){s&&(s.innerHTML='<h2>Sin permiso</h2><p><a href="./index.html">Volver</a></p>');return}const I=ae({id:M.id,...j});if(!I)return;s&&(s.hidden=!0),o.hidden=!1,l&&(l.textContent=I.titulo||"Inscripciones"),C&&(C.href=`./builder.html?id=${encodeURIComponent(i)}`);const R=I.fields.some(h=>h.type==="email");T&&(T.href=`./form-messages.html?id=${encodeURIComponent(i)}`,R||(T.classList.add("webinars-btn-disabled"),T.setAttribute("aria-disabled","true"),T.addEventListener("click",h=>{h.preventDefault(),alert("Añade un campo de correo electrónico al formulario para usar mensajes.")})));const L=ce(I.fields),_=le(j);let $=(await q(V(F,"webinars",i,"participantes"))).docs.map(h=>{var y,e;const u=h.data(),p=((e=(y=u.createdAt)==null?void 0:y.toDate)==null?void 0:e.call(y))??null;return{id:h.id,email:String(u.email||""),answers:u.answers&&typeof u.answers=="object"?u.answers:{},emailStatus:u.emailStatus&&typeof u.emailStatus=="object"?u.emailStatus:{},createdAt:p}});const J=3+L.length+_.length;B&&B.addEventListener("click",()=>{if($.length===0){f("No hay inscripciones para exportar.",!0);return}Q()});async function X(){$=(await q(V(F,"webinars",i,"participantes"))).docs.map(u=>{var e,c;const p=u.data(),y=((c=(e=p.createdAt)==null?void 0:e.toDate)==null?void 0:c.call(e))??null;return{id:u.id,email:String(p.email||""),answers:p.answers&&typeof p.answers=="object"?p.answers:{},emailStatus:p.emailStatus&&typeof p.emailStatus=="object"?p.emailStatus:{},createdAt:y}}),N()}N()}catch(x){console.error(x),s&&(s.hidden=!1,s.innerHTML="<h2>Error</h2><p>No se pudieron cargar las inscripciones.</p>")}}function ye(r){return r==="sent"?'<span class="webinars-msg-ok" title="Enviado">✓</span>':r==="failed"?'<span class="webinars-msg-fail" title="Error al enviar">✗</span>':r==="skipped"?'<span class="webinars-msg-skip" title="Omitido">—</span>':r==="queued"?'<span class="webinars-msg-pending" title="En cola">…</span>':'<span class="webinars-msg-pending" title="Pendiente">○</span>'}function A(r){return String(r).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function E(r){return A(r).replace(/'/g,"&#39;")}export{Fe as initEntriesPage};
