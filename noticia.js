const SUPABASE_URL="https://syvdtvbuvdjazbulgngp.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_pREbQ7wkjSj9Ln8iUWmljg_3qOUfFoT";
const client=window.supabase?.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const target=document.querySelector("#noticia-articulo");
const safeUrl=value=>{try{const url=new URL(value);return ["https:","http:"].includes(url.protocol)?url.href:"";}catch{return "";}};
function text(parent,tag,value,className=""){const node=document.createElement(tag);if(className)node.className=className;node.textContent=value||"";parent.append(node);return node;}
async function loadArticle(){
  const id=new URLSearchParams(location.search).get("id");
  if(!client||!target)return;
  if(!id){target.innerHTML="<p>No se indicó qué noticia mostrar. <a href=\"noticias.html\">Volver a noticias</a>.</p>";return;}
  const {data,error}=await client.from("noticias").select("titulo,resumen,contenido,imagen,categoria,created_at,published,destacada").eq("id",id).maybeSingle();
  if(error||!data||(!data.published&&!data.destacada)){target.innerHTML="<p>La noticia no está disponible. <a href=\"noticias.html\">Volver a noticias</a>.</p>";return;}
  target.replaceChildren();
  text(target,"p",data.categoria||"Noticias","kicker");
  text(target,"h1",data.titulo||"Sin título");
  if(data.resumen)text(target,"p",data.resumen,"standalone-intro");
  const image=safeUrl(data.imagen);
  if(image){const img=document.createElement("img");img.src=image;img.alt=data.titulo||"";img.className="standalone-article-image";target.append(img);}
  const content=text(target,"div",data.contenido||"","standalone-article-body");
  text(target,"a","← Volver a todas las noticias","button red").href="noticias.html";
}
loadArticle();
