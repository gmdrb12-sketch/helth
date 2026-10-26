'use client';
import {useEffect,useState} from 'react';
import type {User} from '@supabase/supabase-js';
import {LogOut,ShieldCheck,UserRound,ArrowRight} from 'lucide-react';
import {getSupabase,authConfigured} from '../lib/supabase';
export default function AccountPanel(){
 const [user,setUser]=useState<User|null>(null),[error,setError]=useState('');
 useEffect(()=>{const c=getSupabase();if(!c)return;c.auth.getSession().then(({data})=>setUser(data.session?.user||null));const {data}=c.auth.onAuthStateChange((_event,session)=>setUser(session?.user||null));return()=>data.subscription.unsubscribe()},[]);
 return <section className="card account-card"><span className="account-icon"><UserRound size={27}/></span><div><h3>{user?'나의 계정':'로그인하고 기록을 이어가세요'}</h3><p>{user?user.email||'소셜 로그인 계정':authConfigured?'다른 기기에서도 나의 운동과 식사 기록을 불러올 수 있어요.':'구글 · 카카오 · 애플 · 이메일 가입을 지원하는 연결을 준비했어요. 서비스 설정 후 이용할 수 있어요.'}</p><small><ShieldCheck size={13}/>{user?'계정별로 기록을 분리해서 저장합니다.':'게스트 기록은 자동으로 계정에 옮기지 않아요. 백업 후 로그인하여 복원하세요.'}</small>{error&&<p role="alert">{error}</p>}</div>{user?<button className="outline-button" onClick={async()=>{if(!confirm('저장 상태가 완료인지 확인해 주세요. 로그아웃할까요?'))return;const {error}=await getSupabase()!.auth.signOut({scope:'local'});if(error)setError('로그아웃에 실패했습니다. 다시 시도해 주세요.')}}><LogOut size={16}/> 로그아웃</button>:<a className="primary" href="/login">로그인 · 가입 <ArrowRight size={16}/></a>}</section>
}
