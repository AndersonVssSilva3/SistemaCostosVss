const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
let passed=0;
function context(module){
 const memory=new Map(),elements=new Map(),alerts=[];
 const document={addEventListener(){},getElementById(id){if(!elements.has(id))elements.set(id,{value:'',innerHTML:'',textContent:'',classList:{remove(){}},querySelector(){return null;}});return elements.get(id);},querySelectorAll(){return [];}};
 const c=vm.createContext({console,Date,Math,JSON,Number,String,Array,Map,Set,Error,RegExp,document,window:{},location:{pathname:'/',hash:'',reload(){}},localStorage:{getItem:k=>memory.has(k)?memory.get(k):null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)},setTimeout(){},showAlert:(m,t)=>alerts.push({m,t}),closeModal(){},confirm(){return true;},prompt(){return null;}});
 for(const f of ['db.js','accounting.js',...(module?[module]:[]),'professional.js'])vm.runInContext(fs.readFileSync(path.join(root,'js',f),'utf8'),c,{filename:f});
 vm.runInContext('initDefaultData(); DB.set("asientos",[]); DB.set("compras",[]); DB.set("ventas",[]);',c);
 return {c,memory,e:document.getElementById,alerts,eval:s=>vm.runInContext(s,c)};
}
function test(name,fn){fn();passed++;console.log('OK '+name);}
const t=context();
test('Céntimos exactos y límites decimales',()=>{assert.equal(t.eval('Accounting.cents("0.10") + Accounting.cents("0.20")'),30);for(const s of ['-1','1.001','NaN','Infinity','1e5',''])assert.throws(()=>t.eval(`Accounting.cents(${JSON.stringify(s)})`));});
test('Fechas reales y años bisiestos',()=>{assert.equal(t.eval('Accounting.date("2024-02-29")'),'2024-02-29');assert.throws(()=>t.eval('Accounting.date("2026-02-29")'));});
const valid={fecha:'2026-01-10',tipo:'normal',glosa:'Prueba de aporte',flujo:'financiamiento',lineas:[{cuenta:'104',debe:100,haber:0},{cuenta:'501',debe:0,haber:100}]};
test('Registro de partida doble',()=>{const a=t.eval(`Accounting.post(${JSON.stringify(valid)})`);assert.equal(a.numero,'AS-001');assert.equal(t.eval('Accounting.ledger().reduce((s,r)=>s+r.balance,0)'),0);});
test('Rechaza diferencia de un céntimo',()=>{const v=structuredClone(valid);v.lineas[1].haber=99.99;assert.throws(()=>t.eval(`Accounting.post(${JSON.stringify(v)})`));assert.equal(t.eval('DB.getAll("asientos").length'),1);});
test('Rechaza líneas vacías, negativas, dobles y cuentas padre',()=>{for(const update of [{debe:0,haber:0},{debe:-1,haber:0},{debe:100,haber:100},{cuenta:'10'}]){const v=structuredClone(valid);Object.assign(v.lineas[0],update);assert.throws(()=>t.eval(`Accounting.post(${JSON.stringify(v)})`));}});
test('Glosa obligatoria',()=>{const v={...valid,glosa:' '};assert.throws(()=>t.eval(`Accounting.post(${JSON.stringify(v)})`));});
test('Período cerrado y correlativo',()=>{t.eval('DB.set("closedThrough","2026-01-31")');assert.throws(()=>t.eval(`Accounting.post(${JSON.stringify(valid)})`));const v={...valid,fecha:'2026-02-01'};assert.equal(t.eval(`Accounting.post(${JSON.stringify(v)}).numero`),'AS-002');});
test('Flujo por período con saldo anterior y clasificación',()=>{const flow=t.eval('Accounting.cash("2026-02-01","2026-02-28")');assert.equal(flow.opening,10000);assert.equal(flow.financiamiento,10000);assert.equal(flow.closing,20000);});
test('Transferencia interna no duplica cobros ni pagos',()=>{const transfer={...valid,fecha:'2026-02-02',lineas:[{cuenta:'101',debe:25,haber:0},{cuenta:'104',debe:0,haber:25}]};t.eval(`Accounting.post(${JSON.stringify(transfer)})`);const f=t.eval('Accounting.cash("2026-02-01","2026-02-28")');assert.equal(f.rows.length,1);assert.equal(f.closing,20000);});
test('Saldo acreedor de activo no se convierte a positivo',()=>{const v={...valid,fecha:'2026-02-03',lineas:[{cuenta:'621',debe:300,haber:0},{cuenta:'104',debe:0,haber:300}]};t.eval(`Accounting.post(${JSON.stringify(v)})`);assert.equal(t.eval('Accounting.ledger().find(r=>r.codigo==="104").balance'),-12500);});
test('Respaldo coherente e importación inválida rechazada',()=>{assert.equal(t.eval('validateBackup(appState).asientos.length'),4);assert.throws(()=>t.eval('validateBackup({cuentas:[],asientos:[{id:1,numero:"X"}]})'));});
test('Fallo de almacenamiento no altera estado en memoria',()=>{const before=t.eval('DB.getAll("asientos").length');t.c.localStorage.setItem=()=>{throw new Error('Quota exceeded');};assert.throws(()=>t.eval(`Accounting.post(${JSON.stringify({...valid,fecha:'2026-03-01'})})`));assert.equal(t.eval('DB.getAll("asientos").length'),before);});
test('Detecta escritura en otra pestaña',()=>{const c=context();c.memory.set('omega_professional_v3','{"schemaVersion":3}');assert.throws(()=>c.eval('DB.set("audit",[])'),/otra pestaña/);});
const b=context('libros.js');
function fill(prefix,fields){for(const [k,v]of Object.entries(fields))b.e(prefix+k).value=String(v);}
test('Compra y venta generan comprobante y asiento consistentes',()=>{
 fill('compra',{Fecha:'2026-09-11',Proveedor:'Proveedor de prueba',Ruc:'20123456789',Numero:'F001-000001',Tipo:'Factura',Base:'0.03',Cuenta:'601'});
 b.e('libroDiarioDesde').value='2026-01-01';b.e('libroDiarioHasta').value='2026-12-31';b.eval('saveVoucher("compra")');
 assert.equal(b.eval('DB.getAll("compras")[0].igv'),0.01);assert.equal(b.eval('DB.getAll("compras")[0].total'),0.04);assert.equal(b.eval('DB.getAll("asientos").length'),1);
 b.eval('saveVoucher("compra")');assert.equal(b.eval('DB.getAll("asientos").length'),1);assert.match(b.e('alertContainer').innerHTML,/ya está registrado/);
 fill('venta',{Fecha:'2026-09-11',Cliente:'Cliente de prueba',Ruc:'20123456789',Numero:'F001-000002',Tipo:'Factura',Base:'100',Cuenta:'701'});b.eval('saveVoucher("venta")');assert.equal(b.eval('DB.getAll("ventas")[0].total'),118);assert.equal(b.eval('Accounting.ledger().reduce((s,r)=>s+r.balance,0)'),0);
});
test('Diario y mayor respetan fechas',()=>{b.e('libroDiarioDesde').value='2026-10-01';b.e('libroDiarioHasta').value='2026-10-31';b.eval('generarLibroDiario()');assert.ok(!b.e('libroDiarioTable').innerHTML.includes('AS-001'));b.e('mayorCuenta').value='121';b.e('mayorPeriodo').value='2026-10';b.eval('generarLibroMayor()');assert.ok(b.e('libroMayorTable').innerHTML.includes('118.00'));});
console.log(`\n${passed} pruebas superadas.`);
