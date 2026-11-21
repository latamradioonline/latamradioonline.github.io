const SUPABASE_URL="https://syvdtvbuvdjazbulgngp.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_pREbQ7wkjSj9Ln8iUWmljg_3qOUfFoT";
const client=window.supabase?.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const safeUrl=value=>{try{const url=new URL(value);return ["https:","http:"].includes(url.protocol)?url.href:"";}catch{return "";}};
const section=document.body.dataset.section;
const list=document.querySelector("#section-list");

function addText(parent,tag,value,className=""){
  const node=document.createElement(tag);
  if(className)node.className=className;
  node.textContent=value||"";
  parent.append(node);
  return node;
}

function getYouTubeId(url){
  try{
    const parsed=new URL(url);
    if(parsed.hostname.includes("youtu.be"))return parsed.pathname.slice(1).split("/")[0];
    if(parsed.hostname.includes("youtube.com")||parsed.hostname.includes("youtube-nocookie.com")){
      if(parsed.pathname.startsWith("/embed/"))return parsed.pathname.split("/")[2];
      if(parsed.pathname.startsWith("/shorts/"))return parsed.pathname.split("/")[2];
      return parsed.searchParams.get("v")||"";
    }
  }catch{}
  return "";
}

function getVideoEmbed(url){
  const safe=safeUrl(url);
  if(!safe)return null;
  const youtubeId=getYouTubeId(safe);
  if(youtubeId)return {type:"iframe",src:`https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?rel=0`};
  try{
    const parsed=new URL(safe);
    if(parsed.hostname.includes("vimeo.com")){
      const id=parsed.pathname.split("/").filter(Boolean).pop();
      if(/^\d+$/.test(id||""))return {type:"iframe",src:`https://player.vimeo.com/video/${encodeURIComponent(id)}`};
    }
  }catch{}
  if(/\.(mp4|webm|ogg)(?:$|[?#])/i.test(safe))return {type:"video",src:safe};
  return null;
}

function renderItem(item){
  const card=document.createElement("article");
  card.className="public-content-card";
  const image=safeUrl(item.image_url);
  const link=safeUrl(item.media_url);

  if(section=== "streaming" && link){
    const media=document.createElement("div");
    media.className="streaming-player";
    const poster=document.createElement("img");
    poster.src=image||"malecon.jpg";
    poster.alt=item.title||"Vista previa del video";
    poster.loading="lazy";
    media.append(poster);

    const playButton=document.createElement("button");
    playButton.type="button";
    playButton.className="streaming-play-button";
    playButton.setAttribute("aria-label",`Reproducir ${item.title||"video"}`);
    playButton.innerHTML="<span aria-hidden='true'>▶</span>";
    media.append(playButton);

    playButton.addEventListener("click",()=>{
      const embed=getVideoEmbed(link);
      if(embed?.type=== "iframe"){
        const iframe=document.createElement("iframe");
        iframe.src=embed.src;
        iframe.title=item.title||"Video";
        iframe.allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        iframe.allowFullscreen=true;
        media.replaceChildren(iframe);
      }else if(embed?.type=== "video"){
        const video=document.createElement("video");
        video.src=embed.src;
        video.poster=image||"malecon.jpg";
        video.controls=true;
        video.autoplay=true;
        video.playsInline=true;
        media.replaceChildren(video);
      }else{
        window.open(link,"_blank","noopener,noreferrer");
      }
    });
    card.append(media);
  }else if(image){
    const img=document.createElement("img");
    img.src=image;
    img.alt=item.title||"";
    img.loading="lazy";
    card.append(img);
  }

  const body=document.createElement("div");
  body.className="public-content-card-body";
  addText(body,"h2",item.title||"Sin título");
  if(item.host)addText(body,"p",`Con: ${item.host}`);
  if(item.description)addText(body,"p",item.description);
  if(section==="schedule"){
    const time=[item.start_time,item.end_time].filter(Boolean).join(" – ");
    if(time)addText(body,"p",time,"schedule-time");
    if(item.days)addText(body,"p",item.days);
  }
  if(link && section!== "streaming"){
    const a=document.createElement("a");
    a.className="button red";
    a.href=link;
    a.target="_blank";
    a.rel="noopener noreferrer";
    a.textContent=section==="podcast"?"Escuchar episodio":section==="playlists"?"Abrir playlist":"Ver contenido";
    body.append(a);
  }
  card.append(body);
  return card;
}

async function loadSection(){
  if(!client||!list)return;
  const {data,error}=await client.from("site_content").select("title,description,media_url,image_url,host,start_time,end_time,days,created_at").eq("section",section).eq("published",true).order("sort_order").order("created_at",{ascending:false});
  if(error){list.innerHTML="<p class=\"public-content-error\">No se pudo cargar el contenido. Inténtalo más tarde.</p>";return;}
  list.replaceChildren();
  if(!data?.length){list.innerHTML="<p>Aún no hay contenido publicado en esta sección.</p>";return;}
  data.forEach(item=>list.append(renderItem(item)));
}

async function setupRadio(){
  const audio=document.querySelector("#radio-audio"),button=document.querySelector("#radio-play"),status=document.querySelector("#radio-status");
  if(!client||!audio||!button)return;
  const {data,error}=await client.from("site_settings").select("settings").eq("id",1).maybeSingle();
  const stream=safeUrl(data?.settings?.stream_url);
  if(error||!stream){status.textContent="La señal en vivo todavía no está configurada.";button.disabled=true;return;}
  audio.src=stream;status.textContent="Señal lista. Pulsa para escuchar.";
  button.addEventListener("click",async()=>{try{await audio.play();status.textContent="Reproduciendo en vivo";}catch{status.textContent="No se pudo iniciar la reproducción. Prueba los controles del reproductor.";}});
  audio.addEventListener("error",()=>{status.textContent="No se pudo conectar con la señal de radio.";});
}
if(section==="radio")setupRadio();else loadSection();
