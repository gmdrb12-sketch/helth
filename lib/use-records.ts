'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {User} from '@supabase/supabase-js';
import {getSupabase} from './supabase';
import {empty,isData,type Data} from './records';
export function useRecords(){
 const [data,setData]=useState<Data>(empty),[user,setUser]=useState<User|null>(null),[ready,setReady]=useState(false),[status,setStatus]=useState('저장 상태 확인 중…'),[syncError,setSyncError]=useState(false),[retry,setRetry]=useState(0);
 const generation=useRef(0),saved=useRef(''),queue=useRef(Promise.resolve()),canSync=useRef(false),revision=useRef(0);
 const retrySync=useCallback(()=>setRetry(n=>n+1),[]);
 useEffect(()=>{
  const client=getSupabase();let disposed=false;let lastId:string|undefined;
  async function load(nextUser:User|null){
   if(disposed||lastId===(nextUser?.id||'guest'))return;
   lastId=nextUser?.id||'guest';const version=++generation.current;
   canSync.current=false;setReady(false);setUser(nextUser);setData(empty);saved.current='';setSyncError(false);
   if(!nextUser){let guest=empty;try{const raw=localStorage.getItem('onfit-data');if(raw){const parsed=JSON.parse(raw);if(isData(parsed))guest=parsed;}}catch{setStatus('브라우저 저장소를 읽을 수 없어요. 백업을 확인해 주세요.');setSyncError(true)}
    if(disposed||version!==generation.current)return;setData(guest);saved.current=JSON.stringify(guest);setReady(true);setStatus('게스트 모드 · 기록은 이 브라우저에만 저장돼요');return;
   }
   setStatus('계정 기록을 불러오는 중…');
   const {data:row,error}=await client!.from('wellness_records').select('payload,revision').eq('user_id',nextUser.id).maybeSingle();
   if(disposed||version!==generation.current)return;
   if(error || (row&&!isData(row.payload))){setStatus('클라우드 기록을 불러오지 못했어요. 다시 시도해 주세요.');setSyncError(true);return;}
   revision.current=row?.revision||0;const records=row?.payload||empty;saved.current=JSON.stringify(records);setData(records);canSync.current=true;setReady(true);setStatus('클라우드 저장 완료 · '+(nextUser.email||'로그인 계정'));
  }
  if(!client){void load(null);return()=>{disposed=true;generation.current++};}
  // Supabase auth callbacks must not await another auth call inside the callback.
  const {data:listener}=client.auth.onAuthStateChange((_event,session)=>{void load(session?.user||null)});
  client.auth.getSession().then(({data:{session},error})=>{if(disposed)return;if(error){setStatus('로그인 상태를 확인할 수 없어요. 다시 시도해 주세요.');setSyncError(true);return;}void load(session?.user||null)});
  return()=>{disposed=true;generation.current++;listener.subscription.unsubscribe()};
 },[retry]);
 useEffect(()=>{
  if(!ready)return;const serialized=JSON.stringify(data);if(serialized===saved.current)return;
  if(!user){try{localStorage.setItem('onfit-data',serialized);saved.current=serialized;setStatus('게스트 모드 · 이 브라우저에 저장됨');setSyncError(false)}catch{setStatus('브라우저 저장 실패 · 백업 파일을 내려받아 주세요.');setSyncError(true)}return;}
  if(!canSync.current)return;
  const version=generation.current;const client=getSupabase();if(!client)return;
  setStatus('클라우드에 저장 중…');
  // Serialize writes so a slow older request cannot overwrite a newer record in this tab.
  queue.current=queue.current.then(async()=>{
   if(generation.current!==version)return;
   const {data:nextRevision,error}=await client.rpc('save_wellness_records',{new_payload:data,expected_revision:revision.current});
   if(generation.current!==version)return;
   if(error){setSyncError(true);setStatus(error.code==='40001'?'다른 기기에서 기록이 변경됐어요. 먼저 백업한 뒤 페이지를 새로고침해 주세요.':'클라우드 저장 실패 · 기록을 백업한 뒤 저장을 다시 시도해 주세요.');return;}
   revision.current=Number(nextRevision);
   saved.current=serialized;setSyncError(false);setStatus('클라우드 저장 완료 · '+(user.email||'로그인 계정'));
  }).catch(()=>{setSyncError(true);setStatus('네트워크 오류 · 기록을 백업해 주세요.')});
 },[data,user,ready]);
 // Retry failed writes without reloading and discarding unsaved changes.
 const retryAction=useCallback(()=>{if(ready&&user&&JSON.stringify(data)!==saved.current)setData(d=>({...d}));else retrySync()},[ready,user,data,retrySync]);
 return {data,setData,user,ready,status,syncError,retrySync:retryAction};
}
