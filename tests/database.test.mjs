import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('PostgreSQL RLS: 계정별 저장·다른 사용자와 익명 접근 차단·동시 수정 충돌 감지',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
 insert into auth.users values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');`);
 const schema=await readFile(new URL('../supabase/schema.sql',import.meta.url),'utf8');
 await db.exec(schema);await db.exec(schema);
 const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
 const payload={workouts:[],meals:[],body:[],goal:'계정 A의 목표'};
 await db.exec('set role authenticated');
 await db.query(`select set_config('request.jwt.claim.sub',$1,false)`,[a]);
 let saved=await db.query('select public.save_wellness_records($1::jsonb,0) as revision',[JSON.stringify(payload)]);
 assert.equal(Number(saved.rows[0].revision),1);
 assert.equal((await db.query('select payload from public.wellness_records')).rows[0].payload.goal,payload.goal);
 saved=await db.query('select public.save_wellness_records($1::jsonb,1) as revision',[JSON.stringify({...payload,goal:'새 목표'})]);
 assert.equal(Number(saved.rows[0].revision),2);
 await assert.rejects(db.query('select public.save_wellness_records($1::jsonb,1)',[JSON.stringify(payload)]),e=>e.code==='40001');
 await db.query(`select set_config('request.jwt.claim.sub',$1,false)`,[b]);
 assert.equal((await db.query('select * from public.wellness_records')).rows.length,0);
 assert.equal((await db.query('update public.wellness_records set revision=99 where user_id=$1 returning user_id',[a])).rows.length,0);
 await assert.rejects(db.query('insert into public.wellness_records(user_id,payload) values($1,$2::jsonb)',[a,JSON.stringify(payload)]),e=>e.code==='42501');
 await db.query('select public.save_wellness_records($1::jsonb,0)',[JSON.stringify({...payload,goal:'계정 B의 목표'})]);
 assert.equal((await db.query('select user_id from public.wellness_records')).rows[0].user_id,b);
 await db.exec('reset role;set role anon');
 await assert.rejects(db.query('select * from public.wellness_records'),e=>e.code==='42501');
 await assert.rejects(db.query('select public.save_wellness_records($1::jsonb,0)',[JSON.stringify(payload)]),e=>e.code==='42501');
 }finally{await db.close()}
});
