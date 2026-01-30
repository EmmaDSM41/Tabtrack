import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Platform,
    PixelRatio,
    useWindowDimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SecurityResidence({ navigation }) {
    const [username, setUsername] = useState('Usuario');
    const [profileUrl, setProfileUrl] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const nombre = await AsyncStorage.getItem('user_nombre');
                const apellido = await AsyncStorage.getItem('user_apellido');

                let displayName = '';
                if (nombre && apellido) {
                    displayName = `${nombre.trim()} ${apellido.trim()}`;
                } else if (nombre) {
                    displayName = nombre.trim();
                } else if (apellido) {
                    displayName = apellido.trim();
                } else {
                    displayName = 'Usuario';
                }

                setUsername(displayName);

                try {
                    const cachedUrl = await AsyncStorage.getItem('user_profile_url');
                    if (cachedUrl) setProfileUrl(cachedUrl);
                } catch (e) {
                    console.warn('Error leyendo user_profile_url desde AsyncStorage', e);
                }
            } catch (err) {
                console.warn('Error leyendo usuario desde AsyncStorage:', err);
                setUsername('Usuario');
            }
        })();
    }, []);

    const getInitials = (name) => {
        if (!name) return null;
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return null;
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[1][0]).toUpperCase();
    };

    const { width, height } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const rf = (p) => Math.round(PixelRatio.roundToNearestPixel((p * width) / 375));
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    const topPadding = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : (insets.top || 8);
    const contentMaxWidth = Math.min(width - 32, 760);
    const headerHorizontalPadding = Math.max(12, Math.round(width * 0.04));
    const headerVerticalPadding = clamp(rf(18), 8, 36);
    const avatarSize = clamp(rf(44), 28, 96);
    const logoWidth = clamp(Math.round(width * 0.18), 56, 140);
    const titleFont = clamp(rf(15), 18, 28);
    const sectionTitleFont = clamp(rf(18), 14, 22);
    const bodyFont = clamp(rf(14), 12, 18);
    const rightNameMaxWidth = Math.round(Math.max(90, width * 0.36));

    return (
        <SafeAreaView style={[styles.container, { paddingTop: topPadding }]}>
            <StatusBar barStyle="dark-content" />
            <View
                style={[
                    styles.header,
                    {
                        paddingHorizontal: headerHorizontalPadding,
                        paddingVertical: headerVerticalPadding,
                    },
                ]}
            >
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Volver">
                    <Ionicons name="arrow-back" size={Math.max(18, Math.round(titleFont * 0.9))} color={styles.headerTitle.color} />
                </TouchableOpacity>

                <Text
                    style={[
                        styles.headerTitle,
                        { fontSize: titleFont },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                >
                    Perfil
                </Text>

                <View style={styles.headerRight}>
                    <View style={{
                        width: avatarSize,
                        height: avatarSize,
                        borderRadius: avatarSize / 2,
                        overflow: 'hidden',
                        backgroundColor: '#f3f6ff',
                        marginHorizontal: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        {profileUrl ? (
                            <Image
                                source={{ uri: profileUrl }}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                                <Text
                                    style={[
                                        styles.avatarInitials ? styles.avatarInitials : { color: '#0046ff', fontWeight: '700' },
                                        { fontSize: Math.round(avatarSize * 0.36), includeFontPadding: false, textAlign: 'center' }
                                    ]}
                                >
                                    {getInitials(username) || '👤'}
                                </Text>
                            </View>
                        )}
                    </View>

                    <Text
                        style={[
                            styles.username,
                            { fontSize: clamp(bodyFont, 12, 18), marginRight: Math.round(Math.max(8, width * 0.02)), maxWidth: rightNameMaxWidth },
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {username}
                    </Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={[styles.scrollContent, { alignItems: 'center', paddingHorizontal: Math.max(12, Math.round(width * 0.03)) }]}>
                <View style={[styles.innerWrap, { width: contentMaxWidth }]}>
                    <View style={styles.topHeading}>
                        <Ionicons name="shield-checkmark-outline" size={Math.max(18, Math.round(sectionTitleFont * 0.9))} color={styles.title.color} />
                        <Text style={[styles.title, { fontSize: sectionTitleFont, marginLeft: 10 }]} numberOfLines={2} ellipsizeMode="tail">
                            Aviso de privacidad integral de Tab Track, S.A. de C.V.
                        </Text>
                    </View>

                    <View style={[styles.policyContainer, { marginTop: Math.round(rf(6)) }]}>
                        <View style={styles.accentBar} />

                        <View style={[styles.policyContent, { paddingVertical: Math.round(rf(14)), paddingHorizontal: Math.round(rf(14)) }]}>
                            <Text style={[styles.intro, { fontSize: bodyFont, lineHeight: Math.round(bodyFont * 1.6) }]}>
                                En cumplimiento a lo dispuesto en la Ley Federal de Protección de Datos
                                Personales en Posesión de los Particulares, su Reglamento y Lineamientos
                                aplicables (la “Ley”), Tab Track, S.A. de C.V. (Tab Track), con domicilio en
                                Boulevard Jurica la campana 940, Colonia Jurica Acueducto, Querétaro,
                                Querétaro. C.P. 76230, (el “Domicilio”), con dirección electrónica: www.tabtrack.com (el “Sitio”), titular de los derechos del Software denominado TabTrack
                                App (el “Software”) para su uso a través de la plataforma digital con dirección
                                electrónica www.tab-track.com (la“Plataforma”) y demás plataformas digitales y
                                aplicaciones web y/o móviles presentes y futuras de su propiedad, y con correo
                                electrónico de contacto contacto@tab-track.com (el “Correo Electrónico”), pone a
                                su disposición el presente:
                            </Text>

                            <View style={styles.section}>
                                <Text style={[styles.sectionHeading, { fontSize: clamp(rf(18), 14, 20) }]}>AVISO DE PRIVACIDAD
                                </Text>
                                <Text style={[styles.paragraph, { fontSize: bodyFont, lineHeight: Math.round(bodyFont * 1.6) }]}>
                                    Con la finalidad de dar un tratamiento legítimo, controlado e informado a sus
                                    Datos Personales, que actualmente nos proporcione o en el futuro y que obren
                                    en nuestras bases de datos, o que hayan sido recopilados por cookies, o
                                    cualquier otra tecnología de seguimiento web; así como a efecto de garantizar su
                                    privacidad y su derecho a la autodeterminación informativa al proporcionarnos
                                    dichos Datos Personales, por este medio se nombra a Tab Track como
                                    responsable del uso, tratamiento y protección de sus Datos Personales; mismos
                                    que serán tratados con base en los principios de licitud, consentimiento,
                                    información, calidad, finalidad, lealtad, proporcionalidad y responsabilidad
                                    previstos en la Ley.                                </Text>
                            </View>

                            <View style={styles.section}>
                                <Text style={[styles.sectionHeading, { fontSize: clamp(rf(16), 14, 20) }]}>1. REPONSABLE DEL TRATAMIENTO.
                                </Text>
                                <Text style={[styles.paragraph, { fontSize: bodyFont, lineHeight: Math.round(bodyFont * 1.6) }]}>
                                    Tab Track es responsable del uso, tratamiento y protección de los datos
                                    personales que recaba a través de su plataforma digital, aplicaciones web
                                    y móviles.
                                </Text>
                            </View>

                            <View style={styles.section}>
                                <Text style={[styles.sectionHeading, { fontSize: clamp(rf(16), 14, 20) }]}>2. USO DE LA INFORMACIÓN
                                </Text>
                                <Text style={[styles.paragraph, { fontSize: bodyFont, lineHeight: Math.round(bodyFont * 1.6) }]}>
                                    La información que Usted (por consiguiente el “Usuario” o “Titular”), nos provea
                                    a través del acceso, registro y creación de perfil de Usuario en el Sitio y/o en la
                                    Plataforma, y/o Correo Electrónico, y/o llenado de formularios o encuestas
                                    físicas o electrónicas, en tiempo real o histórico, se procesará y ordenará, para
                                    que genere indicadores de datos, mismos que Tab Track podrá usar para tomar
                                    decisiones pertinentes a su negocio. Toda la información que sea recopilada se
                                    utilizará con fines estadísticos, de manera genérica y no personalizada, y se
                                    asocian con el crecimiento, mantenimiento y administración de Tab Track,
                                    respetando en todo momento su privacidad. Estos usos (en adelante los
                                    “Servicios de la Plataforma”) incluyen: nuestras operaciones y administración
                                    internas; la comunicación con el Usuario; el cumplimiento de las solicitudes de
                                    servicios provistos por Tab Track; el mejoramiento, desarrollo, perfección y,
                                    proporción de los servicios de Tab Track, a o proveedores autorizados y/o socios
                                    comerciales. Así mismo, para llevar a cabo el correcto tratamiento de la
                                    información recabada del Usuario y a fin de limitar el uso de la misma para fines
                                    legales y autorizados de conformidad con este Aviso, Tab Track se obliga a
                                    establecer de conformidad con la Ley, las debidas medidas de confidencialidad y
                                    seguridad administrativas, técnicas y físicas que permitan proteger dicha
                                    información contra daño, pérdida, alteración, destrucción o el uso, acceso o
                                    tratamiento no autorizado.                                </Text>
                            </View>

                            <View style={styles.section}>
                                <Text style={[styles.sectionHeading, { fontSize: clamp(rf(16), 14, 20) }]}>3. USO DE COOKIES
                                </Text>
                                <Text style={[styles.paragraph, { fontSize: bodyFont, lineHeight: Math.round(bodyFont * 1.6) }]}>
                                    Tab Track hace de conocimiento del Usuario, que, mediante el uso de cookies y
                                    otras tecnologías similares, se busca garantizar la mejor experiencia posible en
                                    el Sitio y/o la Plataforma al Usuario, al proporcionar información personalizada;
                                    recordando y monitoreando su comportamiento, así como sus preferencias de
                                    servicios y de mercadeo; para así, ayudarlo a obtener la información adecuada.
                                    El uso de tecnologías en la Plataforma, ayuda a Tab Track a brindarle un mejor
                                    servicio y experiencia al Usuario. Aún así, en caso de que Usted, como Titular de
                                    los Datos Personales proporcionados a Tab Track, requiera mayor información
                                    respecto al uso de cookies y tecnologías similares, Tab Track pone a su
                                    disposición la Política del Uso de Cookies.
                                </Text>
                            </View>

                            <View style={styles.section}>
                                <Text style={[styles.sectionHeading, { fontSize: clamp(rf(16), 14, 20) }]}>4. USO DE PLATAFORMAS DE TERCEROS COMO MEDIO DE OBTENCIÓN DE DATOS
                                </Text>
                                <Text style={[styles.paragraph, { fontSize: bodyFont, lineHeight: Math.round(bodyFont * 1.6) }]}>
                                    Los Datos Personales pueden ser recabados mediante la integración manual de
                                    la información solicitada en la Plataforma o mediante la autorización de uso de
                                    los datos contenidos en las plataformas integradas a los sistemas de Tab Track.
                                    (por consiguiente, la “Plataforma de Terceros”) o cualquier otra plataforma de
                                    seguimiento web. La solicitud de los datos del Usuario se realiza a través del
                                    enlace de la Plataforma de Terceros a la API (por su significado abreviado en
                                    inglés “Application Programming Interfaces”) integrada en la Plataforma de
                                    Terceros.
                                    De igual forma, el ingreso de Usted como Usuario de los Servicios de la
                                    Plataforma de Terceros, puede estar sujeto a una primera verificación de
                                    identidad mediante validez del número celular y/o correo electrónico, que a este
                                    efecto se proporcione, a través de mensaje directo SMS (por sus siglas en inglés
                                    Short Message Service) y/o correo

                                    Tab Track también podrá recabar su dirección de IP (Internet Protocol, entendido
                                    como aquél número que se le asigna a la computadora del Usuario cuando usa
                                    Internet) con el objetivo de ayudar a diagnosticar problemas con el servidor de
                                    Tab Track y para administrar el Sitio y la Plataforma. Asimismo, su dirección de
                                    IP será utilizada para ayudar a identificarle dentro de una sesión particular y
                                    para recolectar información demográfica general. Tab Track podrá hacer uso de
                                    tecnología “push notifications” a través de la aplicación que Tab Track usa para
                                    enviar notificaciones con autorización previa del Usuario. Este medio de
                                    comunicación no tiene ningún tipo de acceso a otras funciones o información del
                                    equipo con el que se conecta al Sitio. La información puede incluir la URL de la
                                    que provienen (estén o no en el Sitio), a qué URL acceden seguidamente (estén o
                                    no en el Sitio), qué navegador están usando, incluyendo también las páginas
                                    visitadas, las búsquedas realizadas, las publicaciones, preferencias comerciales,
                                    mensajes, y similares.

                                </Text>
                            </View>
                            <View style={styles.section}>
                                <Text style={[styles.sectionHeading, { fontSize: clamp(rf(16), 14, 20) }]}>5. DATOS PERSONALES SOLICITADOS
                                </Text>
                                <Text style={[styles.paragraph, { fontSize: bodyFont, lineHeight: Math.round(bodyFont * 1.6) }]}>
                                    Tab Track, y/o partes relacionadas (los “Terceros Relacionados”) y/o aquellos
                                    terceros que, por la naturaleza de su trabajo o funciones tengan la necesidad de
                                    tratar y/o utilizar sus datos personales, como proveedores o aliados comerciales
                                    de Tab Track (“Socios Comerciales”), solicitan y obtienen datos personales en
                                    general y datos personales considerados sensibles por la Ley (en lo sucesivo
                                    “Datos Personales Generales” y “Datos Personales Sensibles”, respectivamente;
                                    y de manera conjunta referidos como los “Datos Personales”) de los Usuarios de
                                    la Plataforma.
                                    Los Datos Personales Sensibles podrán ser solicitados por medios electrónicos o
                                    físicos, en el entendido de que toda información proporcionada en físico, será
                                    considerada y tratada como si se hubiera proporcionado y autorizado en el Sitio
                                    y/o la Plataforma, y por lo cual se regirá por el presente documento.

                                    En todos los casos, la recolección de Datos Personales por parte de Tab Track es
                                    realizada de buena fe y para los fines aquí expuestos; por tal motivo, se presume
                                    que los datos proporcionados por sus titulares son apegados a la verdad y
                                    completos; por lo que son responsabilidad del Titular que los proporciona.
                                    Asimismo, se da por entendido que el Usuario al proporcionar sus datos de
                                    manera libre y voluntaria, por sí mismo o por medio de sus representantes
                                    legales, está otorgando su consentimiento expreso para el tratamiento de dichos
                                    datos mencionados anteriormente.
                                    Los Datos Personales que serán recabados de los Usuarios que hagan uso de la
                                    Plataforma son necesarios para documentar la relación comercial y jurídica que
                                    existe o podrá existir con cada uno de ellos, y para poder realizar el objeto de los
                                    Servicios de la Plataforma que se hayan contratado por el Usuario. Los Datos
                                    Personales que Usted proporcionará como Titular a Tab Track; constan de
                                    información que es incluida o podrá ser incluida en contratos, cartas, formatos,
                                    listados, bases de datos u otros medios físicos y/o electrónicos, según
                                    corresponda, a efecto de que Tab Track pueda documentar la relación entre las
                                    partes, el proceso de uso y selección que realice o vaya a realizar de los Módulos
                                    que conforman los Servicios de la Plataforma y el cumplimiento a las políticas
                                    internas, procedimientos y demás obligaciones legales aplicables a Tab Track.

                                    Los Datos Personales que le serán solicitados son los siguientes:
                                    a) Nombre completo;
                                    b) Fecha de nacimiento;
                                    c) Domicilio;
                                    d) Número de teléfono corporativo fijo y/o móvil;
                                    e) Correo electrónico personal y/o corporativo;
                                    f) Número de Registro Federal de Contribuyentes (RFC);
                                    g) Preferencias de consumo;
                                    h) Localización de registro;
                                    i) Sistema operativo de dispositivo;
                                    j) Marca de dispositivo;
                                    k) Modelo de dispositivo;
                                    l) Versión del sistema operativo del dispositivo
                                    m) Carrier de dispositivo;
                                    n) ID único de dispositivo
                                    o) Ubicación del dispositivo
                                    Tab Track podrá almacenar información relacionada con los métodos de pago
                                    utilizados por el Usuario, tales como tipo de método de pago (tarjeta de
                                    crédito, débito o plataformas electrónicas como PayPal) e identificadores
                                    asociados.

                                    El procesamiento de los pagos, la validación y el resguardo de los datos
                                    bancarios completos es realizado exclusivamente por pasarelas de pago
                                    externas, responsables independientes del tratamiento, conforme a sus
                                    propios avisos de privacidad.
                                    Tab Track no procesa directamente pagos ni tiene acceso a los datos
                                    financieros completos. Asimismo, Tab Track no recaba datos personales
                                    sensibles en términos de la Ley
                                </Text>
                            </View>
                            <View style={styles.section}>
                                <Text style={[styles.sectionHeading, { fontSize: clamp(rf(16), 14, 20) }]}>6. FINALIDADES DEL TRATAMIENTO DE LOS DATOS PERSONALES
                                </Text>
                                <Text style={[styles.paragraph, { fontSize: bodyFont, lineHeight: Math.round(bodyFont * 1.6) }]}>
                                    Los Datos Personales proporcionados a Tab Track a través de la Plataforma serán
                                    utilizados según se ha mencionado anteriormente, con la finalidad primarias y
                                    secundarias siguientes:
                                    a) Realizar el procesamiento de datos que permita crear un registro de los
                                    Usuarios y de los Módulos de los Servicios que utilice, administre o
                                    gestione a través de la Plataforma, con el objetivo de ofrecer un servicio
                                    más personalizado en el futuro;
                                    b) Prestar y operar los servicios contratados;
                                    c) Gestionar pagos mediante pasarelas externas
                                    d) Operar y brindar de manera correcta los Servicios de la Plataforma
                                    adquiridos por el Usuario;
                                    e) Brindar la asesoría necesaria y seguimiento a los Servicios de la
                                    Plataforma contratados;
                                    f) Cumplir obligaciones legales y contractuales;
                                    g) Realizar actividades de promoción y marketing de nuevos productos y/o
                                    servicios dispuestos en la Plataforma; y
                                    h) Procesar los datos bancarios de los Usuarios obtenidos a través de la
                                    Plataforma, para realizar el pago de los Servicios de la Plataforma que
                                    otorga Tab Track;
                                    i) Envío de promociones y comunicaciones comerciales;
                                    j) Estudios de mercado y análisis estadísticos.

                                    Una vez cumplidas las finalidades del tratamiento de sus Datos Personales, y
                                    cuando no exista disposición legal que establezca lo contrario, Tab Track a su
                                    sola discreción y bajo la autorización del Titular de los Datos Personales, podrá
                                    hacer uso de los mismos; únicamente con fines estadísticos de manera genérica
                                    y no personalizada, y que se encuentren asociados con el crecimiento,
                                    mantenimiento y administración de Tab Track, respetando en todo momento la
                                    privacidad del Titular de los Datos Personales.                                </Text>
                            </View>
                            <View style={styles.section}>
                                <Text style={[styles.sectionHeading, { fontSize: clamp(rf(16), 14, 20) }]}>7. TRANSFERENCIA
                                </Text>
                                <Text style={[styles.paragraph, { fontSize: bodyFont, lineHeight: Math.round(bodyFont * 1.6) }]}>
                                    TRANSFERENCIA DE LOS DATOS PERSONALES E INFORMACIÓN. Los Datos
                                    Personales a que se refiere este Aviso podrán ser transferidos (en el entendido de
                                    que podrán ser comunicados a persona distinta de Tab Track) a: (i) Terceros
                                    Relacionados y/o Socios Comerciales, con la finalidad de engrandecer la
                                    propuesta de valor de Tab Track, así como ofrecerle, con base en sus
                                    necesidades, otros productos y servicios; (ii) autoridades judiciales, mexicanas y
                                    extranjeras, con la finalidad de dar cumplimiento a la Ley, legislación,
                                    notificaciones, requerimientos u oficios de carácter judicial; (iii) a proveedores de
                                    servicios de internet sobre la cual esté montada la infraestructura tecnológica de
                                    Tab Track; y/o (iv) a proveedores de servicios de soporte técnico de la Plataforma.
                                    Todos los entes anteriormente mencionados, entendidos como toda persona
                                    física o moral, nacional o extranjera, distinta del Usuario o de Tab Track, que
                                    intervenga en cualquier fase del tratamiento de los Datos Personales será
                                    denominado, por consiguiente como “Terceros”.
                                    En caso de realizar alguna transferencia de sus Datos Personales, salvo en los
                                    supuestos establecidos en el artículo 37 de la Ley y en los casos aquí citados;
                                    Tab Track hará del conocimiento del Usuario el requerimiento de su
                                    consentimiento expreso, a efecto de recabar el mismo. No obstante lo anterior,
                                    Tab Track no transferirá los Datos Personales del Usuario a Terceros no
                                    relacionados con Tab Track, sin el consentimiento previo del Usuario.

                                    En todos los casos, Tab Track comunicará el presente Aviso de Privacidad a estos
                                    y demás Terceros aplicables; y se asegurará a través de la firma de convenios
                                    y/o la adopción de otros documentos vinculantes, que dichos Terceros
                                    mantengan las medidas de seguridad administrativas, técnicas y físicas
                                    necesarias para resguardar los Datos Personales, así mismo, Tab Track se
                                    asegura de que dichos Terceros únicamente utilicen los Datos Personales para
                                    las finalidades para los cuales fueron recabados. Por consiguiente, Tab Track
                                    como responsable que facilita a través de la Plataforma la recabación y
                                    procesamiento de los Datos Personales y cualquier otra persona relacionada con
                                    Tab Track que tenga acceso a la información contenida en este Aviso de
                                    Privacidad, quedarán obligados a resguardar dicha información, bajo las mismas
                                    normas de seguridad y confidencialidad antes mencionadas; y a no revelar ni
                                    hacer mal uso de la misma. En caso contrario serán responsables de
                                    conformidad con las leyes y reglamentos aplicables.                                </Text>
                            </View>
                            <View style={styles.section}>
                                <Text style={[styles.sectionHeading, { fontSize: clamp(rf(16), 14, 20) }]}>8. MEDIOS Y PROCEDIMIENTOS PARA EL EJERCICIO DE LOS DERECHOS
                                    ARCO
                                </Text>
                                <Text style={[styles.paragraph, { fontSize: bodyFont, lineHeight: Math.round(bodyFont * 1.6) }]}>
                                    Usted, como Titular de los Datos Personales proporcionados a Tab Track podrá
                                    solicitar en cualquier momento, el ejercicio de sus derechos de acceso,
                                    rectificación, cancelación u oposición (los “Derechos ARCO”) al tratamiento de
                                    sus Datos Personales, consistentes en: (i) acceder a sus Datos Personales y a los
                                    detalles del tratamiento de los mismos; (ii) rectificar sus Datos Personales en
                                    caso de ser inexactos o incompletos; (iii) cancelar sus Datos Personales cuando
                                    considere que no se requieren para alguna de las finalidades señaladas en este
                                    Aviso de Privacidad y/o en caso de que, estén siendo utilizados para finalidades
                                    no consentidos y/o haya finalizado su relación contractual o de servicio u otra
                                    con Tab Track; y (iv) oponerse u exigir que se cese el tratamiento de sus Datos
                                    Personales para fines específicos.
                                    Para tal fin, el Titular deberá seguir el proceso de enviar su petición al Correo
                                    Electrónico de Tab Track; la cual deberá contener, como mínimo, la siguiente
                                    información: (a) su nombre completo y domicilio, u otro medio idóneo para
                                    comunicarle la respuesta a su solicitud; (b) los documentos que acrediten su
                                    identidad o, en su caso, la de su representante legal; (c) la descripción clara y
                                    precisa de los Datos Personales respecto de los que se busca ejercer alguno de
                                    los derechos antes mencionados; y (d) cualquier otro elemento o información que
                                    facilite la localización de los Datos Personales, así como (e) cualquier otro
                                    documento requerido por la regulación actual en el momento de presentar la
                                    solicitud. El Titular cuenta también con la facultad de solicitar al Correo
                                    Electrónico de Tab Track mayor información sobre el procedimiento de atención
                                    que ofrece Tab Track para ejercer sus Derechos ARCO.
                                    La respuesta a su solicitud le será dada a conocer por Tab Track en los términos
                                    y plazos establecidos en la Ley. No obstante, usted podrá obtener más
                                    información acerca del estado que guarda su solicitud y del plazo de respuesta
                                    de la misma, contactando a Tab Track o dándole seguimiento a tal petición, por
                                    medio del Correo Electrónico; en donde además podrán atender cualquier
                                    aclaración o duda que pudiera llegar a tener respecto al tratamiento de sus Datos
                                    Personales y el ejercicio de sus Derechos ARCO.                                </Text>
                            </View>
                            <View style={styles.section}>
                                <Text style={[styles.sectionHeading, { fontSize: clamp(rf(16), 14, 20) }]}>9. REVOCACIÓN DEL CONSENTIMIENTO; LIMITACIÓN DE USO Y
                                    DIVULGACIÓN DE LOS DATOS PERSONALES
                                </Text>
                                <Text style={[styles.paragraph, { fontSize: bodyFont, lineHeight: Math.round(bodyFont * 1.6) }]}>
                                    Usted, como Titular de los Datos Personales proporcionados a Tab Track,
                                    también podrá revocar, en cualquier momento, el consentimiento que le haya
                                    otorgado a Tab Track, para el tratamiento de sus Datos Personales; y/o solicitar
                                    que se limite el uso y/o divulgación de los mismos;siempre y cuando no lo impida
                                    una disposición legal. Para tal fin, el Titular deberá enviar su solicitud al Correo
                                    Electrónico de Tab Track, según sea aplicable. Dicha solicitud deberá cumplir
                                    con los mismos requisitos mencionados en el apartado séptimo del presente
                                    Aviso.
                                    La respuesta a su solicitud le será dada a conocer por Tab Track en los términos
                                    y plazos establecidos en la Ley. No obstante, usted podrá obtener más
                                    información acerca del estado que guarda su solicitud y del plazo de respuesta
                                    de la misma, contactando a Tab Track o dándole seguimiento por medio del
                                    Correo Electrónico; en donde además podrán atender cualquier aclaración o
                                    duda que pudiera llegar a tener respecto al tratamiento de sus Datos Personales
                                    y el ejercicio de sus derechos aquí descritos.
                                    En caso de que sus Datos Personales hubiesen sido remitidos con anterioridad
                                    a la fecha de revocación del consentimiento, y sigan siendo tratados por
                                    encargados de Tab Track, éste hará del conocimiento de la revocación, a efecto
                                    de que procedan a efectuar lo conducente.                                </Text>
                            </View>
                            <View style={styles.section}>
                                <Text style={[styles.sectionHeading, { fontSize: clamp(rf(16), 14, 20) }]}>10. MEDIDAS DE SEGURIDAD.
                                </Text>
                                <Text style={[styles.paragraph, { fontSize: bodyFont, lineHeight: Math.round(bodyFont * 1.6) }]}>
                                    Tab Track implementa medidas administrativas, técnicas y físicas razonables
                                    para proteger los datos personales, incluyendo controles de acceso, gestión de
                                    incidentes y políticas internas de privacidad                                </Text>
                            </View>
                            <View style={styles.section}>
                                <Text style={[styles.sectionHeading, { fontSize: clamp(rf(16), 14, 20) }]}>11. CAMBIOS AL AVISO DE PRIVACIDAD
                                </Text>
                                <Text style={[styles.paragraph, { fontSize: bodyFont, lineHeight: Math.round(bodyFont * 1.6) }]}>
                                    Tab Track se reserva el derecho de modificar y/o actualizar este Aviso de
                                    Privacidad, en alguna o todas sus partes, a su entera discreción, en cuyo caso
                                    lo comunicará aquí mismo a través de su Sitio y/o Plataforma. Los cambios o
                                    actualizaciones podrán derivar de nuevos requerimientos legales, de las propias
                                    necesidades de Tab Track, o por cualquier otra causa imputable o no a Tab
                                    Track                                </Text>
                            </View>
                            <View style={styles.section}>
                                <Text style={[styles.sectionHeading, { fontSize: clamp(rf(16), 14, 20) }]}>12. CONSENTIMIENTO MEDIANTE FIRMA DIGITAL, ELECTRÓNICA O
                                    EN LÍNEA</Text>
                                <Text style={[styles.paragraph, { fontSize: bodyFont, lineHeight: Math.round(bodyFont * 1.6) }]}>
                                    Tab Track y el Usuario (por consiguiente “Las Partes”), acuerdan que la forma
                                    para perfeccionar el acuerdo de voluntades entre ellas podrá ser el de formato
                                    Digital, Electrónico o en Línea, en donde bastará manifestar el consentimiento
                                    de parte del Usuario o Titular de los Datos Personales, por medio de la aceptación
                                    al presente Aviso de Privacidad, así como al proporcionar los Datos Personales
                                    mencionados anteriormente, en el propio Sitio y/o Plataforma de Tab Track; lo
                                    anterior, sin la necesidad de requerir estampar la firma en documento alguno.                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={{ height: Math.max(24, Math.round(rf(18))) }} />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const BLUE = '#0046ff';
