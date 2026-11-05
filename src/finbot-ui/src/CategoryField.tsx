import {useState} from 'react';
import type {Snapshot} from './api';
export function categories(data:Snapshot){
 const names=new Map<string,string>();
 for(const name of ['Outros',...data.items.map(x=>x.category),...(data.plans??[]).map(x=>x.category)]){
  const trimmed=name.trim(),key=trimmed.toLocaleLowerCase('pt-BR');
  if(trimmed&&!names.has(key))names.set(key,trimmed);
 }
 return [...names.values()].sort((a,b)=>a.localeCompare(b,'pt-BR'));
}
export const canonicalCategory=(options:string[],name:string)=>options.find(x=>x.toLocaleLowerCase('pt-BR')===name.trim().toLocaleLowerCase('pt-BR'))??name.trim();
export function CategoryField({options,value,onChange,label='Categoria'}:{options:string[];value:string;onChange:(v:string)=>void;label?:string}){
 const [creating,setCreating]=useState(false);
 const all=[...new Set([...options,...(!creating&&value?[value]:[])])].sort((a,b)=>a.localeCompare(b,'pt-BR'));

 return <><label>{label}<select aria-label={label} required value={creating?'__new':value} onChange={e=>{const fresh=e.target.value==='__new';setCreating(fresh);onChange(fresh?'':e.target.value)}}>
 {all.map(x=><option key={x} value={x}>{x}</option>)}<option value="__new">Nova categoria…</option></select></label>
 {creating&&<label>Nova categoria<input aria-label="Nova categoria" required maxLength={150} value={value} onChange={e=>onChange(e.target.value)} onBlur={()=>onChange(canonicalCategory(options,value))}/><small>Se o nome já existir, a categoria cadastrada será reutilizada.</small></label>}</>;
}
export function IrCheck({checked,onChange}:{checked:boolean;onChange:(value:boolean)=>void}){
 return <div><label className="ir-toggle"><input type="checkbox" aria-label="IR" checked={checked} onChange={e=>onChange(e.target.checked)}/> IR</label><p className="help">Enviar para Imposto de Renda como pendente. Complete os dados depois, naquela aba.</p></div>;
}
