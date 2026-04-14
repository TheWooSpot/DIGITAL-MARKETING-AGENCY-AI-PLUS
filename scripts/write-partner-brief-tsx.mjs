import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { styles, body } = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../src/pages/_pb_embed.json"), "utf8")
);

const PB_INIT = `(function(){
var ACCESS_PHRASE='PARTNER';
var SUPA_URL='https://aagggflwhadxjjhcaohc.supabase.co';
var SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhZ2dnZmx3aGFkeGpqaGNhb2hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NjIwMzMsImV4cCI6MjA4ODQzODAzM30.v4krDE31xAq9vt7Uq4eR2SmKvLLnkMk7MeGKT3SdGdA';
var AGENT_ID='agent_7101knt9k0rkehmsy89j1thxsqzn';

function checkPhrase(){
  var v=document.getElementById('gate-input').value.trim().toUpperCase();
  var err=document.getElementById('gate-error');
  if(v===ACCESS_PHRASE){
    err.textContent='';
    var t=new URLSearchParams(window.location.search).get('token');
    var tok=t?String(t).trim():null;
    if(tok) void validateToken(tok);
    else unlockContent(null);
  } else {
    err.textContent="That phrase doesn't match. Try again or contact your Socialutely liaison.";
    var c=document.getElementById('gate-contact');
    if(c) c.style.display='block';
  }
}
var gi=document.getElementById('gate-input');
if(gi) gi.addEventListener('keydown',function(e){ if(e.key==='Enter') checkPhrase(); });

async function validateToken(token){
  try{
    var supaLib=window.supabase;
    if(!supaLib){
      var ge=document.getElementById('gate-error');
      if(ge) ge.textContent='Loading… please try again in a second.';
      return;
    }
    var sb=supaLib.createClient(SUPA_URL,SUPA_KEY);
    var res=await sb.from('partner_brief_tokens')
      .select('id,call_count,max_calls,partner_name,partner_first_name,expires_at,is_active')
      .eq('token',token)
      .maybeSingle();
    var errEl=document.getElementById('gate-error');
    var contact=document.getElementById('gate-contact');
    if(res.error||!res.data){
      if(errEl) errEl.textContent='That access link is not valid or has expired. Please contact the team for a new link.';
      if(contact) contact.style.display='block';
      return;
    }
    var data=res.data;
    if(!data.is_active){
      if(errEl) errEl.textContent='This access is no longer active.';
      if(contact) contact.style.display='block';
      return;
    }
    if(data.expires_at && new Date(data.expires_at) < new Date()){
      if(errEl) errEl.textContent='This access link has expired.';
      if(contact) contact.style.display='block';
      return;
    }
    if(data.call_count>=data.max_calls){
      if(errEl) errEl.textContent='This access link has reached its usage limit. Please contact the team for additional access.';
      if(contact) contact.style.display='block';
      return;
    }
    unlockContent(data);
    var w=document.querySelector('elevenlabs-convai#pb-el-widget');
    if(w) w.setAttribute('agent-id', AGENT_ID);
    document.addEventListener('elevenlabs-convai:call-start', async function(){
      try{
        await sb.from('partner_brief_tokens').update({
          call_count: data.call_count + 1
        }).eq('id', data.id);
      }catch(_){}
    });
  }catch(e){
    console.error(e);
    var ge=document.getElementById('gate-error');
    if(ge) ge.textContent='Could not verify this link. Try again.';
  }
}

function unlockContent(data){
  var gs=document.getElementById('gate-screen');
  var mc=document.getElementById('main-content');
  if(gs) gs.classList.add('hidden');
  if(mc) mc.style.display='block';
  var badge=document.getElementById('pb-badge');
  if(data && badge){
    var r=Math.max(0, data.max_calls - data.call_count);
    badge.textContent=r>=9000?'unlimited access':r+' conversation'+(r===1?'':'s')+' remaining';
    badge.style.display='block';
    if(data.partner_first_name){
      setTimeout(function(){
        var w=document.querySelector('elevenlabs-convai');
        if(w) w.setAttribute('dynamic-variables',JSON.stringify({partner_name:data.partner_first_name}));
      },1000);
    }
  }
  var w2=document.querySelector('elevenlabs-convai#pb-el-widget');
  if(w2) w2.setAttribute('agent-id', AGENT_ID);
}
window.checkPhrase=checkPhrase;
})();`;

const tsx = `import { useEffect } from "react";

const PB_STYLES = ${JSON.stringify(styles)};

const PB_BODY = ${JSON.stringify(body)};

const PB_INIT = ${JSON.stringify(PB_INIT)};

export default function PartnerBrief() {
  useEffect(() => {
    document.title = "Partner Brief — AI Readiness Labs";
    let cancelled = false;

    const fonts = document.createElement("link");
    fonts.id = "pb-fonts";
    fonts.rel = "stylesheet";
    fonts.href =
      "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap";
    document.head.appendChild(fonts);

    const style = document.createElement("style");
    style.id = "pb-styles";
    style.textContent = PB_STYLES;
    document.head.appendChild(style);

    const s1 = document.createElement("script");
    s1.id = "pb-supabase";
    s1.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js";
    s1.onerror = () => console.error("Partner Brief: Supabase failed to load.");
    s1.onload = () => {
      if (cancelled) return;
      const s2 = document.createElement("script");
      s2.id = "pb-init";
      s2.textContent = PB_INIT;
      document.body.appendChild(s2);

      const s3 = document.createElement("script");
      s3.id = "pb-elevenlabs";
      s3.src = "https://elevenlabs.io/convai-widget/index.js";
      s3.async = true;
      document.body.appendChild(s3);
    };
    document.body.appendChild(s1);

    return () => {
      cancelled = true;
      ["pb-fonts", "pb-styles", "pb-supabase", "pb-init", "pb-elevenlabs", "pb-badge"].forEach((id) => {
        document.getElementById(id)?.remove();
      });
    };
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: PB_BODY }} />;
}
`;

fs.writeFileSync(path.join(__dirname, "../src/pages/PartnerBrief.tsx"), tsx);
console.log("Wrote PartnerBrief.tsx");
