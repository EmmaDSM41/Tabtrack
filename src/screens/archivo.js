// EN LA PANTALLA DE RESTAURANTDETAILSCREEN VAS A BUSCAR LA FUNCION:

toggleFavorite

// Y DENTRO DE ESA FUNCION ESTA EL ELSE  QUE ES ESTE Y TIENE ESTE CONTENIDO

const preview = {
  id: String(sid),
  name: data?.nombre ?? data?.name ?? `Sucursal ${sid}`,
  image_url: data?.imagen_logo_url ?? data?.imagen_banner_url ?? data?.image_url ?? null,
  avg_rating: data?.avg_rating ?? null,
  address: data?.direccion ?? data?.address ?? '',
  type: 'branch',
  raw: data ?? {},
};

// VAS A CAMBIAR ESE POR ESTE CONTENIDO DENTRO DEL ELSE


const restName = restaurantNameParam ?? displayRestaurantName ?? '';
const branchName = branchNameParam ?? data?.nombre ?? data?.name ?? '';
const combinedName = restName
  ? (branchName ? `${restName} - ${branchName}` : restName)
  : (branchName || `Sucursal ${sid}`);

const banner = data?.imagen_banner_url ?? data?.raw?.imagen_banner_url ?? data?.imagen_banner ?? null;
const logo = data?.imagen_logo_url ?? data?.raw?.imagen_logo_url ?? data?.imagen_logo ?? data?.logo ?? null;

const preview = {
  ...(data ?? {}),
  id: String(sid),
  restaurante_id: data?.restaurante_id ?? data?.raw?.restaurante_id ?? restauranteIdParam ?? null,
  name: combinedName,
  image: banner ?? logo ?? data?.image ?? null,
  imagen_banner_url: banner,
  imagen_logo_url: logo,
  avg_rating: data?.avg_rating ?? null,
  address: data?.direccion ?? data?.address ?? '',
  short_description: data?.short_description ?? data?.descripcion ?? null,
  full_description: data?.full_description ?? data?.descripcion ?? null,
  raw: data?.raw ?? data ?? {},
  _saved_at: Date.now(),
};


//LA FUNCION COMPLETA SE VERIA ASI:

  const toggleFavorite = async () => {
    try {
      const sid = String(idParam ?? data?.id ?? data?.restaurante_id ?? '');
      if (!sid) { showToast('No se pudo actualizar favoritos'); return; }

      const favKey = await userFavoritesKey();
      const favObjsKey = await userFavoritesObjsKey();

      const rawIds = await AsyncStorage.getItem(favKey);
      let ids = rawIds ? JSON.parse(rawIds) : null;
      if (!Array.isArray(ids)) {
        const globalRaw = await AsyncStorage.getItem(GLOBAL_FAVORITES_KEY);
        ids = globalRaw ? JSON.parse(globalRaw) : [];
      }

      const rawObjs = await AsyncStorage.getItem(favObjsKey);
      let objs = rawObjs ? JSON.parse(rawObjs) : null;
      if (!Array.isArray(objs)) {
        const globalObjsRaw = await AsyncStorage.getItem(GLOBAL_FAVORITES_OBJS_KEY);
        objs = globalObjsRaw ? JSON.parse(globalObjsRaw) : [];
      }

      let newIds = Array.isArray(ids) ? [...ids] : [];
      let newObjs = Array.isArray(objs) ? [...objs] : [];

      if (newIds.includes(sid)) {
        newIds = newIds.filter(x => String(x) !== sid);
        newObjs = newObjs.filter(o => String(o.id) !== sid);
        await AsyncStorage.setItem(favKey, JSON.stringify(newIds));
        await AsyncStorage.setItem(favObjsKey, JSON.stringify(newObjs));
        setIsFavorite(false);
        showToastWithAction('Eliminado de favoritos');
      } else {
        const restName = restaurantNameParam ?? displayRestaurantName ?? '';
        const branchName = branchNameParam ?? data?.nombre ?? data?.name ?? '';
        const combinedName = restName
          ? (branchName ? `${restName} - ${branchName}` : restName)
          : (branchName || `Sucursal ${sid}`);

        const banner = data?.imagen_banner_url ?? data?.raw?.imagen_banner_url ?? data?.imagen_banner ?? null;
        const logo = data?.imagen_logo_url ?? data?.raw?.imagen_logo_url ?? data?.imagen_logo ?? data?.logo ?? null;

        const preview = {
          ...(data ?? {}),
          id: String(sid),
          restaurante_id: data?.restaurante_id ?? data?.raw?.restaurante_id ?? restauranteIdParam ?? null,
          name: combinedName,
          image: banner ?? logo ?? data?.image ?? null,
          imagen_banner_url: banner,
          imagen_logo_url: logo,
          avg_rating: data?.avg_rating ?? null,
          address: data?.direccion ?? data?.address ?? '',
          short_description: data?.short_description ?? data?.descripcion ?? null,
          full_description: data?.full_description ?? data?.descripcion ?? null,
          raw: data?.raw ?? data ?? {},
          _saved_at: Date.now(),
        };
      
      newObjs = [...newObjs.filter(o => String(o.id) !== sid), preview];
      newIds = [...newIds.filter(x => String(x) !== sid), sid];

      await AsyncStorage.setItem(favKey, JSON.stringify(newIds));
      await AsyncStorage.setItem(favObjsKey, JSON.stringify(newObjs));
      setIsFavorite(true);
      showToastWithAction('Agregado a favoritos');
    }
    } catch (e) {
    console.warn("toggleFavorite error", e);
    _showToast('Error al actualizar favoritos', 'simple');
  }
};