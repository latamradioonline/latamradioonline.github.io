const SUPABASE_URL="https://syvdtvbuvdjazbulgngp.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_pREbQ7wkjSj9Ln8iUWmljg_3qOUfFoT";
const client=window.supabase?.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const target=document.querySelector("#social-page-links");
const safeUrl=value=>{try{const url=new URL(value);return ["https:","http:"].includes(url.protocol)?url.href:"";}catch{return "";}};
async function loadSocialLinks(){
  if(!client||!target)return;
  const {data,error}=await client.from("site_settings").select("settings").eq("id",1).maybeSingle();
  if(error){target.innerHTML='<p class="public-content-error">No se pudieron cargar los enlaces.</p>';return;}
  const links=Array.isArray(data?.settings?.social_links)?data.settings.social_links:[];
  target.replaceChildren();
  const valid=links.map(item=>({title:String(item.title||item.label||"").trim(),url:safeUrl(item.url)})).filter(item=>item.title&&item.url);
  if(!valid.length){target.innerHTML="<p>Aún no hay enlaces publicados.</p>";return;}
  valid.forEach(item=>{const card=document.createElement("article");card.className="public-content-card";const body=document.createElement("div");body.className="public-content-card-body";const title=document.createElement("h2");title.textContent=item.title;const link=document.createElement("a");link.className="button red";link.href=item.url;link.target="_blank";link.rel="noopener noreferrer";link.textContent=`Visitar ${item.title}`;body.append(title,link);card.append(body);target.append(card);});
}
loadSocialLinks();
