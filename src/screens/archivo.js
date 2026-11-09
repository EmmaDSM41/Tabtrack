// CAMBIOS EN PANTALLA DIVIDIR :

// VAS A BUSCAR ESTA FUNCION  : 
function getOriginalRaw(it) {
  const raw = it?.raw ?? {};
  return raw?.raw ?? raw ?? {};
}

// DEBAJO DE ESA FUNCION VAS A AGREGAR ESTO :
function isCanceledItem(raw) {
  const inner = raw?.raw ?? {};
  const flags = [
    raw?.canceled, raw?.cancelado, raw?.is_canceled,
    inner?.canceled, inner?.cancelado, inner?.is_canceled,
  ];
  const truthy = (f) => f === true || f === 1 || String(f).toLowerCase() === 'true' || f === '1';
  if (flags.some(truthy)) return true;

  const estados = [raw?.estado, raw?.status, inner?.estado, inner?.status]
    .map((v) => String(v ?? '').toLowerCase());
  return estados.some((s) => s.includes('cancel'));
}

// LUGO VAS A BUSCAR ESTA FUNCION  :
const normalizeItem =

// Y EN EL RETURN DE ESA FUNCION  VAS A AGREGAR ESTO :

canceled: isCanceledItem(raw), 

// TE DEBE DE QUEDAR ASI COMPLETO: 

return {
  id: String(id),
  uid: `${id}#${fallbackId ?? String(Math.random()).slice(2, 9)}`,
  name,
  price: +price.toFixed(2),
  qty,
  checked: false,
  locked: !!locked,
  canceled: isCanceledItem(raw),   // <-- NUEVO
  paidInfo,
  raw,
};

// LUEGO VAS A BUSCAR ESTA FUNCION LLAMADA LOAD:

const load = async () => {

// VAS A BUSCAR ESTA PARTE 

const mapped = incomingItems
  .map((it, i) => normalizeItem(it, i))

  // AHI VAS A GREGAR  ESTO  DEBAJO: 

    .filter((it) => !it.canceled);


//DEBERIA DE QUEDARTE ASI COMPLETA: 

const mapped = incomingItems
  .map((it, i) => normalizeItem(it, i))
  .filter((it) => !it.canceled);

// VAS A AGREGAR LO MISMO EN ESTA OTRA 

const mapped = (Array.isArray(rawItems) ? rawItems : [])
  .map((it, i) => normalizeItem(it, i))

// TE QUEDARIA ASI COMPLETA:

const mapped = (Array.isArray(rawItems) ? rawItems : [])
  .map((it, i) => normalizeItem(it, i))
  .filter((it) => !it.canceled);




// CAMBIOS EN PANTALLA EXPERIENCESRESIDENCE:

//DESPUES DE ESTA LINEA :

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// VAS A AGREGAR ESTO :

const isCanceledItem = (it) => {
  if (!it) return false;
  const truthy = (f) => f === true || f === 1 || String(f).toLowerCase() === 'true' || f === '1';
  if (truthy(it.canceled) || truthy(it.cancelado) || truthy(it.is_canceled)) return true;
  const estado = String(it.estado ?? it.status ?? '').toLowerCase();
  return estado.includes('cancel');
};


//LUEGO VAS A BUSCAR ESTO : 

const itemsRaw = (detail && Array.isArray(detail.items)) ? detail.items :
  (Array.isArray(c.items) ? c.items : []);

// Y LO VAS A CAMBIAR POR ESTE:

const itemsRaw = ((detail && Array.isArray(detail.items)) ? detail.items :
  (Array.isArray(c.items) ? c.items : [])
).filter((it) => !isCanceledItem(it));



// CAMBIOS EN PANTALLA EQUALSPLIT:

// VAS A BUSCAR ESTA FUNCION  :

const splitAmountByIndex =

// DESPUES DE DONDE TERMINA ESA FUNCION VAS A PEGAR ESTO : 

const isCanceledItem = (it) => {
  if (!it) return false;
  const truthy = (f) => f === true || f === 1 || f === '1' || String(f).toLowerCase() === 'true';
  const inner = it.raw ?? {};
  if (
    truthy(it.canceled) || truthy(it.cancelado) || truthy(it.is_canceled) ||
    truthy(inner.canceled) || truthy(inner.cancelado) || truthy(inner.is_canceled)
  ) return true;
  const estados = [it.estado, it.status, inner.estado, inner.status]
    .map((v) => String(v ?? '').toLowerCase());
  return estados.some((s) => s.includes('cancel'));
};

// LUEGO BUSCA :

const [items, setItems] = useState(passedItems ?? null);

// Y CAMBIALO POR ESTO:

const [items, setItems] = useState(
  Array.isArray(passedItems) ? passedItems.filter((it) => !isCanceledItem(it)) : (passedItems ?? null)
);

// LUEGO BUSCA ESTO:

const mapped = (Array.isArray(rawItems ? rawItems : []) ? rawItems : []).map((it, i) => normalizeItem(it, i));


// REMPLAZALO POR ESTO:

const mapped = (Array.isArray(rawItems) ? rawItems : [])
  .map((it, i) => normalizeItem(it, i))
  .filter((it) => !isCanceledItem(it));


//POR ULTIMO BUSCA ESTO: 

return { id: String(id), name, price, qty, raw };

//Y CAMBIALO POR ESTO :

return { id: String(id), name, price, qty, canceled: isCanceledItem(raw), raw };