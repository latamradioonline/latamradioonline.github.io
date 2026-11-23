/* Social link manager loaded only by admin.html. */
(() => {
  const addLinkStyles = document.createElement("link");
  addLinkStyles.rel = "stylesheet";
  addLinkStyles.href = "social-admin.css";
  document.head.append(addLinkStyles);

  const safeUrl = value => {
    try { const url = new URL(value); return ["https:","http:"].includes(url.protocol) ? url.href : ""; } catch { return ""; }
  };

  window.renderSocialManager = async function renderSocialManager(){
    const content = document.querySelector("#admin-content");
    const client = window.supabase?.createClient(
      "https://syvdtvbuvdjazbulgngp.supabase.co",
      "sb_publishable_pREbQ7wkjSj9Ln8iUWmljg_3qOUfFoT"
    );
    if (!client || !content) return;

    const {data,error}=await client.from("site_settings").select("settings").eq("id",1).maybeSingle();
    if(error){content.innerHTML=`<p class="admin-error">${escapeHTML(error.message)}</p>`;return;}

    let settings=data?.settings||{};
    const links=Array.isArray(settings.social_links)?settings.social_links:[];
    content.innerHTML=`<div class="admin-section-heading"><div><h2>↗ Redes Sociales y enlaces</h2><p>Añade perfiles sociales y otros sitios. Se mostrarán en el pie y en la página pública de enlaces.</p></div></div><form id="social-links-form" class="admin-panel-inner"><div id="social-link-rows" class="social-admin-rows"></div><button type="button" class="button outline" id="social-add-link">＋ Añadir enlace</button><button type="submit" class="button red">Guardar cambios</button><p class="admin-status" role="status"></p></form>`;

    const rows=content.querySelector("#social-link-rows");
    const addRow=(item={})=>{
      const row=document.createElement("div");row.className="social-admin-row";
      const titleLabel=document.createElement("label");titleLabel.textContent="Título";
      const title=document.createElement("input");title.name="social_title";title.required=true;title.maxLength=80;title.placeholder="Instagram";title.value=item.title||item.label||"";titleLabel.append(title);
      const urlLabel=document.createElement("label");urlLabel.textContent="Enlace";
      const url=document.createElement("input");url.name="social_url";url.type="url";url.required=true;url.placeholder="https://…";url.value=item.url||"";urlLabel.append(url);
      const remove=document.createElement("button");remove.type="button";remove.className="button outline social-remove-link";remove.textContent="Quitar";
      row.append(titleLabel,urlLabel,remove);rows.append(row);
    };
    links.forEach(addRow);

    content.querySelector("#social-add-link").addEventListener("click",()=>{addRow();rows.lastElementChild.querySelector("input")?.focus();});
    rows.addEventListener("click",event=>{const remove=event.target.closest(".social-remove-link");if(remove)remove.closest(".social-admin-row").remove();});

    content.querySelector("#social-links-form").addEventListener("submit",async event=>{
      event.preventDefault();
      const form=event.currentTarget,status=form.querySelector(".admin-status");
      const next=[];
      for(const row of rows.querySelectorAll(".social-admin-row")){
        const title=row.querySelector('[name="social_title"]').value.trim();
        const url=safeUrl(row.querySelector('[name="social_url"]').value.trim());
        if(!title||!url){status.textContent="Cada enlace necesita un título y una URL válida.";status.classList.add("is-error");return;}
        next.push({title,label:title,url});
      }
      const save=form.querySelector('button[type="submit"]');save.disabled=true;status.textContent="Guardando…";status.classList.remove("is-error");
      settings={...settings,social_links:next};
      const {error}=await client.from("site_settings").upsert({id:1,settings,updated_at:new Date().toISOString()});
      status.textContent=error?`Error: ${error.message}`:"Cambios guardados.";
      status.classList.toggle("is-error",!!error);save.disabled=false;
    });
  };
})();
