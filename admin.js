const SUPABASE_URL="https://syvdtvbuvdjazbulgngp.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_pREbQ7wkjSj9Ln8iUWmljg_3qOUfFoT";
const ADMIN_EMAIL="latamradio345@gmail.com";
const IMAGE_BUCKET="site-content";
const client=window.supabase?.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const $=selector=>document.querySelector(selector);
const workspace=$("#admin-workspace"),loginPanel=$("#admin-login"),content=$("#admin-content"),dialog=$("#content-dialog"),form=$("#content-form");
const sections={
  news:{label:"Noticias",icon:"▤",table:"noticias",fields:["titulo","resumen","contenido","categoria","imagen","destacada","published"]},
  streaming:{label:"Streaming",icon:"▣",table:"site_content",fields:["title","description","media_url","image_url","published"]},
  podcast:{label:"Podcasts",icon:"♬",table:"site_content",fields:["title","description","media_url","image_url","published"]},
  playlists:{label:"Playlists",icon:"♫",table:"site_content",fields:["title","description","media_url","image_url","published"]},
  schedule:{label:"Programación de Emisiones",icon:"▦",table:"site_content",fields:["title","host","description","start_time","end_time","days","published"]}
};
const hashTabs={estadisticas:"stats",noticias:"news",webradio:"radio",streaming:"streaming",podcast:"podcast",social:"social",newsletter:"newsletter",playlists:"playlists",programacion:"schedule"};
const tabHashes={stats:"estadisticas",news:"noticias",radio:"webradio",streaming:"streaming",podcast:"podcast",social:"social",newsletter:"newsletter",playlists:"playlists",schedule:"programacion"};
let activeTab="news",editing=null,settings={};
function isAdmin(user){return user?.email?.toLowerCase()===ADMIN_EMAIL;}
function escapeHTML(value=""){return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));}
function safeUrl(value=""){try{const url=new URL(value);return ["https:","http:"].includes(url.protocol)?url.href:"";}catch{return "";}}
function setStatus(node,message,isError=false){if(!node)return;node.textContent=message;node.classList.toggle("is-error",isError);}
function fieldLabel(key){return ({titulo:"Título *",resumen:"Resumen breve",contenido:"Contenido detallado",imagen:"Imagen de portada",categoria:"Categoría",destacada:"Marcar como urgente / destacada",title:"Título *",description:"Descripción",media_url:"Enlace del audio, video o playlist",image_url:"Imagen o portada (URL)",published:"Publicado (visible para oyentes)",host:"Presentador o equipo",start_time:"Hora de inicio",end_time:"Hora de finalización",days:"Días de emisión (separados por coma)"})[key]||key;}
function renderField(key,value){
  const label=fieldLabel(key);
  if(key==="published"||key==="destacada")return `<label class="admin-check"><input name="${key}" type="checkbox" ${value?"checked":""}><span>${label}</span></label>`;
  if(key==="categoria")return `<label>${label}<select name="categoria"><option ${value==="Noticias"?"selected":""}>Noticias</option><option ${value==="Actualidad"?"selected":""}>Actualidad</option><option ${value==="Cultura"?"selected":""}>Cultura</option><option ${value==="Música"?"selected":""}>Música</option><option ${value==="Deportes"?"selected":""}>Deportes</option><option ${value==="Comunidad"?"selected":""}>Comunidad</option></select></label>`;
  if(key==="imagen")return `<label>${label}<input name="imagen_file" type="file" accept="image/*"><input name="imagen" type="url" value="${escapeHTML(value||"")}" placeholder="O pega una URL de imagen"><small class="field-help">Puedes seleccionar una imagen del teléfono o pegar una URL.</small><img id="image-preview" class="editor-image-preview" src="${safeUrl(value)||""}" alt="Vista previa" ${safeUrl(value)?"":"hidden"}></label>`;
  if(["contenido","description","resumen"].includes(key))return `<label>${label}<textarea name="${key}" rows="${key==="contenido"?9:3}" ${key==="resumen"?"":""}>${escapeHTML(value||"")}</textarea>${key==="contenido"?"<small class='field-help'>El contenido se muestra debajo de la imagen de portada.</small>":""}</label>`;
  const type=["image_url","media_url"].includes(key)?"url":(["start_time","end_time"].includes(key)?"time":"text");
  return `<label>${label}<input name="${key}" type="${type}" value="${escapeHTML(value||"")}" ${(key==="titulo"||key==="title")?"required":""} ${type==="url"?"placeholder='https://…'":""}></label>`;
}
function renderTabs(){document.querySelectorAll("[data-tab]").forEach(link=>link.classList.toggle("active",link.dataset.tab===activeTab));}
function openTab(tab,updateHash=true){activeTab=(tab in sections||["stats","radio","social","newsletter"].includes(tab))?tab:"news";renderTabs();if(updateHash)history.replaceState(null,"",`#${tabHashes[activeTab]}`);renderCurrent();}
document.querySelectorAll("[data-tab]").forEach(link=>link.addEventListener("click",event=>{event.preventDefault();openTab(link.dataset.tab);}));
window.addEventListener("hashchange",()=>{if(workspace&&!workspace.hidden)openTab(hashTabs[location.hash.slice(1)]||"news",false);});
async function renderCurrent(){if(!client)return;if(activeTab==="stats")return renderStats();if(activeTab==="radio")return renderRadio();if(activeTab==="social")return renderSettings();if(activeTab==="newsletter")return renderNewsletter();return renderCollection(activeTab);}
function actionButton(action,id,label,icon,extra=""){return `<button type="button" class="admin-icon-button ${extra}" data-action="${action}" data-id="${escapeHTML(id)}" aria-label="${label}" title="${label}">${icon}</button>`;}
async function fetchRows(tab){const spec=sections[tab];let query=client.from(spec.table).select("*");if(spec.table==="site_content")query=query.eq("section",tab);const orderColumn=spec.table==="noticias"?"created_at":"sort_order";const {data,error}=await query.order(orderColumn,{ascending:spec.table!=="noticias"});if(error)throw error;return data||[];}
async function renderCollection(tab){
  const spec=sections[tab];
  content.innerHTML=`<div class="admin-section-heading"><div><h2>${spec.icon} ${spec.label=== "Noticias"?"Gestión de Noticias":spec.label}</h2><p>Gestiona lo que aparece en la versión pública del sitio.</p></div><button type="button" class="button admin-primary" id="add-content">＋ ${tab==="news"?"Nuevo Artículo":tab==="schedule"?"Nuevo Programa":tab==="podcast"?"Nuevo Episodio":tab==="playlists"?"Nueva Playlist":"Nuevo Video"}</button></div><div id="content-list" class="admin-list"><p>Cargando contenido…</p></div>`;
  $("#add-content").addEventListener("click",()=>editItem(tab,null));
  try{const rows=await fetchRows(tab),list=$("#content-list");list.replaceChildren();if(!rows.length){list.innerHTML=`<div class="admin-empty"><span>${spec.icon}</span><p>${tab==="playlists"?"Ninguna playlist todavía. ¡Crea una!":tab==="podcast"?"No hay podcasts.":`Todavía no hay ${spec.label.toLowerCase()}.`}</p></div>`;}else rows.forEach(row=>list.append(createRow(tab,row)));}
  catch(error){$("#content-list").innerHTML=`<p class="admin-error">No se pudo cargar: ${escapeHTML(error.message)}. Comprueba que ejecutaste content-management.sql en Supabase.</p>`;}
}
function createRow(tab,row){
  const title=row.titulo||row.title||"Sin título",description=row.resumen||row.host||row.categoria||row.description||row.contenido||"",image=safeUrl(row.imagen||row.image_url),published=row.published===true;
  const card=document.createElement("article");card.className="admin-item";
  const thumb=document.createElement("div");thumb.className="admin-thumb";if(image){const img=document.createElement("img");img.src=image;img.alt="";img.loading="lazy";thumb.append(img);}else thumb.textContent=sections[tab].icon;
  const info=document.createElement("div");info.className="admin-item-info";const heading=document.createElement("h3");heading.textContent=title;const summary=document.createElement("p");summary.textContent=tab==="schedule"?`${row.start_time||"--:--"} – ${row.end_time||"--:--"} · ${row.days||"Días no indicados"}`:description;const badge=document.createElement("span");badge.className=`admin-badge ${published?"published":"draft"}`;badge.textContent=published?"Publicado":"Borrador";info.append(heading,summary);if(tab==="news"&&row.destacada){const urgent=document.createElement("span");urgent.className="urgent-marker";urgent.textContent="⚠ Urgente";info.append(urgent);}info.append(badge);
  const actions=document.createElement("div");actions.className="admin-item-actions";actions.innerHTML=actionButton("view",row.id,"Ver en el sitio público","◎","view")+actionButton("edit",row.id,"Editar","✎")+actionButton("delete",row.id,"Eliminar","♲","delete");card.append(thumb,info,actions);return card;
}
async function editItem(tab,id){
  const spec=sections[tab];let row={};
  if(id){try{const {data,error}=await client.from(spec.table).select("*").eq("id",id).single();if(error)throw error;row=data;}catch(error){alert(`No se pudo abrir el artículo: ${error.message}`);return;}}
  editing={tab,id};
  $("#dialog-fields").innerHTML=`<p class="kicker">${id?"EDITAR":"NUEVO"} · ${spec.label.toUpperCase()}</p><h2>${id?(tab==="news"?"Editar Artículo":"Editar contenido"):(tab==="news"?"Nuevo Artículo":"Crear contenido")}</h2><div class="admin-form-grid">${spec.fields.map(key=>renderField(key,row[key])).join("")}</div>`;
  setStatus($("#dialog-status"),"");const preview=$("#image-preview"),fileInput=form.elements.imagen_file,urlInput=form.elements.imagen;
  fileInput?.addEventListener("change",()=>{const file=fileInput.files?.[0];if(!file)return;if(!file.type.startsWith("image/")){setStatus($("#dialog-status"),"Selecciona un archivo de imagen válido.",true);fileInput.value="";return;}if(preview){preview.src=URL.createObjectURL(file);preview.hidden=false;}setStatus($("#dialog-status"),"");});
  urlInput?.addEventListener("input",()=>{if(!preview||fileInput?.files?.length)return;const url=safeUrl(urlInput.value);preview.src=url;preview.hidden=!url;});
  dialog.showModal();
}
async function uploadNewsImage(file){if(!file)return "";if(!file.type.startsWith("image/"))throw new Error("El archivo seleccionado no es una imagen.");if(file.size>8*1024*1024)throw new Error("La imagen debe pesar menos de 8 MB.");const extension=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg",path=`news/${crypto.randomUUID()}.${extension}`;const {error}=await client.storage.from(IMAGE_BUCKET).upload(path,file,{contentType:file.type,upsert:false});if(error)throw error;return client.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;}
form.addEventListener("submit",async event=>{
  event.preventDefault();if(!editing)return;
  const {tab,id}=editing,spec=sections[tab],fd=new FormData(form),record={};
  spec.fields.forEach(key=>{if(key==="imagen")return;if(key==="published"||key==="destacada")record[key]=fd.has(key);else{const value=String(fd.get(key)||"").trim();record[key]=["start_time","end_time"].includes(key)?(value||null):value;}});
  if(tab==="news")record.imagen=safeUrl(fd.get("imagen")||"");
  if(spec.table==="site_content"){record.section=tab;record.sort_order=0;}
  const status=$("#dialog-status"),saveButton=$("#save-content");saveButton.disabled=true;setStatus(status,"Guardando…");
  try{
    const selectedImage=fd.get("imagen_file");if(tab==="news"&&selectedImage?.size)record.imagen=await uploadNewsImage(selectedImage);
    let query=id?client.from(spec.table).update(record).eq("id",id):client.from(spec.table).insert(record);
    const {error}=await query;if(error)throw error;
    dialog.close();editing=null;await renderCurrent();
  }catch(error){setStatus(status,`No se pudo guardar: ${error.message}`,true);}
  finally{saveButton.disabled=false;}
});
$("#cancel-edit").addEventListener("click",()=>dialog.close());$(".admin-dialog-close").addEventListener("click",()=>dialog.close());
dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});
content.addEventListener("click",async event=>{
  const button=event.target.closest("[data-action]");if(!button)return;
  const action=button.dataset.action,tab=activeTab,spec=sections[tab],id=button.dataset.id;
  if(action==="edit")return editItem(tab,id);
  if(action==="view"){const hash=tab==="news"?"#noticias":`#${tab==="schedule"?"programacion":tab}`;window.open(`index.html${hash}`,"_blank","noopener,noreferrer");return;}
  if(action==="delete"&&confirm("¿Eliminar este contenido? Esta acción no se puede deshacer.")){button.disabled=true;const {error}=await client.from(spec.table).delete().eq("id",id);if(error){alert(`No se pudo eliminar: ${error.message}`);button.disabled=false;}else await renderCurrent();}
});
async function renderStats(){content.innerHTML="<h2>Estadísticas del panel</h2><div class='admin-stats' id='stats-grid'><p>Cargando…</p></div>";const counts=await Promise.all(Object.entries(sections).map(async([key,spec])=>{let query=client.from(spec.table).select("id",{count:"exact",head:true});if(spec.table==="site_content")query=query.eq("section",key);const {count,error}=await query;return [spec.label,error?"—":count||0];}));$("#stats-grid").innerHTML=counts.map(([label,count])=>`<div class="admin-stat"><strong>${count}</strong><span>${escapeHTML(label)}</span></div>`).join("");}
async function renderRadio(){const {data,error}=await client.from("site_settings").select("settings").eq("id",1).maybeSingle();if(error){content.innerHTML=`<p class="admin-error">${escapeHTML(error.message)}</p>`;return;}settings=data?.settings||{};content.innerHTML=`<div class="admin-section-heading"><div><h2>◉ WebRadio</h2><p>Configura la señal que escucharán los oyentes.</p></div></div><form id="radio-form" class="admin-form admin-panel-inner"><label>URL de transmisión de audio<input name="stream_url" type="url" value="${escapeHTML(settings.stream_url||"")}" placeholder="https://…"></label><label>Texto de lo que suena<input name="now_playing" value="${escapeHTML(settings.now_playing||"")}" placeholder="Música continua"></label><button class="button admin-primary">Guardar configuración</button><p class="admin-status" role="status"></p></form>`;$("#radio-form").addEventListener("submit",saveSettingsForm);}
async function renderSettings(){const {data,error}=await client.from("site_settings").select("settings").eq("id",1).maybeSingle();if(error){content.innerHTML=`<p class="admin-error">${escapeHTML(error.message)}</p>`;return;}settings=data?.settings||{};content.innerHTML=`<div class="admin-section-heading"><div><h2>↗ Redes Sociales</h2><p>Administra los enlaces visibles en el sitio.</p></div></div><form id="social-form" class="admin-form admin-panel-inner"><label>Un enlace por línea, con formato: nombre | URL<textarea name="social_links" rows="8" placeholder="Instagram | https://instagram.com/…">${escapeHTML((settings.social_links||[]).map(item=>`${item.label} | ${item.url}`).join("\n"))}</textarea></label><button class="button admin-primary">Guardar cambios</button><p class="admin-status" role="status"></p></form>`;$("#social-form").addEventListener("submit",async event=>{event.preventDefault();const lines=new FormData(event.currentTarget).get("social_links").split("\n").map(line=>line.split("|"));settings.social_links=lines.map(([label,url])=>({label:label?.trim(),url:safeUrl(url?.trim())})).filter(item=>item.label&&item.url);await persistSettings(event.currentTarget);});}
async function saveSettingsForm(event){event.preventDefault();const data=new FormData(event.currentTarget);settings.stream_url=safeUrl(data.get("stream_url").trim());settings.now_playing=data.get("now_playing").trim();await persistSettings(event.currentTarget);}
async function persistSettings(targetForm){const status=targetForm.querySelector(".admin-status"),{error}=await client.from("site_settings").upsert({id:1,settings,updated_at:new Date().toISOString()});setStatus(status,error?`Error: ${error.message}`:"Cambios guardados.",!!error);}
async function renderNewsletter(){content.innerHTML="<h2>✉ Suscriptores de Newsletter</h2><div id='newsletter-list' class='admin-list'><p>Cargando…</p></div>";const {data,error}=await client.from("latam_newsletter").select("id,name,email,created_at").order("created_at",{ascending:false});const list=$("#newsletter-list");if(error){list.innerHTML=`<p class="admin-error">${escapeHTML(error.message)}</p>`;return;}if(!data?.length){list.innerHTML="<div class='admin-empty'><p>Aún no hay suscriptores.</p></div>";return;}list.innerHTML=data.map(item=>`<article class="admin-item newsletter-row"><div class="admin-thumb">✉</div><div class="admin-item-info"><h3>${escapeHTML(item.name||"Oyente")}</h3><p>${escapeHTML(item.email)}</p></div><span class="admin-date">${item.created_at?new Date(item.created_at).toLocaleDateString("es"):""}</span></article>`).join("");}
$("#login-form").addEventListener("submit",async event=>{event.preventDefault();const data=new FormData(event.currentTarget),status=$("#login-status");setStatus(status,"Verificando acceso…");if(!client){setStatus(status,"No se pudo conectar con Supabase.",true);return;}const {error}=await client.auth.signInWithPassword({email:data.get("email").trim(),password:data.get("password")});if(error)setStatus(status,error.message,true);});
async function updateAuth(){if(!client)return;const {data,error}=await client.auth.getSession();if(error||!isAdmin(data?.session?.user)){workspace.hidden=true;loginPanel.hidden=false;return;}loginPanel.hidden=true;workspace.hidden=false;openTab(hashTabs[location.hash.slice(1)]||"news",false);}
$("#admin-signout").addEventListener("click",async()=>{await client?.auth.signOut();location.reload();});
client?.auth.onAuthStateChange(()=>setTimeout(updateAuth,0));updateAuth();
