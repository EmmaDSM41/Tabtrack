// CAMBIOS ITEMS

// EN LA PANTALLA DE ESCANEAR BUSCA ESTE BLOQUE

const reportedTotalFromJson = safeNum(json.total_consumo ?? json.total ?? json.totales_venta?.total_neto ?? json.totales_venta?.total_neto ?? 0);
const sumPrecioFieldNoQty = rawItems.reduce((s, it) => {
  return s + safeNum(it.precio_item ?? it.precio ?? it.price ?? it.precio_unitario ?? 0);
}, 0);

const discountAmountForHeuristic = safeNum(
  json?.descuentos_venta?.monto_total ?? json?.totales_venta?.total_descuentos ?? 0
);
const reportedTotalBeforeDiscount = reportedTotalFromJson + discountAmountForHeuristic;

const EPS = 0.5;
const precioItemRepresentaTotalDeLinea = (reportedTotalBeforeDiscount > 0) && (Math.abs(sumPrecioFieldNoQty - reportedTotalBeforeDiscount) <= EPS);


// LO VAS A CAMBIAR POR ESTE 

const reportedTotalFromJson = safeNum(json.total_consumo ?? json.total ?? json.totales_venta?.total_neto ?? 0);

const discountAmountForHeuristic = safeNum(
  json?.descuentos_venta?.monto_total ?? json?.totales_venta?.total_descuentos ?? 0
);
const reportedTotalBeforeDiscount = reportedTotalFromJson + discountAmountForHeuristic;

const isCanceledRaw = (it) => !!it.canceled || !!it.cancelado;
const priceOfRaw = (it) => safeNum(it.precio_item ?? it.precio ?? it.price ?? it.precio_unitario ?? 0);
const qtyOfRaw = (it) => Math.max(1, safeNum(it.cantidad ?? it.qty ?? 1));

// Solo items NO cancelados, porque el total del API no incluye los cancelados
const activeRaw = rawItems.filter((it) => !isCanceledRaw(it));
const sumAsLineTotal = activeRaw.reduce((s, it) => s + priceOfRaw(it), 0);
const sumAsUnitPrice = activeRaw.reduce((s, it) => s + priceOfRaw(it) * qtyOfRaw(it), 0);

// Por defecto: el API manda el total de la línea (60 = 3 x 20).
// Si hay total de referencia, elegimos la interpretación que más se le acerque.
let precioItemRepresentaTotalDeLinea = true;
if (reportedTotalBeforeDiscount > 0) {
  precioItemRepresentaTotalDeLinea =
    Math.abs(sumAsLineTotal - reportedTotalBeforeDiscount) <=
    Math.abs(sumAsUnitPrice - reportedTotalBeforeDiscount);
}


// EN ESA MISMA PANTALLA VAS A BUSCAR ESTE

const paramsToSend = {

//JUSTO ARRIBA DE ESO PONES LO SIGUIENTE:

const activeItems = (items || []).filter((it) => !it.canceled);


// Y dentro de paramsToSend, cambia:

items,

// POR

items: activeItems,

//LUEGO BUSCA :

const normalizedItemsForEqual = (items || []).map(it => {

// Y CAMBIALO POR ESTO:

const normalizedItemsForEqual = (items || []).filter((it) => !it.canceled).map(it => {

