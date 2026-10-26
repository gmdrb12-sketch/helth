export type Workout={id:string,date:string,name:string,weight:number,reps:number,sets:number,rest:number,rpe:number,condition:number,note:string,exerciseRest?:number,restEvents?:{kind:string,seconds:number}[]};
export type Meal={id:string,date:string,name:string,type:string,calories:number,protein:number};
export type Body={id:string,date:string,weight:number,muscle:number,fat:number};
export type Data={workouts:Workout[],meals:Meal[],body:Body[],goal:string};
export const empty:Data={workouts:[],meals:[],body:[],goal:'꾸준히 운동하고 건강한 몸 만들기'};

export function isData(value:unknown):value is Data {
 if(!value||typeof value!=='object')return false;
 const d=value as Data;
 const base=(v:unknown)=>Boolean(v && typeof v==='object' && typeof (v as {id:unknown}).id==='string' && typeof (v as {date:unknown}).date==='string');
 const num=(v:unknown)=>typeof v==='number' && Number.isFinite(v) && v>=0;
 return typeof d.goal==='string' && Array.isArray(d.workouts) && Array.isArray(d.meals) && Array.isArray(d.body)
 && d.workouts.every(w=>base(w)&&typeof w.name==='string'&&typeof w.note==='string'&&[w.weight,w.reps,w.sets,w.rest,w.rpe,w.condition].every(num))
 && d.meals.every(m=>base(m)&&typeof m.name==='string'&&typeof m.type==='string'&&[m.calories,m.protein].every(num))
 && d.body.every(b=>base(b)&&[b.weight,b.muscle,b.fat].every(num));
}
