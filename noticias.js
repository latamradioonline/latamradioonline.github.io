const SUPABASE_URL="https://syvdtvbuvdjazbulgngp.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_pREbQ7wkjSj9Ln8iUWmljg_3qOUfFoT";
const client=window.supabase?.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const safeUrl=value=>{try{const url=new URL(value);return ["https:","http:"].includes(url.protocol)?url.href:"";}catch{return "";}};
function createCard(news){
  const card=document.createElement("article");card.className="public-content-card standalone-news-card";
  const image=safeUrl(news.imagen);if(image){const img=document.createElement("img");img.src=image;img.alt="";img.loading="lazy";card.append(img);}
  const body=document.createElement("div");body.className="public-content-card-body";
  const category=document.createElement("p");category.className="public-content-card-kicker";category.textContent=news.categoria||"Noticias";body.append(category);
  const title=document.createElement("h2");title.textContent=news.titulo||"Sin título";body.append(title);
  if(news.resumen){const summary=document.createElement("p");summary.textContent=news.resumen;body.append(summary);}
  const link=document.createElement("a");link.className="button red";link.href=`noticia.html?id=${encodeURIComponent(news.id)}`;link.textContent="Leer noticia";body.append(link);
  card.append(body);return card;
}
async function loadNews(){
  const list=document.querySelector("#noticias-lista");if(!client||!list)return;
  const {data,error}=await client.from("noticias").select("id,titulo,resumen,contenido,imagen,categoria,created_at,destacada,published").or("published.eq.true,destacada.eq.true").order("created_at",{ascending:false});
  if(error){list.innerHTML="<p class=\"public-content-error\">No se pudieron cargar las noticias. Inténtalo más tarde.</p>";return;}
  list.replaceChildren();if(!data?.length){list.innerHTML="<p>No hay noticias publicadas.</p>";return;}data.forEach(news=>list.append(createCard(news)));
}
loadNews();