const NEUTRAL = '#0b1220';
const BG = '#f8fafc';
const ACCENT = '#0f172a';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: BLUE,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '600',
        color: BLUE,
        fontFamily: 'Montserrat-Bold',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 'auto',
    },
    profileAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginHorizontal: 8,
    },
    username: {
        fontSize: 16,
        color: '#000',
        marginRight: 12,
        fontFamily: 'Montserrat-Regular',
        maxWidth: 220,
    },
    backButton: { marginRight: 8 },
    logo: {
        width: 80,
        height: 24,
        resizeMode: 'contain',
        marginLeft: 8,
    },

    scrollContent: {
        paddingTop: 18,
        paddingBottom: 36,
        backgroundColor: '#fff',
    },

    innerWrap: {
        alignSelf: 'stretch',
    },

    topHeading: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 18,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 10,
        color: BLUE,
        fontFamily: 'Montserrat-Bold',
        flexShrink: 1,
    },

    policyContainer: {
        flexDirection: 'row',
        backgroundColor: BG,
        borderRadius: 10,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    accentBar: {
        width: 6,
        backgroundColor: ACCENT,
    },
    policyContent: {
        flex: 1,
        paddingVertical: 18,
        paddingHorizontal: 18,
    },

    intro: {
        fontSize: 14,
        lineHeight: 22,
        color: NEUTRAL,
        marginBottom: 14,
        fontFamily: 'Montserrat-Regular',
    },

    section: {
        marginBottom: 14,
    },
    sectionHeading: {
        fontSize: 17,
        fontWeight: '700',
        color: '#000',
        marginBottom: 12,
        fontFamily: 'Montserrat-Bold',
    },
    paragraph: {
        fontSize: 14,
        lineHeight: 22,
        color: NEUTRAL,
        fontFamily: 'Montserrat-Regular',
    },

    avatarInitials: { color: '#0046ff', fontWeight: '700' },

});
