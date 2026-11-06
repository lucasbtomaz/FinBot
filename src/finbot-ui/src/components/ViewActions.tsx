import type {FormSpec} from '../FinanceForm';
import './ViewActions.css';

export function ViewActions({view,open}:{view:string;open:(action:string,title:string,extra?:Partial<FormSpec>)=>void}){
 if(view==='entries')return <div className="view-actions" aria-label="Ações de lançamentos"><button onClick={()=>open('addItem','Novo lançamento')}>+ Novo lançamento</button></div>;
 if(view==='pending')return <div className="view-actions" aria-label="Ações de contas a pagar"><button onClick={()=>open('addItem','Nova conta a pagar')}>+ Nova conta a pagar</button></div>;
 if(view!=='accounts')return null;
 return <div className="view-actions" aria-label="Ações de contas e cartões">
  <button onClick={()=>open('addAccount','Cadastrar conta',{kind:'conta'})}>+ Cadastrar conta</button>
  <button className="secondary" onClick={()=>open('addPurchase','Compra no cartão')}>+ Compra no cartão</button>
  <button className="secondary" onClick={()=>open('transfer','Guardar, resgatar ou transferir')}>⇄ Transferir</button>
 </div>;
}
