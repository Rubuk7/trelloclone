import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

const ID = () => `${Date.now().toString(36)}-${Math.random().toString(36).substr(2,8)}`;
const now = () => new Date().toISOString();
const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const fmtDate = d => d ? new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "";
const fmtDateLong = d => d ? new Date(d+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}) : "";
const fmtTime = iso => { try{return new Date(iso).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});}catch{return "";} };
const addDays = (s,n) => { const d=new Date(s+"T12:00:00"); d.setDate(d.getDate()+n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const midDate = (a,b) => { const s=new Date(a+"T12:00:00"),e=new Date(b+"T12:00:00"),m=new Date((s.getTime()+e.getTime())/2); return `${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,"0")}-${String(m.getDate()).padStart(2,"0")}`; };
const daysBetween = (a,b) => Math.round((new Date(b+"T12:00:00")-new Date(a+"T12:00:00"))/86400000);
const log = (who,action,detail="") => ({id:ID(),who,action,detail,at:now()});

// ── Supabase DB helpers ──────────────────────────────────────────────────────
const DB = {
  async getBoards(userId){
    const {data}=await supabase.from("boards").select("*").contains("members",[userId]);
    return data||[];
  },
  async upsertBoard(board){
    const {data,error}=await supabase.from("boards").upsert(board,{onConflict:"id"}).select().single();
    if(error)console.error("upsertBoard",error);
    return data||board;
  },
  async getBoardByInvite(code){
    const {data}=await supabase.from("boards").select("*").eq("invite_code",code).maybeSingle();
    return data||null;
  },
  async getCards(boardId){
    const {data}=await supabase.from("cards").select("*").eq("board_id",boardId);
    return(data||[]).map(r=>({...r.data,id:r.id,board_id:r.board_id}));
  },
  async upsertCard(boardId,card){
    const {error}=await supabase.from("cards").upsert({id:card.id,board_id:boardId,data:card},{onConflict:"id"});
    if(error)console.error("upsertCard",error);
  },
  async deleteCard(cardId){
    const {error}=await supabase.from("cards").delete().eq("id",cardId);
    if(error)console.error("deleteCard",error);
  },
};

const THEMES = {
  dark:{bg:"#0b0e14",sf:"#131720",sf2:"#1a1f2e",bd:"rgba(255,255,255,.07)",bdH:"rgba(255,255,255,.14)",tx:"#e8eaed",txM:"rgba(255,255,255,.45)",txD:"rgba(255,255,255,.25)",ac:"#63d297",acS:"rgba(99,210,151,.12)",wm:"#f5a623",wmS:"rgba(245,166,35,.12)",dg:"#ef5f5f",dgS:"rgba(239,95,95,.1)",bl:"#5ba4f5",blS:"rgba(91,164,245,.1)",ov:"rgba(0,0,0,.65)",cH:"rgba(255,255,255,.07)",iB:"rgba(255,255,255,.04)",sT:"rgba(255,255,255,.12)",cB:"rgba(255,255,255,.015)",cT:"rgba(255,255,255,.05)",cTB:"rgba(255,255,255,.12)",dI:"invert(.6)"},
  light:{bg:"#f4f5f7",sf:"#ffffff",sf2:"#f0f1f4",bd:"rgba(0,0,0,.09)",bdH:"rgba(0,0,0,.16)",tx:"#1a1d24",txM:"rgba(0,0,0,.5)",txD:"rgba(0,0,0,.3)",ac:"#16a06b",acS:"rgba(22,160,107,.1)",wm:"#d48a0a",wmS:"rgba(212,138,10,.1)",dg:"#d94040",dgS:"rgba(217,64,64,.08)",bl:"#2b7de9",blS:"rgba(43,125,233,.08)",ov:"rgba(0,0,0,.35)",cH:"rgba(0,0,0,.04)",iB:"rgba(0,0,0,.03)",sT:"rgba(0,0,0,.12)",cB:"rgba(0,0,0,.02)",cT:"rgba(22,160,107,.06)",cTB:"rgba(22,160,107,.25)",dI:"none"},
};

const css=T=>`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
::-webkit-scrollbar{width:6px;height:6px;}::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:${T.sT};border-radius:3px;}
.pf-cols{display:flex;gap:14px;overflow-x:auto;padding:4px 4px 16px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scroll-behavior:smooth;}
.pf-cols::-webkit-scrollbar{height:4px;}.pf-col{scroll-snap-align:start;flex:0 0 300px;min-width:0;}
@media(max-width:640px){.pf-col{flex:0 0 calc(100vw - 48px);}}
.pf-card{transition:transform .18s,box-shadow .18s;cursor:pointer;}.pf-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.18);}.pf-card:active{transform:scale(.98);}
.pf-btn{transition:all .15s;cursor:pointer;font-family:inherit;}.pf-btn:hover{filter:brightness(1.1);}.pf-btn:active{transform:scale(.96);}
.pf-input{font-family:inherit;outline:none;transition:border-color .2s;}.pf-input:focus{border-color:${T.ac}80!important;}
.pf-fade{animation:pfF .25s ease;}@keyframes pfF{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
.pf-modal{animation:pfM .2s ease;}@keyframes pfM{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
.pf-cell{transition:all .15s;cursor:pointer;}.pf-cell:hover{background:${T.cH}!important;}
input[type="date"]::-webkit-calendar-picker-indicator{filter:${T.dI};}select{appearance:auto;}`;

const DEFCOLS=[{id:"backlog",name:"Backlog",color:"#8b95a5"},{id:"in-progress",name:"In Progress",color:"#5ba4f5"},{id:"packed",name:"Packed",color:"#b07cff"},{id:"shipped",name:"Shipped",color:"#f5a623"},{id:"delivered",name:"Delivered",color:"#63d297"}];

const Ic={
  Board:()=><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  Cal:()=><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Plus:()=><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  X:()=><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Check:()=><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>,
  Clock:()=><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Flag:()=><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
  Trash:()=><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  CL:()=><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>,
  CR:()=><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>,
  Pkg:()=><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  Img:()=><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  Note:()=><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  Edit:()=><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Alert:()=><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Out:()=><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Link:()=><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  Users:()=><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Copy:()=><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  Home:()=><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Sun:()=><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  Moon:()=><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  Hist:()=><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Move:()=><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>,
  Grip:()=><svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" opacity=".25"><circle cx="3" cy="2" r="1.5"/><circle cx="7" cy="2" r="1.5"/><circle cx="3" cy="7" r="1.5"/><circle cx="7" cy="7" r="1.5"/><circle cx="3" cy="12" r="1.5"/><circle cx="7" cy="12" r="1.5"/></svg>,
};

// Shared components
function Ov({children,onClose,T}){return(<div onClick={onClose} style={{position:"fixed",inset:0,background:T.ov,backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16,overflowY:"auto"}}><div className="pf-modal" onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:580,maxHeight:"90vh",overflowY:"auto",borderRadius:20,background:T.sf,border:`1px solid ${T.bd}`,padding:"28px 28px 24px",boxShadow:"0 40px 80px rgba(0,0,0,.4)"}}>{children}</div></div>);}
function Bt({children,v="default",sz="md",T,...p}){const base={borderRadius:10,border:"none",fontWeight:600,fontFamily:"inherit",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6};const szs={sm:{padding:"6px 12px",fontSize:12},md:{padding:"10px 18px",fontSize:14},lg:{padding:"14px 24px",fontSize:15}};const vs={default:{background:T.iB,color:T.tx,border:`1px solid ${T.bd}`},accent:{background:`linear-gradient(135deg,${T.ac},${T.ac}cc)`,color:"#000"},danger:{background:T.dgS,color:T.dg,border:`1px solid ${T.dg}30`},ghost:{background:"transparent",color:T.txM}};return<button className="pf-btn" style={{...base,...szs[sz],...vs[v],...(p.style||{})}} {...p}>{children}</button>;}
function In({T,style:s,...p}){return<input className="pf-input" style={{width:"100%",padding:"12px 14px",borderRadius:10,border:`1px solid ${T.bd}`,background:T.iB,color:T.tx,fontSize:14,fontFamily:"inherit",...s}} {...p}/>;}
function Ta({T,style:s,...p}){return<textarea className="pf-input" style={{width:"100%",padding:"12px 14px",borderRadius:10,border:`1px solid ${T.bd}`,background:T.iB,color:T.tx,fontSize:14,fontFamily:"inherit",resize:"vertical",minHeight:70,...s}} {...p}/>;}
function Lb({children,T}){return<label style={{color:T.txM,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6,display:"block"}}>{children}</label>;}
function ThemeBtn({theme,toggle,T}){return<button onClick={toggle} className="pf-btn" style={{width:34,height:34,borderRadius:9,border:`1px solid ${T.bd}`,background:T.iB,color:T.wm,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{theme==="dark"?<Ic.Sun/>:<Ic.Moon/>}</button>;}

function Changelog({data,T}){
  if(!data||!data.length)return<p style={{color:T.txD,fontSize:12,fontStyle:"italic"}}>No activity yet</p>;
  const sorted=[...data].sort((a,b)=>new Date(b.at)-new Date(a.at));
  return(<div style={{display:"flex",flexDirection:"column"}}>{sorted.slice(0,40).map((e,i)=>(
    <div key={e.id||i} className="pf-fade" style={{display:"flex",gap:10,padding:"8px 0",borderBottom:`1px solid ${T.bd}`}}>
      <div style={{width:24,height:24,borderRadius:7,background:T.acS,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
        {e.action.includes("moved")?<Ic.Move/>:e.action.includes("check")||e.action.includes("calendar")?<Ic.Cal/>:e.action.includes("created")?<Ic.Plus/>:<Ic.Edit/>}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,color:T.tx,lineHeight:1.4}}><span style={{fontWeight:600,color:T.ac}}>{e.who}</span> {e.action}</div>
        {e.detail&&<div style={{fontSize:11,color:T.txD,marginTop:1}}>{e.detail}</div>}
        <div style={{fontSize:10,color:T.txD,marginTop:2}}>{fmtTime(e.at)}</div>
      </div>
    </div>
  ))}</div>);
}

// Auth (Supabase)
function Auth({onLogin,T,theme,toggle}){
  const [mode,setMode]=useState("login");const[email,setEmail]=useState("");const[pw,setPw]=useState("");const[pw2,setPw2]=useState("");const[name,setName]=useState("");const[err,setErr]=useState("");const[msg,setMsg]=useState("");
  const go=async()=>{setErr("");setMsg("");if(!email.trim())return setErr("Email required");
    if(mode==="reset"){if(!email.trim())return setErr("Email required");const{error}=await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(),{redirectTo:window.location.origin});if(error)return setErr(error.message);setMsg("Reset email sent! Check your inbox.");setMode("login");return;}
    if(mode==="signup"){if(!name.trim())return setErr("Name required");if(pw.length<6)return setErr("6+ chars required");if(pw!==pw2)return setErr("Passwords don't match");
      const{data,error}=await supabase.auth.signUp({email:email.toLowerCase().trim(),password:pw,options:{data:{name:name.trim(),avatar:name.trim()[0].toUpperCase(),color:["#63d297","#5ba4f5","#f5a623","#b07cff","#ef5f5f","#e891dc","#45c7d1"][Math.floor(Math.random()*7)],theme:"dark"}}});
      if(error)return setErr(error.message);if(data.user){const meta=data.user.user_metadata;onLogin({id:data.user.id,email:data.user.email,name:meta.name,avatar:meta.avatar,color:meta.color});}}
    else{const{data,error}=await supabase.auth.signInWithPassword({email:email.toLowerCase().trim(),password:pw});
      if(error)return setErr(error.message);const meta=data.user.user_metadata;onLogin({id:data.user.id,email:data.user.email,name:meta.name||data.user.email,avatar:(meta.name||data.user.email)[0].toUpperCase(),color:meta.color||"#63d297"});}
  };
  return(<div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Outfit',sans-serif",padding:20}}>
    <div style={{width:"100%",maxWidth:400,padding:"40px 32px",borderRadius:24,background:T.sf,border:`1px solid ${T.bd}`,boxShadow:"0 40px 80px rgba(0,0,0,.25)",position:"relative"}}>
      <div style={{position:"absolute",top:16,right:16}}><ThemeBtn theme={theme} toggle={toggle} T={T}/></div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}><div style={{width:40,height:40,borderRadius:12,background:`linear-gradient(135deg,${T.ac},${T.ac}aa)`,display:"flex",alignItems:"center",justifyContent:"center"}}><Ic.Pkg/></div><span style={{fontSize:24,fontWeight:800,color:T.tx,fontFamily:"'JetBrains Mono',monospace"}}>PackFlow</span></div>
      <p style={{color:T.txD,fontSize:13,marginBottom:32}}>{mode==="login"?"Sign in":mode==="signup"?"Create account":"Reset password"}</p>
      {mode!=="reset"&&<div style={{display:"flex",marginBottom:24,background:T.iB,borderRadius:10,padding:3}}>{["login","signup"].map(m=><button key={m} onClick={()=>{setMode(m);setErr("");setMsg("");}} className="pf-btn" style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",fontSize:13,fontWeight:600,background:mode===m?T.cH:"transparent",color:mode===m?T.tx:T.txM}}>{m==="login"?"Sign In":"Sign Up"}</button>)}</div>}
      {mode==="signup"&&<In T={T} value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" style={{marginBottom:10}}/>}
      <In T={T} value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" style={{marginBottom:10}}/>
      {mode!=="reset"&&<In T={T} value={pw} onChange={e=>setPw(e.target.value)} placeholder="Password" type="password" style={{marginBottom:mode==="login"?4:10}} onKeyDown={e=>e.key==="Enter"&&mode==="login"&&go()}/>}
      {mode==="signup"&&<In T={T} value={pw2} onChange={e=>setPw2(e.target.value)} placeholder="Confirm password" type="password" style={{marginBottom:4}} onKeyDown={e=>e.key==="Enter"&&go()}/>}
      {mode==="login"&&<button onClick={()=>{setMode("reset");setErr("");}} className="pf-btn" style={{background:"none",border:"none",color:T.ac,fontSize:12,padding:"4px 0",marginBottom:12,display:"block"}}>Forgot password?</button>}
      {mode==="reset"&&<button onClick={()=>{setMode("login");setErr("");}} className="pf-btn" style={{background:"none",border:"none",color:T.ac,fontSize:12,padding:"4px 0",marginBottom:8,display:"block"}}>Back to sign in</button>}
      {err&&<p style={{color:T.dg,fontSize:13,margin:"8px 0"}}>{err}</p>}{msg&&<p style={{color:T.ac,fontSize:13,margin:"8px 0"}}>{msg}</p>}
      <Bt T={T} v="accent" sz="lg" onClick={go} style={{width:"100%",marginTop:12}}>{mode==="login"?"Sign In":mode==="signup"?"Create Account":"Send Reset Email"}</Bt>
    </div>
  </div>);
}

// Board Home

// Board Home
function BHome({user,boards,onSelect,onCreate,onLogout,T,theme,toggle}){
  const[show,setShow]=useState(false);const[nm,setNm]=useState("");const[jc,setJc]=useState("");const[je,setJe]=useState("");
  const mk=()=>{if(!nm.trim())return;onCreate(nm.trim());setNm("");setShow(false);};
  const join=async()=>{setJe("");if(!jc.trim())return setJe("Paste invite code");const b=await DB.getBoardByInvite(jc.trim());if(!b)return setJe("Invalid code");if(!b.members.includes(user.id)){b.members.push(user.id);await DB.upsertBoard(b);}onSelect(b);setJc("");};
  return(<div style={{minHeight:"100vh",background:T.bg,fontFamily:"'Outfit',sans-serif",padding:20}}>
    <div style={{maxWidth:700,margin:"0 auto",paddingTop:40}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:40,flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:40,height:40,borderRadius:12,background:`linear-gradient(135deg,${T.ac},${T.ac}aa)`,display:"flex",alignItems:"center",justifyContent:"center"}}><Ic.Pkg/></div><span style={{fontSize:24,fontWeight:800,color:T.tx,fontFamily:"'JetBrains Mono',monospace"}}>PackFlow</span></div>
        <div style={{display:"flex",alignItems:"center",gap:8}}><ThemeBtn theme={theme} toggle={toggle} T={T}/><div style={{width:32,height:32,borderRadius:8,background:user.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#fff"}}>{user.avatar}</div><span style={{color:T.txM,fontSize:14}}>{user.name}</span><Bt T={T} v="ghost" sz="sm" onClick={onLogout}><Ic.Out/></Bt></div>
      </div>
      <h2 style={{color:T.tx,fontSize:28,fontWeight:700,marginBottom:6}}>Your Boards</h2><p style={{color:T.txM,fontSize:14,marginBottom:28}}>Select a board or create a new one</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:14,marginBottom:32}}>
        {boards.map(b=><div key={b.id} className="pf-card" onClick={()=>onSelect(b)} style={{padding:20,borderRadius:16,background:T.sf,border:`1px solid ${T.bd}`}}><div style={{width:36,height:36,borderRadius:10,background:`linear-gradient(135deg,${b.color||T.ac},${b.color||T.ac}aa)`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12}}><Ic.Board/></div><div style={{fontSize:16,fontWeight:600,color:T.tx,marginBottom:4}}>{b.name}</div><div style={{fontSize:12,color:T.txD}}>{b.members?.length||1} member{(b.members?.length||1)>1?"s":""}</div>{b.ownerId===user.id&&<span style={{display:"inline-block",marginTop:8,padding:"2px 8px",borderRadius:6,background:T.acS,color:T.ac,fontSize:10,fontWeight:700,textTransform:"uppercase"}}>Admin</span>}</div>)}
        <div className="pf-card" onClick={()=>setShow(true)} style={{padding:20,borderRadius:16,border:`2px dashed ${T.bd}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:120}}><div style={{width:40,height:40,borderRadius:12,background:T.iB,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8,color:T.txM}}><Ic.Plus/></div><span style={{color:T.txM,fontSize:14,fontWeight:500}}>New Board</span></div>
      </div>
      <div style={{padding:20,borderRadius:16,background:T.sf,border:`1px solid ${T.bd}`}}><h4 style={{color:T.tx,fontSize:14,fontWeight:600,marginBottom:10,display:"flex",alignItems:"center",gap:6}}><Ic.Link/> Join a Board</h4><div style={{display:"flex",gap:8}}><In T={T} value={jc} onChange={e=>setJc(e.target.value)} placeholder="Paste invite code..." onKeyDown={e=>e.key==="Enter"&&join()} style={{flex:1}}/><Bt T={T} v="accent" onClick={join}>Join</Bt></div>{je&&<p style={{color:T.dg,fontSize:12,marginTop:6}}>{je}</p>}</div>
      {show&&<Ov T={T} onClose={()=>setShow(false)}><h3 style={{color:T.tx,fontSize:18,fontWeight:700,marginBottom:16}}>Create New Board</h3><In T={T} value={nm} onChange={e=>setNm(e.target.value)} placeholder="Board name..." autoFocus onKeyDown={e=>e.key==="Enter"&&mk()}/><div style={{display:"flex",gap:8,marginTop:16,justifyContent:"flex-end"}}><Bt T={T} onClick={()=>setShow(false)}>Cancel</Bt><Bt T={T} v="accent" onClick={mk}>Create</Bt></div></Ov>}
    </div>
  </div>);
}

// Card Modal with Changelog tab
function CardMod({card,onClose,onUpdate,onDelete,users,columns,T,userName}){
  const[c,setC]=useState({...card});const[imgUrl,setImgUrl]=useState("");const[tab,setTab]=useState("details");
  const save=()=>{
    const logs=[...(c.changelog||[])];
    if(c.title!==card.title)logs.push(log(userName,"updated title",`"${card.title}" → "${c.title}"`));
    if(c.notes!==card.notes)logs.push(log(userName,"updated notes"));
    if(c.assignee!==card.assignee)logs.push(log(userName,"changed assignee",`${card.assignee||"None"} → ${c.assignee||"None"}`));
    if(c.column!==card.column){const f=columns.find(x=>x.id===card.column)?.name||card.column;const t=columns.find(x=>x.id===c.column)?.name||c.column;logs.push(log(userName,"moved card",`${f} → ${t}`));}
    if(c.dueDate!==card.dueDate)logs.push(log(userName,"updated due date",`${fmtDate(card.dueDate)||"none"} → ${fmtDate(c.dueDate)||"none"}`));
    if(c.createdDate!==card.createdDate)logs.push(log(userName,"updated created date"));
    if(JSON.stringify(c.tags)!==JSON.stringify(card.tags))logs.push(log(userName,"updated tags"));
    if(JSON.stringify(c.images)!==JSON.stringify(card.images))logs.push(log(userName,"updated images"));
    onUpdate({...c,changelog:logs});onClose();
  };
  const addImg=()=>{if(!imgUrl.trim())return;setC({...c,images:[...(c.images||[]),imgUrl.trim()]});setImgUrl("");};
  const rmImg=i=>setC({...c,images:(c.images||[]).filter((_,x)=>x!==i)});
  return(
    <Ov T={T} onClose={onClose}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",marginBottom:16,gap:12}}>
        <input value={c.title} onChange={e=>setC({...c,title:e.target.value})} style={{flex:1,fontSize:20,fontWeight:700,background:"transparent",border:"none",color:T.tx,outline:"none",fontFamily:"'Outfit',sans-serif",padding:0}}/>
        <div style={{display:"flex",gap:6,flexShrink:0}}><Bt T={T} v="danger" sz="sm" onClick={()=>{onDelete(card.id);onClose();}}><Ic.Trash/></Bt><Bt T={T} sz="sm" onClick={onClose}><Ic.X/></Bt></div>
      </div>
      <div style={{display:"flex",marginBottom:16,background:T.iB,borderRadius:10,padding:3}}>
        {[{k:"details",l:"Details",ic:<Ic.Edit/>},{k:"log",l:"Activity",ic:<Ic.Hist/>}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} className="pf-btn" style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:5,padding:"7px 0",borderRadius:8,border:"none",fontSize:12,fontWeight:600,background:tab===t.k?T.cH:"transparent",color:tab===t.k?T.tx:T.txM}}>
            {t.ic}{t.l}{t.k==="log"&&<span style={{fontSize:10,opacity:.6}}>({(c.changelog||[]).length})</span>}
          </button>
        ))}
      </div>
      {tab==="details"?(<div>
        <div style={{marginBottom:14}}><Lb T={T}>Images</Lb><div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>{(c.images||[]).map((img,i)=><div key={i} style={{position:"relative",width:100,height:72,borderRadius:10,overflow:"hidden",border:`1px solid ${T.bd}`}}><img src={img} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>{e.target.src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='120' fill='%23333'%3E%3Crect width='200' height='120'/%3E%3C/svg%3E";}}/><button onClick={()=>rmImg(i)} style={{position:"absolute",top:2,right:2,width:20,height:20,borderRadius:6,background:"rgba(0,0,0,.7)",border:"none",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Ic.X/></button></div>)}</div><div style={{display:"flex",gap:6}}><In T={T} value={imgUrl} onChange={e=>setImgUrl(e.target.value)} placeholder="Paste image URL..." style={{flex:1,padding:"8px 12px",fontSize:13}} onKeyDown={e=>e.key==="Enter"&&addImg()}/><Bt T={T} sz="sm" onClick={addImg}><Ic.Img/></Bt></div></div>
        <div style={{marginBottom:14}}><Lb T={T}>Notes</Lb><Ta T={T} value={c.notes||""} onChange={e=>setC({...c,notes:e.target.value})} placeholder="Add notes..."/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <div><Lb T={T}>Assignee</Lb><select value={c.assignee||""} onChange={e=>setC({...c,assignee:e.target.value})} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1px solid ${T.bd}`,background:T.iB,color:T.tx,fontSize:14,fontFamily:"inherit"}}><option value="">Unassigned</option>{users.map(u=><option key={u.id} value={u.name}>{u.name}</option>)}</select></div>
          <div><Lb T={T}>Column</Lb><select value={c.column} onChange={e=>setC({...c,column:e.target.value})} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1px solid ${T.bd}`,background:T.iB,color:T.tx,fontSize:14,fontFamily:"inherit"}}>{columns.map(col=><option key={col.id} value={col.id}>{col.name}</option>)}</select></div>
          <div><Lb T={T}>Created</Lb><In T={T} type="date" value={c.createdDate||""} onChange={e=>setC({...c,createdDate:e.target.value})} style={{padding:"10px 12px"}}/></div>
          <div><Lb T={T}>Due Date</Lb><In T={T} type="date" value={c.dueDate||""} onChange={e=>setC({...c,dueDate:e.target.value})} style={{padding:"10px 12px"}}/></div>
          <div style={{gridColumn:"1/-1"}}><Lb T={T}>Tags</Lb><In T={T} value={(c.tags||[]).join(", ")} onChange={e=>setC({...c,tags:e.target.value.split(",").map(t=>t.trim()).filter(Boolean)})} placeholder="e.g. fragile, express"/></div>
        </div>
        {c.dueDate&&c.createdDate&&<div style={{padding:12,borderRadius:10,background:T.acS,border:`1px solid ${T.ac}25`,marginBottom:14}}><p style={{color:T.ac,fontSize:11,fontWeight:700,textTransform:"uppercase",margin:"0 0 4px"}}>Auto Checkpoints</p><p style={{color:T.txM,fontSize:12,margin:0}}>CP1: {fmtDate(midDate(c.createdDate,c.dueDate))} &middot; CP2: {fmtDate(addDays(c.dueDate,-1))} &middot; Due: {fmtDate(c.dueDate)}</p></div>}
        <Bt T={T} v="accent" sz="lg" onClick={save} style={{width:"100%"}}>Save Changes</Bt>
      </div>):(<div style={{minHeight:100}}><Changelog data={c.changelog} T={T}/></div>)}
    </Ov>
  );
}

// Quick Add, Edit Column, Board Settings, KCard, KColumn, CalView — and Main App
function QuickAdd({column,columns,onClose,onAdd,T,userName}){
  const[title,setTitle]=useState("");const[dd,setDd]=useState("");const[cd,setCd]=useState(today());const co=columns.find(c=>c.id===column);
  const go=()=>{if(!title.trim())return;const card={id:ID(),title:title.trim(),notes:"",dueDate:dd,createdDate:cd,column,tags:[],assignee:"",images:[],checkpoints:{},changelog:[log(userName,"created card",`in ${co?.name||column}`)]};
    if(dd&&cd){const cp1=midDate(cd,dd);const cp2d=daysBetween(cd,dd)>1?addDays(dd,-1):dd;card.checkpoints={cp1:{date:cp1,originalDate:cp1,checked:false,delayed:false,label:"Checkpoint 1 — Midway Review"},cp2:{date:cp2d,originalDate:cp2d,checked:false,delayed:false,label:"Checkpoint 2 — Pre-Delivery"},delivery:{date:dd,checked:false,delayed:false,label:"Delivery Due"}};card.changelog.push(log(userName,"set checkpoints",`CP1: ${fmtDate(cp1)}, CP2: ${fmtDate(cp2d)}, Due: ${fmtDate(dd)}`));}
    onAdd(card);onClose();};
  return(<Ov T={T} onClose={onClose}><h3 style={{color:T.tx,fontSize:18,fontWeight:700,marginBottom:4}}>New Card</h3><p style={{color:T.txM,fontSize:13,marginBottom:20}}>Adding to <span style={{color:co?.color||T.ac,fontWeight:600}}>{co?.name||column}</span></p>
    <In T={T} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Card title..." autoFocus style={{marginBottom:12}} onKeyDown={e=>e.key==="Enter"&&go()}/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}><div><Lb T={T}>Created</Lb><In T={T} type="date" value={cd} onChange={e=>setCd(e.target.value)} style={{padding:"10px 12px"}}/></div><div><Lb T={T}>Due Date</Lb><In T={T} type="date" value={dd} onChange={e=>setDd(e.target.value)} style={{padding:"10px 12px"}}/></div></div>
    {dd&&cd&&<div style={{padding:10,borderRadius:8,background:T.acS,marginBottom:16}}><p style={{color:T.ac,fontSize:11,fontWeight:600,margin:0}}>Checkpoints: {fmtDate(midDate(cd,dd))} &middot; {fmtDate(daysBetween(cd,dd)>1?addDays(dd,-1):dd)} &middot; {fmtDate(dd)}</p></div>}
    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Bt T={T} onClick={onClose}>Cancel</Bt><Bt T={T} v="accent" onClick={go}>Add Card</Bt></div>
  </Ov>);
}

function EditCol({column,onClose,onSave,onDelete,T}){const[nm,setNm]=useState(column.name);const[cl,setCl]=useState(column.color);const cls=["#8b95a5","#5ba4f5","#b07cff","#f5a623","#63d297","#ef5f5f","#e891dc","#45c7d1","#f59b42","#ff7eb3"];
  return(<Ov T={T} onClose={onClose}><h3 style={{color:T.tx,fontSize:18,fontWeight:700,marginBottom:16}}>Edit List</h3><In T={T} value={nm} onChange={e=>setNm(e.target.value)} placeholder="List name..." style={{marginBottom:14}}/><Lb T={T}>Color</Lb><div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>{cls.map(c=><div key={c} onClick={()=>setCl(c)} style={{width:28,height:28,borderRadius:8,background:c,cursor:"pointer",border:cl===c?`3px solid ${T.tx}`:"3px solid transparent"}}/>)}</div>
    <div style={{display:"flex",gap:8,justifyContent:"space-between"}}><Bt T={T} v="danger" sz="sm" onClick={()=>{onDelete(column.id);onClose();}}><Ic.Trash/> Delete</Bt><div style={{display:"flex",gap:8}}><Bt T={T} onClick={onClose}>Cancel</Bt><Bt T={T} v="accent" onClick={()=>{onSave({...column,name:nm,color:cl});onClose();}}>Save</Bt></div></div>
  </Ov>);
}

function BSett({board,user,onClose,onUpdate,allUsers,T}){const[cp,setCp]=useState(false);const isA=board.ownerId===user.id;const mems=allUsers.filter(u=>board.members?.includes(u.id));
  const copy=()=>{if(navigator.clipboard)navigator.clipboard.writeText(board.inviteCode||"");setCp(true);setTimeout(()=>setCp(false),2000);};
  return(<Ov T={T} onClose={onClose}><h3 style={{color:T.tx,fontSize:18,fontWeight:700,marginBottom:20}}>Board Settings</h3>
    {isA&&<div><div style={{marginBottom:20}}><Lb T={T}>Invite Code</Lb><div style={{display:"flex",gap:8,alignItems:"center"}}><div style={{flex:1,padding:"10px 14px",borderRadius:10,background:T.iB,border:`1px solid ${T.bd}`,color:T.tx,fontSize:14,fontFamily:"'JetBrains Mono',monospace",wordBreak:"break-all"}}>{board.inviteCode||"—"}</div><Bt T={T} sz="sm" onClick={copy}>{cp?<span><Ic.Check/> Copied</span>:<span><Ic.Copy/> Copy</span>}</Bt></div><p style={{color:T.txD,fontSize:11,marginTop:6}}>Share to let others join.</p></div>
    <div style={{marginBottom:20}}><Lb T={T}><span style={{display:"flex",alignItems:"center",gap:6}}><Ic.Users/> Members ({mems.length})</span></Lb>{mems.map(m=><div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:8,background:T.iB,marginBottom:4}}><div style={{width:28,height:28,borderRadius:7,background:m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff"}}>{m.avatar}</div><span style={{flex:1,color:T.tx,fontSize:14}}>{m.name}</span>{m.id===board.ownerId&&<span style={{fontSize:10,fontWeight:700,color:T.ac,textTransform:"uppercase"}}>Admin</span>}{m.id!==board.ownerId&&isA&&<Bt T={T} v="ghost" sz="sm" onClick={()=>onUpdate({...board,members:board.members.filter(x=>x!==m.id)})} style={{padding:"4px 8px"}}><Ic.X/></Bt>}</div>)}</div></div>}
    <Bt T={T} onClick={onClose} style={{width:"100%"}}>Close</Bt>
  </Ov>);
}

function KCard({card,onOpen,T}){const od=card.dueDate&&card.dueDate<today();const hi=(card.images||[]).length>0;const lc=(card.changelog||[]).length;
  return(<div className="pf-card pf-fade" onClick={()=>onOpen(card)} draggable onDragStart={e=>{e.dataTransfer.setData("text/plain",card.id);e.dataTransfer.effectAllowed="move";}} style={{padding:0,borderRadius:14,background:T.sf2,border:`1px solid ${T.bd}`,overflow:"hidden",marginBottom:10}}>
    {hi&&<div style={{width:"100%",height:110,overflow:"hidden",position:"relative"}}><img src={card.images[0]} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>{e.target.style.display="none";}}/>{card.images.length>1&&<span style={{position:"absolute",bottom:6,right:6,padding:"2px 7px",borderRadius:6,background:"rgba(0,0,0,.7)",color:"#fff",fontSize:10,fontWeight:600}}>+{card.images.length-1}</span>}</div>}
    <div style={{padding:"12px 14px 14px"}}><div style={{display:"flex",alignItems:"start",gap:6,marginBottom:6}}><Ic.Grip/><span style={{fontSize:14,fontWeight:600,color:T.tx,lineHeight:1.3,flex:1}}>{card.title}</span></div>
      {card.notes&&<p style={{color:T.txM,fontSize:12,marginBottom:8,lineHeight:1.4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden",paddingLeft:16}}>{card.notes}</p>}
      {(card.tags||[]).length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8,paddingLeft:16}}>{card.tags.map(t=><span key={t} style={{padding:"2px 7px",borderRadius:5,background:T.iB,color:T.txM,fontSize:10,fontWeight:600}}>{t}</span>)}</div>}
      <div style={{display:"flex",alignItems:"center",gap:8,paddingLeft:16,flexWrap:"wrap"}}>
        {card.dueDate&&<span style={{display:"flex",alignItems:"center",gap:3,fontSize:11,color:od?T.dg:T.txM,fontWeight:od?600:400}}>{od&&<Ic.Alert/>}<Ic.Clock/> {fmtDate(card.dueDate)}</span>}
        {card.notes&&<span style={{color:T.txD}}><Ic.Note/></span>}
        {hi&&<span style={{color:T.txD,display:"flex",alignItems:"center",gap:2,fontSize:11}}><Ic.Img/> {card.images.length}</span>}
        {lc>0&&<span style={{color:T.txD,display:"flex",alignItems:"center",gap:2,fontSize:11}}><Ic.Hist/> {lc}</span>}
        {card.assignee&&<span style={{marginLeft:"auto",width:24,height:24,borderRadius:7,background:T.ac,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#000"}}>{card.assignee[0]}</span>}
      </div>
    </div>
  </div>);
}

function KCol({col,cards,onCardOpen,onAddCard,onDrop,onEditCol,T}){const[ov,setOv]=useState(false);
  return(<div className="pf-col" onDragOver={e=>{e.preventDefault();setOv(true);}} onDragLeave={()=>setOv(false)} onDrop={e=>{e.preventDefault();setOv(false);const id=e.dataTransfer.getData("text/plain");if(id)onDrop(id,col.id);}}
    style={{display:"flex",flexDirection:"column",maxHeight:"calc(100vh - 140px)",background:ov?T.cH:"transparent",borderRadius:14,border:`1px solid ${ov?T.bdH:T.bd}`,padding:10,transition:"all .2s"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,padding:"2px 4px",flexShrink:0}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:3,background:col.color}}/><span style={{fontSize:12,fontWeight:700,color:T.txM,textTransform:"uppercase",letterSpacing:".8px"}}>{col.name}</span><span style={{width:20,height:20,borderRadius:6,background:T.iB,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:T.txD,fontWeight:600}}>{cards.length}</span></div>
      <div style={{display:"flex",gap:4}}><button onClick={()=>onEditCol(col)} className="pf-btn" style={{width:26,height:26,borderRadius:7,border:`1px solid ${T.bd}`,background:"transparent",color:T.txD,display:"flex",alignItems:"center",justifyContent:"center"}}><Ic.Edit/></button><button onClick={onAddCard} className="pf-btn" style={{width:26,height:26,borderRadius:7,border:`1px solid ${T.bd}`,background:"transparent",color:T.txD,display:"flex",alignItems:"center",justifyContent:"center"}}><Ic.Plus/></button></div>
    </div>
    <div style={{flex:1,overflowY:"auto",minHeight:0,paddingBottom:4}}>{cards.map(card=><KCard key={card.id} card={card} onOpen={onCardOpen} T={T}/>)}</div>
  </div>);
}

function CalView({cards,onToggleCP,onCardOpen,T}){
  const[cur,setCur]=useState(new Date());const[sel,setSel]=useState(null);
  const yr=cur.getFullYear(),mo=cur.getMonth();const fd=new Date(yr,mo,1).getDay();const dim=new Date(yr,mo+1,0).getDate();
  const mn=cur.toLocaleDateString("en-US",{month:"long",year:"numeric"});
  const days=[...Array(fd).fill(null),...Array.from({length:dim},(_,i)=>i+1)];
  const ds=d=>`${yr}-${String(mo+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;const td=today();
  const ev=useCallback(s=>{const r=[];cards.forEach(c=>{if(!c.checkpoints)return;Object.entries(c.checkpoints).forEach(([k,cp])=>{if(cp.date===s&&!cp.checked)r.push({card:c,cpKey:k,cp,type:k==="delivery"?"delivery":"checkpoint"});});});return r;},[cards]);
  const se=sel?ev(sel):[];const ce=sel?cards.flatMap(c=>{if(!c.checkpoints)return[];return Object.entries(c.checkpoints).filter(([_,cp])=>cp.date===sel&&cp.checked).map(([k,cp])=>({card:c,cpKey:k,cp,type:k==="delivery"?"delivery":"checkpoint"}));}):[];
  return(<div style={{display:"flex",gap:20,height:"100%",minHeight:0,flexWrap:"wrap"}}>
    <div style={{flex:"1 1 400px",minWidth:0}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <button onClick={()=>setCur(new Date(yr,mo-1,1))} className="pf-btn" style={{width:36,height:36,borderRadius:10,border:`1px solid ${T.bd}`,background:"transparent",color:T.tx}}><Ic.CL/></button>
        <h2 style={{color:T.tx,fontSize:20,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",margin:0}}>{mn}</h2>
        <button onClick={()=>setCur(new Date(yr,mo+1,1))} className="pf-btn" style={{width:36,height:36,borderRadius:10,border:`1px solid ${T.bd}`,background:"transparent",color:T.tx}}><Ic.CR/></button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
        {["S","M","T","W","T","F","S"].map((d,i)=><div key={i} style={{padding:"6px 0",textAlign:"center",color:T.txD,fontSize:11,fontWeight:700}}>{d}</div>)}
        {days.map((d,i)=>{if(!d)return<div key={`e${i}`}/>;const s=ds(d);const e=ev(s);const it=s===td;const is=s===sel;const hd=e.some(x=>x.type==="delivery");const hl=e.some(x=>x.cp.delayed);const hc=e.some(x=>x.type==="checkpoint");
          return<div key={d} className="pf-cell" onClick={()=>setSel(s)} style={{minHeight:56,padding:5,borderRadius:8,background:is?T.acS:it?T.cT:T.cB,border:is?`2px solid ${T.ac}`:it?`1px solid ${T.cTB}`:"1px solid transparent"}}><div style={{fontSize:12,fontWeight:it?700:400,color:it?T.ac:T.txM,marginBottom:3}}>{d}</div><div style={{display:"flex",flexDirection:"column",gap:2}}>{hc&&<div style={{height:3,borderRadius:2,background:hl?T.dg:T.bl}}/>}{hd&&<div style={{height:3,borderRadius:2,background:T.wm}}/>}{e.length>2&&<span style={{fontSize:9,color:T.txD}}>+{e.length-2}</span>}</div></div>;})}
      </div>
      <div style={{display:"flex",gap:16,marginTop:12,padding:"10px 12px",borderRadius:8,background:T.cB}}>{[{c:T.bl,l:"Checkpoint"},{c:T.dg,l:"Delayed"},{c:T.wm,l:"Delivery"}].map(x=><div key={x.l} style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:10,height:3,borderRadius:2,background:x.c}}/><span style={{fontSize:11,color:T.txD}}>{x.l}</span></div>)}</div>
    </div>
    <div style={{flex:"0 0 320px",minWidth:280,borderRadius:14,background:T.cB,border:`1px solid ${T.bd}`,padding:16,overflowY:"auto",maxHeight:"calc(100vh - 160px)"}}>
      {sel?(<div className="pf-fade"><h3 style={{color:T.tx,fontSize:16,fontWeight:700,margin:"0 0 2px",fontFamily:"'JetBrains Mono',monospace"}}>{fmtDateLong(sel)}</h3><p style={{color:T.txD,fontSize:12,marginBottom:16}}>{se.length} pending</p>
        {se.filter(e=>e.type==="checkpoint").length>0&&<div style={{marginBottom:16}}><h4 style={{color:T.bl,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}><Ic.Flag/> Checkpoints</h4>{se.filter(e=>e.type==="checkpoint").map(({card,cpKey,cp})=><div key={`${card.id}-${cpKey}`} className="pf-fade" style={{padding:10,borderRadius:10,background:cp.delayed?T.dgS:T.blS,border:`1px solid ${cp.delayed?T.dg+"25":T.bl+"20"}`,marginBottom:6}}><div style={{display:"flex",alignItems:"start",gap:8}}><div onClick={()=>onToggleCP(card.id,cpKey)} className="pf-btn" style={{width:20,height:20,borderRadius:6,border:`2px solid ${T.txD}`,background:"transparent",flexShrink:0,marginTop:1,display:"flex",alignItems:"center",justifyContent:"center",padding:0}}/><div style={{flex:1,minWidth:0}}><span style={{fontSize:13,fontWeight:600,color:T.tx,cursor:"pointer"}} onClick={()=>onCardOpen(card)}>{card.title}</span><span style={{display:"block",fontSize:11,color:cp.delayed?T.dg:T.txM,marginTop:2}}>{cp.delayed&&<Ic.Alert/>} {cp.label}{cp.delayed?" (Delayed)":""}</span></div></div></div>)}</div>}
        {se.filter(e=>e.type==="delivery").length>0&&<div style={{marginBottom:16}}><h4 style={{color:T.wm,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}><Ic.Pkg/> Deliveries</h4>{se.filter(e=>e.type==="delivery").map(({card,cpKey,cp})=><div key={`${card.id}-${cpKey}`} className="pf-fade" style={{padding:10,borderRadius:10,background:T.wmS,border:`1px solid ${T.wm}20`,marginBottom:6}}><div style={{display:"flex",alignItems:"start",gap:8}}><div onClick={()=>onToggleCP(card.id,cpKey)} className="pf-btn" style={{width:20,height:20,borderRadius:6,border:`2px solid ${T.txD}`,background:"transparent",flexShrink:0,marginTop:1,display:"flex",alignItems:"center",justifyContent:"center",padding:0}}/><div><span style={{fontSize:13,fontWeight:600,color:T.tx,cursor:"pointer"}} onClick={()=>onCardOpen(card)}>{card.title}</span><div style={{fontSize:11,color:T.txM,marginTop:2}}>{cp.label}</div></div></div></div>)}</div>}
        {ce.length>0&&<div><h4 style={{color:T.txD,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}><Ic.Check/> Completed</h4>{ce.map(({card,cpKey,cp})=><div key={`${card.id}-${cpKey}-d`} style={{padding:8,borderRadius:8,background:T.cB,marginBottom:4,opacity:.5}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:18,height:18,borderRadius:5,background:T.acS,display:"flex",alignItems:"center",justifyContent:"center"}}><Ic.Check/></div><span style={{fontSize:12,color:T.txD,textDecoration:"line-through"}}>{card.title} — {cp.label}</span></div></div>)}</div>}
        {se.length===0&&ce.length===0&&<div style={{textAlign:"center",padding:"32px 16px"}}><p style={{color:T.txD,fontSize:13}}>Nothing scheduled</p></div>}
      </div>):(<div style={{textAlign:"center",padding:"48px 16px",color:T.txD}}><Ic.Cal/><p style={{marginTop:10,fontSize:13}}>Select a day</p></div>)}
    </div>
  </div>);
}

// ═══ MAIN APP ═══
export default function PackFlow(){
  const[theme,setTheme]=useState("dark");const[user,setUser]=useState(null);const[boards,setBoards]=useState([]);const[ab,setAb]=useState(null);const[cards,setCards]=useState([]);const[view,setView]=useState("board");const[selCard,setSelCard]=useState(null);const[addCol,setAddCol]=useState(null);const[editCol,setEditCol]=useState(null);const[showSett,setShowSett]=useState(false);const[showAddCol,setShowAddCol]=useState(false);const[newColNm,setNewColNm]=useState("");const[allUsers,setAllUsers]=useState([]);const[loading,setLoading]=useState(true);const sRef=useRef(null);
  const T=THEMES[theme];
  const toggle=async()=>{const n=theme==="dark"?"light":"dark";setTheme(n);await supabase.auth.updateUser({data:{theme:n}});};

  // ── Init: restore session ──
  useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(session){
        const meta=session.user.user_metadata;
        const u={id:session.user.id,email:session.user.email,name:meta.name||session.user.email,avatar:(meta.name||session.user.email)[0].toUpperCase(),color:meta.color||"#63d297"};
        setUser(u);
        if(meta.theme)setTheme(meta.theme);
      }
      setLoading(false);
    });
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      if(!session){setUser(null);setAb(null);setCards([]);}
    });
    return()=>subscription.unsubscribe();
  },[]);

  // ── Load boards when user changes ──
  useEffect(()=>{
    if(!user)return;
    (async()=>{
      const bs=await DB.getBoards(user.id);
      setBoards(bs);
      // Build allUsers list from board members (best-effort from metadata)
      setAllUsers([user]);
    })();
  },[user]);

  // ── Load cards when active board changes ──
  useEffect(()=>{
    if(!ab){setCards([]);return;}
    (async()=>{
      const raw=await DB.getCards(ab.id);
      setCards(pDel(raw));
    })();
  },[ab]);

  // ── Debounced card save ──
  useEffect(()=>{
    if(!ab||cards.length===0)return;
    if(sRef.current)clearTimeout(sRef.current);
    sRef.current=setTimeout(()=>{
      cards.forEach(c=>DB.upsertCard(ab.id,c));
    },600);
    return()=>{if(sRef.current)clearTimeout(sRef.current);};
  },[cards,ab]);

  const svBoard=useCallback(async b=>{
    const saved=await DB.upsertBoard(b);
    const updated=saved||b;
    setAb(updated);
    setBoards(prev=>prev.map(x=>x.id===updated.id?updated:x));
  },[]);

  const pDel=data=>{const td2=today();return data.map(c=>{if(!c.checkpoints)return c;const cp={...c.checkpoints};let ch=false;Object.entries(cp).forEach(([k,v])=>{if(!v.checked&&v.date<td2){cp[k]={...v,date:td2,delayed:true};ch=true;}});return ch?{...c,checkpoints:cp}:c;});};

  const login=async u=>{
    setUser(u);
    const bs=await DB.getBoards(u.id);
    setBoards(bs);
    setAllUsers([u]);
  };

  const logout=async()=>{
    await supabase.auth.signOut();
    setUser(null);setAb(null);setCards([]);setBoards([]);
  };

  const mkBoard=async nm=>{
    const b={id:ID(),name:nm,owner_id:user.id,members:[user.id],columns:DEFCOLS.map(c=>({...c,id:ID()})),color:["#63d297","#5ba4f5","#f5a623","#b07cff","#ef5f5f"][Math.floor(Math.random()*5)],invite_code:ID().toUpperCase().substr(0,8),created_at:Date.now()};
    const saved=await DB.upsertBoard(b);
    const board=saved||b;
    setBoards(prev=>[...prev,board]);
    setAb(board);
  };

  const selBoard=async b=>{
    const bs=await DB.getBoards(user.id);
    const fresh=bs.find(x=>x.id===b.id)||b;
    setAb(fresh);
  };

  const addColFn=()=>{if(!newColNm.trim()||!ab)return;const cls=["#8b95a5","#5ba4f5","#b07cff","#f5a623","#63d297","#ef5f5f","#e891dc","#45c7d1"];svBoard({...ab,columns:[...ab.columns,{id:ID(),name:newColNm.trim(),color:cls[Math.floor(Math.random()*cls.length)]}]});setNewColNm("");setShowAddCol(false);};
  const updCol=col=>{if(!ab)return;svBoard({...ab,columns:ab.columns.map(c=>c.id===col.id?col:c)});};
  const delCol=cid=>{if(!ab)return;const u={...ab,columns:ab.columns.filter(c=>c.id!==cid)};svBoard(u);if(u.columns.length>0)setCards(prev=>prev.map(c=>c.column===cid?{...c,column:u.columns[0].id}:c));};
  const addCard=card=>{setCards(prev=>[...prev,card]);if(ab)DB.upsertCard(ab.id,card);};
  const updCard=u=>{if(u.dueDate&&u.createdDate){const cp1=midDate(u.createdDate,u.dueDate);const cp2d=daysBetween(u.createdDate,u.dueDate)>1?addDays(u.dueDate,-1):u.dueDate;const ex=u.checkpoints||{};u.checkpoints={cp1:{...(ex.cp1||{}),date:ex.cp1?.checked?ex.cp1.date:cp1,originalDate:cp1,label:"Checkpoint 1 — Midway Review",checked:ex.cp1?.checked||false,delayed:ex.cp1?.delayed||false},cp2:{...(ex.cp2||{}),date:ex.cp2?.checked?ex.cp2.date:cp2d,originalDate:cp2d,label:"Checkpoint 2 — Pre-Delivery",checked:ex.cp2?.checked||false,delayed:ex.cp2?.delayed||false},delivery:{...(ex.delivery||{}),date:u.dueDate,label:"Delivery Due",checked:ex.delivery?.checked||false,delayed:ex.delivery?.delayed||false}};}setCards(prev=>prev.map(c=>c.id===u.id?u:c));if(ab)DB.upsertCard(ab.id,u);};
  const delCard=id=>{setCards(prev=>prev.filter(c=>c.id!==id));DB.deleteCard(id);};
  const moveCard=(cid,nc)=>{setCards(prev=>prev.map(c=>{if(c.id!==cid)return c;const f=ab.columns.find(x=>x.id===c.column);const t=ab.columns.find(x=>x.id===nc);const updated={...c,column:nc,changelog:[...(c.changelog||[]),log(user?.name||"?","moved card",`${f?.name||c.column} → ${t?.name||nc}`)]};if(ab)DB.upsertCard(ab.id,updated);return updated;}));};
  const togCP=(cid,cpk)=>{setCards(prev=>prev.map(c=>{if(c.id!==cid||!c.checkpoints?.[cpk])return c;const w=c.checkpoints[cpk].checked;const updated={...c,changelog:[...(c.changelog||[]),log(user?.name||"?",w?"unchecked checkpoint":"checked checkpoint",c.checkpoints[cpk].label)],checkpoints:{...c.checkpoints,[cpk]:{...c.checkpoints[cpk],checked:!w}}};if(ab)DB.upsertCard(ab.id,updated);return updated;}));};

  if(loading)return<div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Outfit',sans-serif"}}><style>{css(T)}</style><p style={{color:T.txD,fontFamily:"'JetBrains Mono',monospace"}}>Loading...</p></div>;
  if(!user)return<div><style>{css(T)}</style><Auth onLogin={login} T={T} theme={theme} toggle={toggle}/></div>;
  if(!ab)return<div><style>{css(T)}</style><BHome user={user} boards={boards} onSelect={selBoard} onCreate={mkBoard} onLogout={logout} T={T} theme={theme} toggle={toggle}/></div>;
  const cols=ab.columns||[];
  return(<div style={{minHeight:"100vh",background:T.bg,fontFamily:"'Outfit',sans-serif",display:"flex",flexDirection:"column",transition:"background .3s"}}><style>{css(T)}</style>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",borderBottom:`1px solid ${T.bd}`,background:T.sf,backdropFilter:"blur(20px)",flexShrink:0,gap:8,flexWrap:"wrap"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}><button onClick={()=>setAb(null)} className="pf-btn" style={{width:34,height:34,borderRadius:9,border:`1px solid ${T.bd}`,background:"transparent",color:T.txM,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Ic.Home/></button><div style={{width:6,height:6,borderRadius:2,background:ab.color||T.ac,flexShrink:0}}/><span style={{fontSize:16,fontWeight:700,color:T.tx,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ab.name}</span></div>
      <div style={{display:"flex",gap:3,background:T.iB,borderRadius:10,padding:3}}>{[{k:"board",ic:<Ic.Board/>,l:"Board"},{k:"calendar",ic:<Ic.Cal/>,l:"Calendar"}].map(t=><button key={t.k} onClick={()=>setView(t.k)} className="pf-btn" style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:8,border:"none",fontSize:13,fontWeight:600,background:view===t.k?T.cH:"transparent",color:view===t.k?T.tx:T.txM}}>{t.ic}{t.l}</button>)}</div>
      <div style={{display:"flex",alignItems:"center",gap:8}}><ThemeBtn theme={theme} toggle={toggle} T={T}/><button onClick={()=>setShowSett(true)} className="pf-btn" style={{width:34,height:34,borderRadius:9,border:`1px solid ${T.bd}`,background:"transparent",color:T.txM,display:"flex",alignItems:"center",justifyContent:"center"}}><Ic.Users/></button><div style={{width:30,height:30,borderRadius:8,background:user.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff"}}>{user.avatar}</div><button onClick={logout} className="pf-btn" style={{width:34,height:34,borderRadius:9,border:`1px solid ${T.bd}`,background:"transparent",color:T.txM,display:"flex",alignItems:"center",justifyContent:"center"}}><Ic.Out/></button></div>
    </div>
    <div style={{flex:1,padding:"12px 12px 0",overflow:"hidden",display:"flex",flexDirection:"column",minHeight:0}}>
      {view==="board"?(<div className="pf-cols" style={{flex:1,minHeight:0,alignItems:"stretch"}}>{cols.map(col=><KCol key={col.id} col={col} cards={cards.filter(c=>c.column===col.id)} onCardOpen={setSelCard} onAddCard={()=>setAddCol(col.id)} onDrop={moveCard} onEditCol={setEditCol} T={T}/>)}<div className="pf-col" style={{display:"flex",alignItems:"start",paddingTop:6}}>{showAddCol?(<div className="pf-fade" style={{padding:12,borderRadius:14,background:T.sf,border:`1px solid ${T.bd}`,width:"100%"}}><In T={T} value={newColNm} onChange={e=>setNewColNm(e.target.value)} placeholder="List name..." autoFocus onKeyDown={e=>{if(e.key==="Enter")addColFn();if(e.key==="Escape")setShowAddCol(false);}}/><div style={{display:"flex",gap:6,marginTop:8}}><Bt T={T} v="accent" sz="sm" onClick={addColFn}>Add</Bt><Bt T={T} sz="sm" onClick={()=>{setShowAddCol(false);setNewColNm("");}}>Cancel</Bt></div></div>):(<button onClick={()=>setShowAddCol(true)} className="pf-btn" style={{width:"100%",padding:"12px 16px",borderRadius:14,border:`2px dashed ${T.bd}`,background:"transparent",color:T.txM,fontSize:13,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><Ic.Plus/> Add List</button>)}</div></div>):(<div style={{flex:1,overflow:"auto",minHeight:0}}><CalView cards={cards} onToggleCP={togCP} onCardOpen={setSelCard} T={T}/></div>)}
    </div>
    {selCard&&<CardMod card={selCard} onClose={()=>setSelCard(null)} onUpdate={updCard} onDelete={delCard} users={allUsers} columns={cols} T={T} userName={user?.name||"Unknown"}/>}
    {addCol&&<QuickAdd column={addCol} columns={cols} onClose={()=>setAddCol(null)} onAdd={addCard} T={T} userName={user?.name||"Unknown"}/>}
    {editCol&&<EditCol column={editCol} onClose={()=>setEditCol(null)} onSave={updCol} onDelete={delCol} T={T}/>}
    {showSett&&<BSett board={ab} user={user} onClose={()=>setShowSett(false)} onUpdate={svBoard} allUsers={allUsers} T={T}/>}
  </div>);
}
