import {type Snapshot} from './api';
import {FinancialMetrics} from './components/FinancialMetrics';
import {MonthlyForecast} from './components/MonthlyForecast';
import {CashProjection} from './CashProjection';
import './Overview.css';

export function Overview({data,month}:{data:Snapshot;month:string}){
 return <div className="overview">
  <FinancialMetrics data={data} month={month}/>
  <CashProjection data={data} month={month}/>
  <MonthlyForecast data={data} month={month}/>
 </div>;
}
