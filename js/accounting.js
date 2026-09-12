/* Núcleo contable local. Importes monetarios calculados en céntimos enteros. */
'use strict';
const Accounting = {
    cents(value) {
        const s = String(value ?? '').trim();
        if (!/^\d+(?:\.\d{1,2})?$/.test(s)) throw new Error('Use importes positivos con un máximo de dos decimales.');
        const [whole, fraction = ''] = s.split('.');
        const n = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
        if (!Number.isSafeInteger(n) || n > 100000000000) throw new Error('El importe supera el límite permitido.');
        return n;
    },
    signed(value) { return value < 0 ? -this.cents(-value) : this.cents(value); },
    money(cents) { return (cents / 100).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); },
    date(value) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value + 'T12:00:00Z').toISOString().slice(0,10) !== value) throw new Error('Seleccione una fecha válida.');
        return value;
    },
    today() { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; },
    entries(until = '9999-12-31') { return DB.getAll('asientos').filter(a => a.estado !== 'anulado' && a.fecha <= until).sort((a,b)=>a.fecha.localeCompare(b.fecha)||a.numero.localeCompare(b.numero)); },
    validate(entry, accounts = DB.getAll('cuentas'), ignoreLock = false) {
        this.date(entry.fecha);
        if (!ignoreLock && DB.get('closedThrough') && entry.fecha <= DB.get('closedThrough')) throw new Error('El período está cerrado. Registre la corrección en un período abierto.');
        if (typeof entry.glosa !== 'string' || !entry.glosa.trim()) throw new Error('Escriba una glosa que explique la operación.');
        if (!['normal','ajuste','apertura','cierre'].includes(entry.tipo)) throw new Error('Tipo de asiento inválido.');
        if (!Array.isArray(entry.lineas) || entry.lineas.length < 2) throw new Error('El asiento requiere al menos dos líneas.');
        let debit=0, credit=0;
        for (const l of entry.lineas) {
            const c=accounts.find(c=>c.codigo===l.cuenta);
            if (!c || c.esPadre) throw new Error('Seleccione una subcuenta vigente en todas las líneas.');
            const d=this.cents(l.debe), h=this.cents(l.haber);
            if ((d>0)===(h>0)) throw new Error('Cada línea requiere un importe en Debe o en Haber, nunca en ambos.');
            debit+=d; credit+=h;
        }
        if (!Number.isSafeInteger(debit)||!Number.isSafeInteger(credit)) throw new Error('Total fuera del rango admitido.');
        if (debit!==credit) throw new Error(`El asiento no cuadra. Diferencia: S/ ${this.money(Math.abs(debit-credit))}.`);
        return {debit,credit};
    },
    nextNumber(entries = DB.getAll('asientos')) { return 'AS-'+String(entries.reduce((n,a)=>Math.max(n,Number(a.numero?.replace('AS-',''))||0),0)+1).padStart(3,'0'); },
    makeEntry(data) {
        this.validate(data);
        return {...data,id:Date.now()*1000+Math.floor(Math.random()*1000),numero:this.nextNumber(),estado:'validado',creadoEn:new Date().toISOString(),lineas:data.lineas.map(l=>({...l,nombre:DB.getAll('cuentas').find(c=>c.codigo===l.cuenta).nombre}))};
    },
    post(data, extra = {}) {
        const entry=this.makeEntry(data);
        DB.transaction({...extra,asientos:[...DB.getAll('asientos'),entry],audit:[...DB.getAll('audit'),{fecha:new Date().toISOString(),accion:'Registro de asiento',numero:entry.numero}]});
        return entry;
    },
    ledger(until='9999-12-31', entries=this.entries(until)) {
        const rows=new Map();
        for(const c of DB.getAll('cuentas')) if(!c.esPadre) rows.set(c.codigo,{...c,debit:0,credit:0,balance:0});
        for(const a of entries) for(const l of a.lineas){
            if(!rows.has(l.cuenta)) rows.set(l.cuenta,{codigo:l.cuenta,nombre:l.nombre,tipo:'sin clasificar',debit:0,credit:0,balance:0});
            const r=rows.get(l.cuenta);r.debit+=this.cents(l.debe);r.credit+=this.cents(l.haber);r.balance=r.debit-r.credit;
        }
        return [...rows.values()].filter(r=>r.debit||r.credit).sort((a,b)=>a.codigo.localeCompare(b.codigo));
    },
    cash(from='0000-01-01', until='9999-12-31') {
        const result={opening:0,closing:0,operacion:0,inversion:0,financiamiento:0,pendiente:0,rows:[]};
        for(const a of this.entries(until)){
            const amount=a.lineas.filter(l=>l.cuenta.startsWith('10')).reduce((s,l)=>s+this.cents(l.debe)-this.cents(l.haber),0);
            result.closing+=amount;
            if(a.fecha<from || a.tipo==='apertura'){result.opening+=amount;continue;}
            if(!amount) continue; // Transferencias internas no alteran el efectivo total.
            const category=['operacion','inversion','financiamiento'].includes(a.flujo)?a.flujo:'pendiente';
            result[category]+=amount;result.rows.push({entry:a,amount,category});
        }
        return result;
    },
    escape(value) { return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
};

// Una sola escritura sustituye todo el estado: compras y asientos se confirman juntos.
const STATE_KEY='omega_professional_v3';
const DATA_KEYS=['cuentas','planJerarquico','asientos','compras','ventas','productos','mercaderias','activoFijo','centrosCosto','inductores','repuestos','ajustes','planillas','audit','costItems'];
let appState;
let lastStoredState=localStorage.getItem(STATE_KEY);
try {
    const saved=localStorage.getItem(STATE_KEY);
    appState=saved?JSON.parse(saved):{schemaVersion:3,demo:true};
    if(!appState || typeof appState!=='object' || Array.isArray(appState)) throw new Error();
    if(!saved) for(const k of [...DATA_KEYS,'closedThrough']){const old=localStorage.getItem('omega_'+k);if(old!==null)appState[k]=JSON.parse(old);}
} catch(e) { throw new Error('No se pudo leer la base local. No se sobrescribieron los datos; restaure un respaldo válido.'); }
DB.get=function(key){ return appState[key]===undefined?null:JSON.parse(JSON.stringify(appState[key])); };
DB.getAll=function(key){const v=this.get(key);return Array.isArray(v)?v:[];};
DB.transaction=function(changes){if(localStorage.getItem(STATE_KEY)!==lastStoredState)throw new Error('Los datos cambiaron en otra pestaña. Recargue antes de guardar.');const next={...appState,...changes};const encoded=JSON.stringify(next);localStorage.setItem(STATE_KEY,encoded);lastStoredState=encoded;appState=JSON.parse(encoded);};
DB.set=function(key,value){this.transaction({[key]:value});};
const initializeOriginalData=initDefaultData;
initDefaultData=function(){
    initializeOriginalData();
    if(!DB.get('audit'))DB.set('audit',[]);
};
