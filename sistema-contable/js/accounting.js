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
    today() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    },
    escape(value) {
        return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }
};

// ⚠️ NOTA: Las funciones que dependían de DB (getAll, get, transaction, set)
// se eliminaron porque ahora la app usa directamente la capa de Supabase
// definida en db.js. No sobrescribir DB.getAll ni DB.set.