// TermsAndConditions.js
import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const TermsAndConditions = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={styles.header.backgroundColor}
      />

      {/* Header: logo + back */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/images/logo2.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Scrollable content */}
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* ====== AVISO DE PRIVACIDAD (PRIMERA SECCIÓN, DESTACADA) ====== */}
        <View style={styles.sectionCard}>
          <Text style={styles.bigTitle}>Aviso de privacidad integral de Tab Track, S.A. de C.V. </Text>

          <View style={styles.metaRow}>
            <View style={styles.dateBadge}>
              <Text style={styles.dateBadgeText}>Última actualización: 04de marzo del 2026 </Text>
            </View>
            <View style={{ flex: 1 }} />
          </View>

          <Text style={styles.paragraph}>
            En cumplimiento a lo dispuesto en la Ley Federal de Protección de Datos
            Personales en Posesión de los Particulares, su Reglamento y Lineamientos
            aplicables (la “Ley”), Tab Track, S.A. de C.V. (Tab Track), con domicilio en
            Boulevard Jurica la campana 940, Colonia Jurica Acueducto, Querétaro,
            Querétaro. C.P. 76230, (el “Domicilio”), con dirección electrónica: www.tab
            track.com (el “Sitio”), titular de los derechos del Software denominado TabTrack
            App (el “Software”) para su uso a través de la plataforma digital con dirección
            electrónica www.tab-track.com (la“Plataforma”) y demás  plataformas digitales y
            aplicaciones web y/o móviles presentes y futuras de su propiedad, y con correo
            electrónico de contacto contacto@tab-track.com (el “Correo Electrónico”), pone a
            su disposición el presente:
          </Text>
          <Text style={styles.bigTitle}>AVISO DE PRIVACIDAD </Text>

          <Text style={styles.paragraph}>
            Con la finalidad de dar un tratamiento legítimo, controlado e informado a sus
            Datos Personales, que actualmente nos proporcione o en el futuro y que obren
            en nuestras bases de datos, o que hayan sido recopilados por cookies, o
            cualquier otra tecnología de seguimiento web; así como a efecto de garantizar su
            privacidad y su derecho a la autodeterminación informativa al proporcionarnos
            dichos Datos Personales, por este medio se nombra a Tab Track como
            responsable del uso, tratamiento y protección de sus Datos Personales; mismos
            que serán tratados con base en los principios de licitud, consentimiento,
            información, calidad, finalidad, lealtad, proporcionalidad y responsabilidad
            previstos en la Ley.
          </Text>

          <Text style={styles.sectionTitle}>RESPONSABLE DEL TRATAMIENTO.</Text>
          <Text style={styles.paragraph}>
            Tab Track es responsable del uso, tratamiento y protección de los datos
            personales que recaba a través de su plataforma digital, aplicaciones web
            y móviles.
          </Text>

          <Text style={styles.sectionTitle}>USO DE LA INFORMACIÓN </Text>
          <Text style={styles.paragraph}>
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
            información recabada del Usuario y a  fin de limitar el uso de la misma para fines
            legales y autorizados de conformidad con este Aviso, Tab Track se obliga a
            establecer de conformidad con la Ley, las debidas medidas de confidencialidad y
            seguridad administrativas, técnicas y físicas que permitan proteger dicha
            información contra daño, pérdida, alteración, destrucción o el uso, acceso o
            tratamiento no autorizado.
          </Text>

          <Text style={styles.sectionTitle}>USO DE COOKIES </Text>
          <Text style={styles.paragraph}>
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

          <Text style={styles.sectionTitle}>USO DE PLATAFORMAS DE TERCEROS COMO MEDIO DE OBTENCIÓN DE DATOS </Text>
          <Text style={styles.paragraph}>
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
            Short Message Service) y/o correo.
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
            La geolocalización del dispositivo podrá ser utilizada con fines operativos para
            validar la correcta asociación de registros realizados dentro de establecimientos
            afiliados a la Plataforma, así como para mostrar los comercios afiliados cercanos.
            La información de ubicación no será utilizada para fines de marketing
            personalizado ni será compartida con terceros para fines publicitarios. El
            Usuario podrá revocar permisos del dispositivo en cualquier momento desde la
            configuración del mismo, aunque ello podría limitar ciertas funcionalidades de
            la APP.
          </Text>

          <Text style={styles.sectionTitle}>DATOS PERSONALES SOLICITADOS  </Text>
          <Text style={styles.paragraph}>
            Tab Track, y/o partes relacionadas (los “Terceros Relacionados”) y/o aquellos
            terceros que, por la naturaleza de su trabajo o funciones tengan la necesidad de
            tratar y/o utilizar sus datos personales, como proveedores o aliados comerciales
            de Tab Track (“Socios Comerciales”), podrán solicitar y obtener datos personales
            en general y, en su caso, datos personales que puedan ser considerados
            sensibles conforme a la Ley (en lo sucesivo “Datos Personales”).
            Los Datos Personales podrán ser recabados por medios electrónicos o físicos, y
            en todos los casos serán tratados conforme a los principios establecidos en la
            Ley.
            Los Datos Personales que podrán ser recabados incluyen, de manera enunciativa
            más no limitativa:
            ● Nombre completo;
            ● Fecha de nacimiento;
            ● Domicilio;
            ● Número de teléfono fijo y/o móvil;
            ● Correo electrónico personal y/o corporativo;
            ● Registro Federal de Contribuyentes (RFC);
            ● Constancia de Situación Fiscal emitida por el Servicio de Administración
            Tributaria;
            ● Identificación oficial vigente (incluyendo credencial para votar expedida
            por el Instituto Nacional Electoral u otra identificación oficial);
            ● Preferencias de consumo;
            ● Localización de registro;
            ● Información de geolocalización del dispositivo;
            ● Información técnica del dispositivo (sistema operativo, marca, modelo,
            versión, carrier, identificadores únicos del dispositivo);
            ● Información relacionada con métodos de pago (tipo de método e
            identificadores asociados).
            El procesamiento, validación y resguardo de los datos financieros completos es
            realizado exclusivamente por pasarelas de pago externas, quienes actúan como
            responsables independientes del tratamiento conforme a sus propios avisos de
            privacidad. Tab Track no tiene acceso a los datos financieros completos.
            En caso de que para la prestación de determinados servicios se requiera
            documentación oficial que contenga datos que puedan considerarse sensibles
            conforme a la Ley, Tab Track solicitará el consentimiento expreso del Titular y
            limitará su tratamiento estrictamente a las finalidades necesarias para la
            relación jurídica y el cumplimiento de obligaciones legales.
          </Text>

          <Text style={styles.sectionTitle}>FINALIDADES DEL TRATAMIENTO DE LOS DATOS PERSONALES</Text>
          <Text style={styles.paragraph}>
            Los Datos Personales proporcionados a Tab Track serán utilizados para las
            siguientes:
            Finalidades Primarias (necesarias para la relación jurídica)
            ● Crear y administrar el registro de Usuarios en la Plataforma;
            ● Verificar la identidad del Usuario;
            ● Validar información fiscal y documental proporcionada por el Usuario;
            ● Emitir comprobantes fiscales;
            ● Procesar y gestionar pagos mediante pasarelas externas;
            ● Operar y brindar correctamente los Servicios contratados;
            ● Validar la sucursal o establecimiento donde se realicen registros
            operativos mediante el uso de geolocalización;
            ● Prevenir fraudes, suplantación de identidad y usos indebidos de la
            Plataforma;
            ● Cumplir obligaciones legales, fiscales y regulatorias;
            ● Atender requerimientos de autoridades competentes.
            Finalidades Secundarias (no indispensables para la relación jurídica)
            ● Envío de promociones y comunicaciones comerciales;
            ● Actividades de mercadotecnia y publicidad;
            ● Estudios de mercado;
            ● Análisis estadísticos y mejora de los Servicios.
            El Titular podrá oponerse al tratamiento de sus datos para finalidades
            secundarias mediante el ejercicio de sus Derechos ARCO.
            En ningún caso los datos derivados de documentación oficial o aquellos que
            puedan considerarse sensibles serán utilizados para fines promocionales o
            mercadotécnicos.
          </Text>

          <Text style={styles.sectionTitle}>TRANSFERENCIA </Text>
          <Text style={styles.paragraph}>
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
            conformidad con las leyes y reglamentos aplicables.
          </Text>

          <Text style={styles.sectionTitle}>MEDIOS Y PROCEDIMIENTOS PARA EL EJERCICIO DE LOS DERECHOS ARCO </Text>
          <Text style={styles.paragraph}>
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
            Personales y el ejercicio de sus Derechos ARCO.
          </Text>

          <Text style={styles.sectionTitle}>REVOCACIÓN DEL CONSENTIMIENTO; LIMITACIÓN DE USO Y DIVULGACIÓN DE LOS DATOS PERSONALES </Text>
          <Text style={styles.paragraph}>
            Usted, como Titular de los Datos Personales proporcionados a Tab Track,
            también podrá revocar, en cualquier momento, el consentimiento que le haya
            otorgado a Tab Track, para el tratamiento de sus Datos Personales; y/o  solicitar
            que se limite el uso y/o divulgación de los mismos;siempre y cuando no lo impida
            una disposición legal. Para tal fin, el Titular  deberá enviar su solicitud al Correo
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
            encargados de Tab Track, éste hará del conocimiento de la  revocación, a efecto
            de que procedan a efectuar lo conducente.
          </Text>
          <Text style={styles.sectionTitle}> MEDIDAS DE SEGURIDAD. </Text>
          <Text style={styles.paragraph}>
            Tab Track implementa medidas administrativas, técnicas y físicas razonables
            para proteger los datos personales, incluyendo controles de acceso, gestión de
            incidentes y políticas internas de privacidad
            Los Datos Personales serán conservados únicamente durante el tiempo
            necesario para cumplir con las finalidades descritas y conforme a los plazos
            legales aplicables. Una vez concluida la finalidad del tratamiento y no exista
            obligación legal de conservación, los datos serán bloqueados y posteriormente
            eliminados conforme a los procedimientos internos de Tab Track.
          </Text>
          <Text style={styles.sectionTitle}> CAMBIOS AL AVISO DE PRIVACIDAD  </Text>
          <Text style={styles.paragraph}>
            Tab Track se reserva el derecho de modificar y/o actualizar este Aviso de
            Privacidad, en alguna o todas sus partes, a su entera discreción, en cuyo caso
            lo comunicará aquí mismo a través de su Sitio y/o Plataforma. Los cambios o
            actualizaciones podrán derivar de nuevos requerimientos legales, de las propias
            necesidades de Tab Track, o por cualquier otra causa imputable o no a Tab
            Track.
          </Text>
          <Text style={styles.sectionTitle}>CONSENTIMIENTO MEDIANTE FIRMA DIGITAL, ELECTRÓNICA O EN LÍNEA </Text>
          <Text style={styles.paragraph}>
            Tab Track y el Usuario (por consiguiente “Las Partes”), acuerdan que la forma
            para perfeccionar el acuerdo de voluntades entre ellas podrá ser el de formato
            Digital, Electrónico o en Línea, en donde bastará manifestar el  consentimiento
            de parte del Usuario o Titular de los Datos Personales, por medio de la aceptación
            al presente Aviso de Privacidad, así como al proporcionar los Datos Personales
            mencionados anteriormente, en el propio Sitio y/o Plataforma de Tab Track; lo
            anterior, sin la necesidad de requerir estampar la firma en documento alguno.
          </Text>


          <Text style={styles.paragraphMeta}>
            Primera emisión: 16 de enero del 2026
          </Text>
        </View>

        {/* ====== TÉRMINOS Y CONDICIONES (SECCIONES) ====== */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>TÉRMINOS Y CONDICIONES DE USO DEL SOFTWARE TAB TRACK A TRAVÉS DE LA PLATAFORMA DIGITAL O APLICACIÓN MÓVIL</Text>

          <Text style={styles.paragraph}>
            Los Términos y Condiciones de uso que a continuación se presentan (los “Términos”) constituyen
            el acuerdo íntegro entre TAB TRACK, S.A. de C.V., sus filiales y/o subsidiarias, y/o sus partes
            relacionadas (el “Prestador”), quien es legítimo propietario o autorizado para comercializar y usar
            la Aplicación de Software denominada “Tab Track” para su acceso vía web o a través de la
            aplicación móvil (la “APP/Plataforma”) con domicilio en Boulevard Jurica la Campana 940,
            Colonia Juriquilla Acueducto, Querétaro, Querétaro. C.P.76230 (el “Domicilio”) y con correo
            electrónico de contacto@tab-track.com (el “Correo Electrónico”); y la persona física y/o moral
            que acceda a ella. La utilización de la APP/Plataforma, por parte de cualquier persona, le atribuye
            la calidad de usuario (el “Usuario”) y ello implica su adhesión plena e incondicional a estos
            Términos.
          </Text>

          <Text style={styles.subTitle}>1. OBJETO</Text>
          <Text style={styles.paragraph}>
            El Prestador pone la APP/Plataforma a disposición del Usuario, una aplicación tecnológica
            desarrollada para proveer al Usuario los servicios de acceso y pago de cuentas a través de la
            APP/Plataforma Web u otros medios, el pago de diversos servicios a través de la APP/Plataforma
            u otros medios, entre otros, y cuya información es proporcionada por el Prestador, o por personas
            vinculadas de manera directa o indirecta con él (los “Contenidos”), misma que está alojada en la
            nube (nube significa espacio de procesamiento y almacenamiento de datos y aplicaciones en
            servidores físicos que están en un Centro de Datos), y que será ejecutada por medio del uso de
            dispositivos digitales electrónicos, tales como: computadora, teléfono inteligente, tablet, etc. (los
            “Servicios”). No obstante, el Prestador no garantiza la resolución efectiva de todas las necesidades
            del Usuario.
            Los Servicios se prestan en la modalidad de Software as a Service (el “SaaS”), que implica que
            el Usuario recibe los servicios en la nube, a través de planes mensuales, con cargo directo y
            recurrente las tarjetas de crédito, débito o determinados motores de pago, según haya elegido el
            Usuario al registrarse en la APP/Plataforma. Los Servicios que contrata el Usuario, según eligió
            al registrarse y darse de alta en la APP/Plataforma, contienen los siguientes componentes:
            13. Pago de cuenta: dicho servicio consiste en el pago de cuentas en restaurantes, bares,
            cafeterías u hoteles afiliados a Tab Track, en el cual se paga mediante la APP/Plataforma
            Web u otros medios y es cobrado con cargo a tarjeta de crédito, débito, o prepago.
            14. Alianzas o convenios comerciales con usuarios corporativos de Tab Track, gozan de una
            comisión preferencial, descuento o campaña, dicho convenio puede variar dependiendo de
            las necesidades de las partes.
            El Usuario acepta cumplir con todos y cada uno de los procedimientos que las leyes aplicables
            señalen, respecto a la adquisición de servicios en línea o digitales; y, por su parte, el Prestador se
            compromete a respetar y hacer cumplir los derechos del Usuario y dar un correcto uso a los datos
            que se recaben con dicho propósito, conforme al Aviso de Privacidad que se encuentra en la
            APP/Plataforma.
          </Text>

          <Text style={styles.subTitle}>2. USO CONTRACTUAL DE LA APP/Plataforma</Text>
          <Text style={styles.paragraph}>
            En virtud de los presentes Términos, el Prestador autoriza y otorga al Usuario el uso y goce de 1
            (una) licencia de uso de la APP/Plataforma para uso personal, misma que implica el registro y
            acceso de la misma. Dicho otorgamiento se realiza bajo la modalidad “Saas”, temporal, de manera
            no exclusiva, no comercializable y no sublicenciable, para la adquisición de los servicios.
            Los Servicios que el Usuario podrá adquirir a través de la APP/Plataforma (y que eligió al
            momento de crear su usuario y contraseña), están dispuestos a lo establecido por cada uno de los
            Socios Comerciales de Tab Track. Tab Track en todo momento promueve los servicios de sus
            Socios Comerciales actuando de forma ética y con veracidad y transparencia sobre su precio,
            cuotas y comisiones, sus características y especificaciones.
            Asimismo, los Socios Comerciales son y serán los únicos responsables sobre la calidad y
            durabilidad de sus productos y servicios mismos que al utilizar el usuario, éste acepta, Sin
            embargo, los Socios Comerciales podrán añadir o modificar sus propios términos y condiciones
            en cualquier momento para los productos y servicios ofertados, mismos que serán aceptados en su
            totalidad al momento de aceptar los presentes términos y condiciones.
            El Usuario se obliga a seguir y respetar las normas y/o reglas de cada restaurante, bar, cafetería u
            hotel público o privado, y de cualquier otro establecimiento, producto o servicio que utilicen a
            través de Tab Track y así como los establecido por los mismos Socios Comerciales, liberando de
            responsabilidad a Tab Track.
            El Usuario acepta ser el único responsable por el uso o mal uso de Tab Track y la APP/Plataforma
            y de los productos y servicios proveídos por Tab Track y por sus Socios Comerciales. En caso de
            que un mal uso genere daños o perjuicios para Tab Track o alguno de sus Socios Comerciales el
            usuario será respónsale del pago hasta por el monto total al que haciendan los daños ocasionados
            y será susceptible del pago de una indemnización equiparable a los daños y perjuicios, como pena
            convencional dejando a salvo los derechos correspondientes y acción legal que a Tab Track
            pudiese corresponderle.
            Por lo tanto, con la aceptación de los presentes Términos y Condiciones, el usuario libera a Tab
            Track de cualquier responsabilidad civil, penal o de cualquier otra índole relacionada con los
            productos y servicios y manifiesta que en caso de que existiere algún reclamo, ya sea judicial o
            extrajudicial a Tab Track, se compromete a sacarlo en paz y a salvo de la controversia en cuestión.
            Contratación Electrónica. El Usuario reconoce que el uso y acceso a la APP/Plataforma incluye
            la capacidad de celebrar contratos para adquirir los Servicios y/o a realizar transacciones
            electrónicamente. Por lo anterior, el Usuario reconoce que los envíos electrónicos constituyen su
            aceptación e intención de obligarse y pagar, en tiempo y forma, por tales servicios y transacciones.
            Dicha obligación se considerará aplicable a todos los registros relacionados a todas las
            transacciones que se realicen a través de la APP/Plataforma y los Servicios, incluyendo los avisos
            de cancelación, políticas de uso, contratos y aplicaciones.
            Hospedaje y/o Almacenamiento. El Prestador hospedará las Licencias en la nube de su elección
            (nube significa espacio de procesamiento y almacenamiento de datos y aplicaciones en
            servidores físicos que están en un Centro de Datos de algún tercero). El hospedaje tiene una
            disponibilidad adecuada. No obstante lo anterior, el Prestador no será responsable de cualquier
            caída, ausencia total o parcial de disponibilidad, ni de pérdida total o parcial de datos.
            Veracidad de datos. El Usuario reconoce que el Prestador no realizará investigación alguna para
            validar la exactitud y veracidad de los datos provistos por el Usuario, por lo que en caso que
            presentan omisiones, inexactitudes o errores, libera de cualquier responsabilidad al Prestador,
            respecto de cualquier daño o perjuicio que dichos actos pudieran causarle.
            Vigencia. Queda entendido que la suscripción a los Servicios tendrá una vigencia indefinida, hasta
            en tanto no exista una instrucción de baja, bloqueo o cancelación por parte del Usuario, la cual
            deberá ser solicitada por escrito al Correo Electrónico. No obstante, y sin perjuicio de lo anterior,
            los cargos correspondientes a cada Servicio se generarán de conformidad a la temporalidad
            especificada para cada uno, en tanto el mismo no sea cancelado en los términos descritos en el
            presente párrafo. Si el Usuario cancela los Servicios, deberá pagar los servicios que se hayan
            prestado hasta la fecha de terminación efectiva.
            Terminación. El Prestador, a su absoluta discreción, podrá dar por terminados los Servicios, en
            cualquier momento, bastando para ello un aviso simple por escrito.
            Del Pago de los Productos y Servicios. Tab Track cobra las cantidades, tarifas o cuotas
            correspondientes por el uso y obtención de los productos y servicios a los que acceden o dan uso
            sus Usuarios, mismas que usualmente cobrarían los Socios Comerciales, más la comisión que la
            APP/Plataforma le desglose al Cliente previo a la aceptación del pago. Tab Track se reserva el
            derecho de aplicar un redondeo o cualquier otro tipo de modificación en el monto final a pagar por
            el usuario, ya sea hacia arriba o hacia abajo.
            Para pagar los productos y servicios ofrecidos por Tab Track, el Usuario deberá dar de alta como
            mínimo una tarjeta de crédito o débito según se requiera, lo anterior resulta ser necesario para
            poder comenzar a recibir los productos y servicios así como para hacer el pago de los mismos,
            los demás productos y servicios ofrecidos como lo es, de forma enunciativa mas no limitativa, el
            pago de cuentas en restuatrentes, bares, cafeterías y hoteles, entre otros.
            Métodos de Pago. El Usuario se obliga a realizar el pago de los Servicios en pesos mexicanos. El
            cobro de los Servicios, incluyendo cualquier impuesto aplicable, se realizará a través de los
            siguientes motores de pagos: pasarelas de Tarjeta de Crédito y Tarjetas de Débito, Stripe, PayPal,
            Apple Pay, entre otros. El Prestador, para comodidad del Usuario, ofrece diferentes modalidades
            de pago que deberá elegir al crear su Usuario y código de acceso, siendo estos: (a) mediante los
            motores de pagos de: pasarelas de Tarjeta de Crédito y Tarjetas de Débito, Stripe, PayPal, Apple
            Pay, entre otros. Los cargos aquí mencionados se realizarán en cada exhibición.
            El Usuario, como único responsable del pago oportuno de los Servicios, se obliga a proporcionar
            datos reales, válidos y vigentes de la tarjeta de crédito, tarjeta de débito o motor de pagos, donde
            se realizará el cargo por exhibición. De igual manera, el Usuario declara y garantiza en este acto
            que los recursos económicos que serán invertidos para el pago de todas y cada una de las
            obligaciones conferidas en este documento, provienen de fuentes y/o actividades lícitas.  En caso
            de que el Prestador no pueda realizar el mencionado cargo a la opción de pago elegido por el
            Usuario, el Prestador se reserva el derecho de revocar o restringir el acceso del Usuario a los
            Servicios hasta en tanto el pago sea realizado en su totalidad.
            Cualquier cargo operativo, o tasa establecidos por los servicios ofrecidos a través de servidores o
            portales de terceros (motores de pago o bancos), están completamente regulados por términos y
            condiciones dispuestos por dichos terceros o por las leyes aplicables, por lo cual el Usuario
            deslinda en este acto al Prestador de cualquier responsabilidad respecto a la forma, tiempo y
            cantidad en que sean efectuados los cobros, aún cuando dicho cobro sea considerado excedido,
            indebido o que viole algún derecho del Usuario. De esta forma, el Usuario se obliga a mantener en
            paz y a salvo en todo momento al Prestador de cualquier proceso judicial que se llegare a entablar
            por razón del uso de servidores o portales de terceros.
            Cualquier cambio en la forma de pago del Usuario, deberá ser realizado en línea. Dicho cambio
            podrá generar la interrupción temporal del acceso a los Servicios, mientras se realiza la verificación
            de la nueva información otorgada. El Usuario reconoce y acepta que el Prestador podrá usar los
            servicios de cobranza de terceros, con fines de cobro de cualquier adeudo pendiente de pago por
            razón de los Servicios, para lo cual, el Usuario se obliga a colaborar de buena fe para la liquidación
            total de los adeudos.
            En caso de que el Usuario por error, pague dos veces o más el mismo servicio, para efectos de que
            le sea devuelta la cantidad que haya pagado de más, deberá iniciar un proceso de aclaración
            enviando toda la documentación necesaria que compruebe tal circunstancia al siguiente correo
            electrónico contacto@tab-track.com y cuando el Usuario acredite de manera fehaciente que se
            realizó dos veces o más el pago de un mismo servicio relacionado con un mismo Usuario, Tab
            Track hará el reembolso al Usuario de la cantidad que se haya pagado de más.
            Facturación. En caso de que el Usuario requiera comprobante fiscal, deberá solicitarlo por medio
            de la página web. Dentro de la página web el Usuario deberá de completar sus datos fiscales
            completos y correctos, y podrá seleccionar la emisión de los comprobantes fiscales de manera
            automática. Es condición imprescindible para la emisión de dicho comprobante, que el Usuario
            compruebe fehacientemente el pago de los Servicios en cuestión. El servicio podrá ser facturado
            directamente por el prestador del servicio o vendedor del producto (socios comerciales). El
            Usuario acepta que el Prestador podrá contactarle periódicamente, vía correo electrónico a la
            dirección de correo electrónico asociada a su cuenta de registro, con avisos de facturación y otras
            comunicaciones relacionadas con los Servicios, ya sean de: i) promoción de productos propios o
            de terceros; ii) mejora en el servicio; iii) cambios en los Servicios, etc.
            Para llevar a cabo la facturación, deberá de ser solicitada a más tardar el antepenúltimo día hábil
            de cada mes contado después de la fecha de pago del servicio.
            Promociones, cupones y/o Códigos de Referencia.  Tab Track se reserva el derecho a modificar
            total o parcialmente, abrir, suspender y/o cancelar los programas, promociones, cupones y códigos
            de referencia, así como de su duración y vigencia sin responsabilidad alguna, por lo que no serán
            objeto de devoluciones o indemnizaciones o compensaciones.
            Los códigos de referencia, promociones, cupones, etc. pueden variar sin previo aviso y los mismos
            no implican una cuota fija o retribución fija. Solamente se entregarán los cupones respectivos de
            cumplirse con el o los supuestos previstos y contenidos en los instructivos respectivos.
            Instructivos. Mediante la aceptación de los presentes términos y condiciones se acepta también el
            contenido y alcance de los instructivos de uso contenidos en los productos y/o servicios ofertados.
            Para un uso y funcionamiento correcto de los servicios y productos es necesario hacer caso y seguir
            los instructivos correspondientes. Así mismo, queda reservado el derecho de modificarlos sin
            necesidad de previo aviso.
          </Text>
          {/* The rest of numbered sections 3..29 rendered with headings and paragraphs */}
          <Text style={styles.subTitle}>3. USO Y ACCESO A LA APP/Plataforma</Text>
          <Text style={styles.paragraph}>
            Para acceder a los Servicios, es necesario ser mayor de edad y proporcionar la información
            requerida para crear una cuenta, de tal manera que es responsabilidad del Usuario mantener la
            información verídica, exacta, actualizada y disponible. La falta de actualización de su cuenta dará
            lugar a que no pueda acceder y utilizar los Servicios, así como la suspensión o cancelación de esta.
            El Usuario es el único responsable frente al Prestador, y cualquier tercero, respecto de su conducta
            al acceder, consultar y proporcionar información en la APP/Plataforma y de las consecuencias que
            se puedan derivar de una utilización, con fines o efectos ilícitos o contrarios al objeto de la
            APP/Plataforma, su contenido, elaborado o no por el Prestador, publicado o no bajo su nombre de
            forma oficial; así como aquellas consecuencias que se puedan derivar de la utilización contraria al
            contenido de estos Términos que sea lesiva de los intereses o derechos de terceros, o que de
            cualquier forma pueda dañar, inutilizar o deteriorar la APP/Plataforma e impedir el normal disfrute
            de otros usuarios.

          </Text>

          <Text style={styles.subTitle}>4. USO DE OTROS PRODUCTOS Y SERVICIOS</Text>
          <Text style={styles.paragraph}>
            Los componentes o las funciones de los Servicios, incluidos aquellos que implican la compra y
            descarga de productos o servicios adicionales, requieren un software diferente u otros acuerdos de
            licencia o términos de uso, por lo que el Usuario deberá leer, aceptar y obligarse a aquellos
            términos de uso establecidos, de manera independiente, como condición para poder utilizar estos
            componentes o características particulares del Servicio.
          </Text>

          <Text style={styles.subTitle}>5. IMPRECISIONES DE LA APP/Plataforma</Text>
          <Text style={styles.paragraph}>
            El Contenido de la APP/Plataforma y/o de los Servicios provistos, pueden contener inexactitudes
            y/o errores tipográficos. El Prestador no garantiza la exactitud del Contenido y se reserva el
            derecho, a su entera discreción, de corregir cualquier error u omisión en cualquier parte de la
            APP/Plataforma y/o los Servicios y a realizar cualquier cambio en las características, funcionalidad
            o Contenido en cualquier momento. El Prestador, así como cualquier persona relacionada y/o
            afiliada al Prestador, incluyendo, sin limitar, directores, apoderados, representantes,
            administradores, empleados, accionistas y/o agentes, presentes o anteriores, o aliados, no serán
            responsables de errores u omisiones en los Contenidos de la APP/Plataforma.
          </Text>

          <Text style={styles.subTitle}>6. ESTANCIA EN LA APP/Plataforma</Text>
          <Text style={styles.paragraph}>
            El Usuario es el único responsable frente al Prestador, y cualquier tercero, respecto de su conducta
            al acceder, consultar y proporcionar información en la APP/Plataforma y de las consecuencias que
            se puedan derivar de una utilización, con fines o efectos ilícitos o contrarios al objeto de la
            APP/Plataforma, su contenido, elaborado o no por el Prestador, publicado o no bajo su nombre de
            forma oficial; así como aquellas consecuencias que se puedan derivar de la utilización contraria al
            contenido de estos Términos que sea lesiva de los intereses o derechos de terceros, o que de
            cualquier forma pueda dañar, inutilizar o deteriorar la APP/Plataforma e impedir el normal disfrute
            de otros usuarios
          </Text>

          <Text style={styles.subTitle}>7. RESPONSABILIDAD RESPECTO A LOS CONTENIDOS</Text>
          <Text style={styles.paragraph}>
            Uso correcto de los Contenidos. El Usuario se compromete a:
            a) utilizar la APP/Plataforma y sus Contenidos de acuerdo a las leyes aplicables y de orden
            público, absteniéndose de realizar acto que menoscabe, deteriore, inutilice o dañe la imagen
            y/o información divulgada por el Prestador o de alguna manera lesione derechos o intereses
            de terceras personas, vinculadas directa o indirectamente a éste;
            b) no copiar, difundir, modificar, reproducir, distribuir o utilizar de manera alguna con o sin
            fines de lucro los contenidos y los elementos utilizados en la APP/Plataforma, a menos que
            se cuente con la autorización expresa y por escrito del Prestador;
            c) no modificar o manipular las marcas, logotipos, avisos comerciales, nombres comerciales
            y signos distintivos en general del Prestador, de la APP/Plataforma o de las personas
            vinculadas con el Prestador (salvo que cuente con su autorización por escrito);
            d) suprimir, eludir o modificar los Contenidos y los elementos utilizados en la
            APP/Plataforma, así como los dispositivos técnicos de protección, o cualquier mecanismo
            o procedimiento establecido en la APP/Plataforma.
            Queda excluida de los puntos anteriores, aquella información generada a través de la
            APP/Plataforma para uso y manejo del Usuario, misma que podrá ser impresa y/o copiada para los
            intereses que más convengan al mismo. En caso de que el Usuario sea una persona moral, se
            apegará a lo dispuesto por el artículo 148, fracción IV de la Ley Federal del Derecho de Autor. El
            Usuario reconoce y acepta que el uso de la APP/Plataforma y de los Contenidos, es bajo su
            exclusiva y estricta responsabilidad, por lo que el Prestador no será, en ningún momento y bajo
            ninguna circunstancia, responsable por cualquier desperfecto o problema que se presente en el
            equipo de cómputo (hardware) o programas de cómputo (software) que utilice el Usuario para
            acceder o navegar en cualquier parte de la APP/Plataforma.
            El Prestador tiene derecho a realizar, durante intervalos temporales definidos, campañas
            promocionales para promover el registro de nuevos miembros en la APP/Plataforma. El Prestador
            se reserva el derecho de modificar los términos y condiciones de los Servicios, así como de
            proceder a la exclusión de cualquiera de los mismos. El Prestador declara que todos los
            Contenidos, y los elementos utilizados en la APP/Plataforma, se encuentran debidamente
            registrados y protegidos bajo las autoridades y leyes correspondientes en México. El Usuario se
            obliga a respetar todos los derechos contenidos en el Aviso de Derecho de Autor establecido en la
            APP/Plataforma.
            APP/Plataforma y contenidos ajenos a la APP/Plataforma y a los Contenidos del Prestador.
            El Prestador podrá hacer uso de su derecho de publicación de cualquier material informativo y/o
            de sitios o subsitios propiedad de terceros, vinculados o no al Prestador, que considere de interés
            para los Usuarios. No obstante lo anterior, el Prestador se deslinda de toda responsabilidad, del
            acceso y/o uso que realice el Usuarios de la información ahí contenida y/o del uso, origen y destino
            de la información que se desprenda de ligas distintas (vínculo, hipervínculo, link). Toda
            publicación realizada dentro de la APP/Plataforma, por parte de los Usuarios, no genera obligación
            de pago ante terceros por razón de promoción, publicación y/o manejo de información y/o imagen,
            a menos que se cuente con un contrato previamente firmado con el Prestador.
            Negación y retiro de acceso a la APP/Plataforma y los Contenidos. El Prestador se reserva el
            derecho a negar o retirar el acceso a la APP/Plataforma, o sus Contenidos, en cualquier momento,
            sin responsabilidad alguna para el Prestador y sin previo aviso al Usuario o usuarios que incumplan
            de manera total o parcial con las condiciones aquí establecidas y/o que realicen acciones o actos
            tendientes a:
            a) “asediar” o de otra manera acosar o molestar a otros Usuarios;
            b) hacerse pasar como representante o empleado del Prestador, realizando declaraciones
            falsas o de otro modo erróneas de su vinculación con el Prestador;
            c) recopilar o almacenar datos personales de otros usuarios en relación con la conducta y las
            actividades prohibidas;
            d) falsificar encabezados o manipular identificadores de la APP/Plataforma, con la finalidad
            de ocultar el origen de los Contenidos;
            e) cargar, publicar, enviar por correo electrónico, transmitir o proporcionar de otro modo,
            cualquier contenido respecto del cual no tenga derecho a transmitir, en virtud de los
            términos contenidos en la Ley Federal de Protección a la Propiedad Industrial (“LFPPI”),
            la Ley Federal del Derecho de Autor (“LFDA”), y la Ley Federal de Protección de Datos
            Personales en Posesión de Particulares  (“LFPDPPP”) o de relaciones contractuales
            protegidos por convenios de confidencialidad y no divulgación;
            f)
            i)
            cargar, publicar, enviar por correo electrónico, transmitir o proporcionar de otro modo,
            materiales que contengan virus informáticos o cualquier otro código informático, archivos
            o programas diseñados para interrumpir, destruir o limitar la funcionalidad del software,
            hardware o de equipos de telecomunicaciones conectados a la APP/Plataforma;
            g) hacer uso de la APP/Plataforma de una manera que pudiera dañar, deshabilitar, recargar o
            alterar los servidores del Prestador o las conexiones de redes;
            h) ignorar requisitos, procedimientos, políticas o normas de redes conectadas a la
            APP/Plataforma que pudieran interferir con el uso y goce de la APP/Plataforma por parte
            de cualquier tercero; y
            acceder de manera no autorizada a cuentas, sistemas informáticos o redes conectadas a los
            servidores del Prestador, a través de ataques propios de piratas informáticos, el descifrado
            de contraseñas o cualquier otro método para obtener o tratar de obtener materiales o
            información con cualquier medio que no se ofrece intencionalmente a través de la
            APP/Plataforma.
            El Usuario acepta indemnizar y mantener en paz y a salvo al Prestador y sus funcionarios, agentes,
            empleados, socios, proveedores y licenciantes frente a cualquier reclamo o demanda, así como a
            cubrir los honorarios razonables de abogados, que promueva cualquier tercero en contra del
            Prestador a causa del contenido que el Usuario envíe, publique, transmita o proporcione de un
            modo distinto al previsto en la APP/Plataforma. Lo anterior, sin perjuicio del derecho del Prestador
            de realizar las acciones judiciales necesarias para reclamar los daños y perjuicios que dichas
            acciones por parte del Usuario pudieran causarle.
            Responsabilidad respecto a los Contenidos. El Prestador no asume responsabilidad alguna
            derivada, de manera enunciativa más no limitativa de: (i) la utilización que el Usuario pueda hacer
            de los materiales de esta APP/Plataforma, o de los Contenidos, o de los sitios web de enlace, ya
            sean prohibidos o permitidos, en infracción de los derechos de propiedad intelectual y/o industrial
            de contenidos de la web o de terceros; (ii) los eventuales daños y perjuicios al Usuario causados
            por un funcionamiento normal o anormal de las herramientas de búsqueda, de la organización o la
            localización de los Contenidos y/o acceso a la APP/Plataforma y, en general, de los errores o
            problemas que se generen en el desarrollo o instrumentación de los elementos técnicos que la
            APP/Plataforma facilite al Usuario; (iii) los contenidos de aquellas páginas a las que el Usuario
            pueda acceder desde enlaces incluidos en la APP/Plataforma, ya sean autorizados o no; (iv) los
            actos u omisiones de terceros, independientemente de la relación que dichos terceros pudieran
            tener con el Prestador; (v) el acceso de menores de edad a los Contenidos, así como el envío de
            información personal que estos pudieran realizar; (vi) las comunicaciones o diálogos en el
            transcurso de los debates, foros, chats y comunidades virtuales que se organicen a través de o en
            torno a la APP/Plataforma de enlace, ni responderá, por tanto, de los eventuales daños y perjuicios
            que sufra el Usuario a consecuencia de dichas comunicaciones y/o diálogos; etc.
            Responsabilidad respecto a fallas tecnológicas. El Prestador no será responsable en forma
            alguna, cuando se produzcan: (i) errores o retrasos en el acceso a la APP/Plataforma a la hora de
            introducir los datos en el formulario de solicitud, la lentitud o imposibilidad de recepción por parte
            de los destinatarios de la confirmación de la solicitud o cualquier anomalía que pueda surgir
            cuando tales incidencias sean debidas a problemas en la red Internet, caso fortuito o fuerza mayor
            o cualquier otra contingencia imprevisible ajena al Prestador; (ii) fallos o incidencias que pudieran
            producirse en las comunicaciones, ya sea borrándose o por transmisiones incompletas, de manera
            que no se garantiza que los servicios de la APP/Plataforma estén constantemente operativos; (iii)
            de los errores o daños producidos a la APP/Plataforma por un mal uso del servicio por parte del
            Usuario; (iv) de la no operatividad o problemas en la dirección de correo electrónico facilitada por
            el Usuario para el envío de la confirmación de la solicitud realizada. En todo caso, el Prestador se
            compromete a solucionar los problemas que puedan surgir y a ofrecer todo el apoyo necesario al
            Usuario para llegar a una solución rápida y satisfactoria de la incidencia. Asimismo, el Prestador
            tiene derecho a realizar durante intervalos temporales definidos, campañas promocionales para
            promover el registro de nuevos miembros en su servicio. El Prestador se reserva el derecho de
            modificar las condiciones de comercio electrónico, así como proceder a la exclusión de cualquiera
            de los términos allí contenidos.
          </Text>
          <Text style={styles.subTitle}>8. DE LOS DATOS SOLICITADOS</Text>
          <Text style={styles.paragraph}>
            El Usuario reconoce y acepta que, para el cumplimiento del objeto de la APP/Plataforma y la
            adecuada prestación de los Servicios, será necesario que el Prestador recabe datos personales y, en
            su caso, datos personales sensibles, los cuales podrán ser incorporados en formatos, bases de datos
            o sistemas físicos, digitales y/o electrónicos.
            Los datos recabados podrán incluir, de manera enunciativa más no limitativa:
            ● Datos de identificación (nombre, domicilio, teléfono, fecha de nacimiento, dirección,
            correo electrónico);
            ● Datos fiscales (Registro Federal de Contribuyentes, Constancia de Situación Fiscal);
            ● Documentación oficial de identificación (Credencial para votar expedida por el INE u
            otra identificación oficial);
            ● Datos de geolocalización;
            ● Imágenes o archivos cargados voluntariamente por el Usuario.
            El uso de imágenes y fotografías. La aplicación podrá solicitar acceso a imágenes o fotografías del
            dispositivo únicamente cuando el Usuario decida voluntariamente cargar una imagen (por ejemplo,
            logotipo o fotografía del establecimiento).
            El Prestador únicamente recabará aquellos datos que resulten necesarios, adecuados y relevantes
            para las finalidades descritas en los presentes Términos y en el Aviso de Privacidad.
          </Text>

          <Text style={styles.subTitle}>9. DATOS DE CARÁCTER PERSONAL Y DATOS PERSONALES SENSIBLES </Text>
          <Text style={styles.paragraph}>
            En cumplimiento de la Ley Federal de Protección de Datos Personales en Posesión de los
            Particulares (LFPDPPP), el Prestador, en su carácter de responsable del tratamiento de datos
            personales, informa que los datos proporcionados por el Usuario serán tratados conforme a lo
            establecido en el Aviso de Privacidad disponible en la APP/Plataforma.
            Finalidades Primarias (necesarias para la relación contractual)
            Los datos personales serán tratados para:
            a)
            b)
            c)
            Crear
            Verificar
            Validar
            y
            información
            administrar
            la
            fiscal
            la
            identidad
            y
            cuenta
            emitir
            del
            del
            comprobantes
            d)
            Identificar
            ubicación
            del
            Usuario;
            Usuario;
            fiscales;
            usuario;
            e) Validar la sucursal o establecimiento donde se realizan registros operativos mediante
            geolocalización;
            f) Prevenir fraude, suplantación de identidad y usos indebidos de la APP/Plataforma;
            f)
            Realizar
            estudios
            de
            mercado
            y
            reportes
            para
            la
            industria;
            g) Cumplir con obligaciones legales, fiscales y requerimientos de autoridades competentes.
            En caso de recabarse documentación oficial como Credencial para votar (INE) o Constancia de
            Situación Fiscal, el Usuario otorga su consentimiento expreso para su tratamiento, reconociendo
            que dicha información podrá contener datos personales sensibles o datos de identificación
            reforzada.
            El tratamiento de estos datos será estrictamente limitado a las finalidades necesarias para la
            prestación del Servicio.
            Finalidades Secundarias (no necesarias para la relación contractual)
            Adicionalmente, los datos personales no sensibles podrán ser utilizados para:
            ● Fines estadísticos;
            ● Mejora de la experiencia del Usuario;
            ● Envío de información promocional o comunicados relacionados con los Servicios.
            El Usuario podrá oponerse al tratamiento de sus datos para finalidades secundarias mediante los
            mecanismos previstos para el ejercicio de Derechos ARCO.
            En ningún caso los datos personales sensibles o documentación oficial serán utilizados para fines
            promocionales o mercadotécnicos.
          </Text>

          <Text style={styles.subTitle}>10. MANEJO DE LOS DATOS, INFORMACIÓN Y FUNCIONES DEL DISPOSITIVO </Text>
          <Text style={styles.paragraph}>
            Toda la información proporcionada por el Usuario será considerada confidencial y será tratada
            únicamente por personal autorizado del Prestador, bajo medidas de seguridad administrativas,
            técnicas y físicas razonables para protegerla contra daño, pérdida, alteración, destrucción o acceso
            no autorizado.
            La transmisión de los datos personales se realiza mediante protocolos de cifrado seguros
            (HTTPS/TLS), garantizando la protección de la información durante su transferencia. Asimismo,
            Tab Track implementa controles de acceso y mecanismos de autenticación para prevenir accesos
            no autorizados.
            Acceso a Imágenes del Dispositivo
            La APP/Plataforma podrá solicitar acceso a las imágenes almacenadas en el dispositivo del
            Usuario exclusivamente cuando éste decida voluntariamente seleccionar una imagen específica
            para su carga dentro de la APP/Plataforma (por ejemplo, imagen de perfil o logotipo).
            La APP/Plataforma no accede, escanea ni recopila automáticamente la galería completa del
            dispositivo. El acceso se limita estrictamente al archivo seleccionado por el Usuario mediante el
            selector de archivos o fotografías del sistema operativo.
            Uso de Ubicación
            La APP/Plataforma podrá solicitar acceso a la ubicación del dispositivo con la única finalidad de
            ubicar sucursales dentro del área del usuario, ubicar la sucursal , establecimiento o residencial
            donde se realizan registros operativos y asociar correctamente la información generada dentro de
            la APP/Plataforma.
            La información de geolocalización no será utilizada para fines publicitarios personalizados ni será
            compartida con terceros para fines de marketing.
            Uso de ubicación en segundo plano:
            La aplicación TabTrack puede acceder a la ubicación del dispositivo incluso cuando no se
            encuentra en uso activo (segundo plano), exclusivamente con fines operativos para validar que los
            registros realizados correspondan a establecimientos autorizados dentro de la Plataforma y
            garantizar la correcta asociación de la información a la sucursal correspondiente.
            La ubicación no se utiliza para fines publicitarios, mercadotecnia, seguimiento comercial ni se
            comparte con terceros con dichos fines.
            El Usuario podrá revocar el permiso de ubicación en cualquier momento desde la configuración
            del dispositivo; sin embargo, esto podría limitar determinadas funcionalidades operativas de la
            aplicación.
            Conservación y Limitación
            Los datos personales serán conservados únicamente por el tiempo necesario para cumplir con las
            finalidades descritas y conforme a las disposiciones legales aplicables.
          </Text>

          <Text style={styles.subTitle}>11. Medios para ejercer los derechos de acceso, rectificación, cancelación y oposición (ARCO) de los datos personales: </Text>
          <Text style={styles.paragraph}>
            El Prestador es encargado de los datos personales en los términos establecidos a lo largo de estos
            términos y condiciones. Por lo tanto, usted podrá limitar el uso o divulgación de sus datos
            personales mediante comunicación dirigido al correo contacto@tab-track.com
            EL usuario tiene derecho de: (i) acceder a sus datos personales en nuestro poder y conocer los
            detalles del tratamiento de los mismos; (ii) rectificarlos en caso de ser inexactos o incompletos;
            (iii) cancelarlos cuando considere que no se requieren para alguna de las finalidades señaladas en
            los presentes términos y condiciones, estén siendo utilizados para finalidades no consentidas o
            haya finalizado la relación contractual o de servicio; o (iv) oponerse al tratamiento de los mismos
            para fines específicos, según lo diga la ley, (conjuntamente, “Derechos ARCO”).
            El Usuario podrá solicitar en cualquier momento la eliminación de su cuenta y de los datos
            personales asociados, mediante solicitud enviada al correo electrónico: contacto@tab-track.com
            Una vez verificada la identidad del solicitante y siempre que no exista obligación legal de
            conservación, los datos serán eliminados conforme a los plazos establecidos por la normativa
            aplicable.
            Los Derechos ARCO se ejercerán mediante la presentación de la solicitud respectiva, la cual
            puede ser solicitada contacto@tab-track.com, la “Solicitud ARCO” a cuál deberá ser enviada
            acompañada de la siguiente información y documentación:
            a) Su nombre, domicilio y correo electrónico para poder comunicarle la respuesta a la
            Solicitud ARCO;
            b) Los documentos que acrediten su identidad (copia de INE, pasaporte o cualquier otra
            identificación oficial) o en su caso, los documentos que acrediten su representación legal;
            c) Una descripción clara y precisa de los datos personales respecto de los cuales busca
            ejercer alguno de los Derechos ARCO;
            d) Cualquier documento o información que facilite la localización de sus datos personales;
            e) En caso de solicitar una rectificación de datos, deberá de indicar también, las
            modificaciones a realizarse y aportar la documentación que sustente su petición; y
            f) La indicación del lugar donde podremos revisar los originales de la documentación que
            acompañe.
            Su Solicitud ARCO será contestada mediante un correo electrónico por parte de El Prestador en
            un plazo máximo de 30 (treinta) días hábiles contados desde el día en que se haya recibido su
            Solicitud ARCO. En caso de que la Solicitud ARCO se conteste de manera afirmativa o
            procedente, tales cambios se harán en un plazo máximo de 15 (quince) días hábiles. Los plazos
            referidos en este párrafo se podrán prorrogar por una vez por un periodo igual en caso de ser
            necesario.
            Es importante comunicarle que Tab Track podrá negar el acceso (la, “Negativa”) para que usted
            ejerza sus derechos ARCO en los siguientes supuestos:
            01. Cuando Usted no sea el titular de los datos personales, o su representante legal no esté
            debidamente acreditado para ejercer por medio de él, sus Derechos ARCO;
            02. Cuando en nuestra base de datos no se encuentren sus datos personales;
            03. Cuando se lesionen los derechos de un tercero;
            04. Cuando exista un impedimento legal o la resolución de una autoridad competente, que
            restrinja sus Derechos ARCO; y
            05. Cuando la Rectificación, Cancelación u Oposición haya sido previamente realizada.
            06. Cuando el instrumento notarial se haya firmado y asentado en acta
            En relación con lo anterior, la Negativa podrá ser parcial, en cuyo caso El Prestador efectuará el
            acceso, rectificación, cancelación u oposición en la parte procedente.
            El Prestador siempre le informará el motivo de su decisión y se le comunicará a Usted o en su
            caso, al representante legal, en los plazos anteriormente establecidos. Se le notificará por medio
            de correo electrónico, acompañado con las pruebas que resulten pertinentes, en caso que lo amerite.
            El ejercicio de los Derechos ARCO será gratuito, previa acreditación de su identidad ante el
            Responsable, pero si El Usuario reitera su solicitud en un periodo menor a doce meses, los costos
            serán de tres días de Salario Mínimo General Vigente en el Estado de Querétaro, más I.V.A., a
            menos que existan modificaciones sustanciales a los términos y condiciones que motiven nuevas
            consultas. En todos los casos, la entrega de los datos personales será gratuita, con la excepción de
            que El usuario deberá de cubrir los gastos justificados de envío o el costo de reproducción en
            copias u otros formatos.
            EL USUARIO podrá revocar el consentimiento que ha otorgado a El Prestador para el tratamiento
            de los datos personales que no sean indispensables para el cumplimiento de las obligaciones
            derivadas del vínculo jurídico que les une, a fin de que El Prestador deje de hacer uso de los
            mismos. Para ello, es necesario que El Usuario presente su petición en los términos antes
            mencionados.
          </Text>

          <Text style={styles.subTitle}>12. INDICADORES DE DATOS</Text>
          <Text style={styles.paragraph}>
            La información que el Usuario provea en la APP/Plataforma, real o histórica, se procesa y ordena,
            para que genere indicadores de datos, mismos que el Prestador podrá usar para tomar decisiones
            pertinentes a su negocio, siempre de manera estadística y no individualizada. El Usuario, en este
            acto, autoriza el acceso al Prestador a la información proporcionada y generada en la
            APP/Plataforma, en términos del presente documento y del Aviso de Privacidad.
          </Text>

          <Text style={styles.subTitle}>13. DE LA INFORMACIÓN PROVISTA POR EL USUARIO</Text>
          <Text style={styles.paragraph}>
            El Usuario reconoce y acuerda que el Prestador puede, durante la vigencia de los Servicios,
            depender de o usar datos, material u otra información entregada por el Usuario, y que para ello no
            requieren investigación independiente alguna o verificación, por lo que el Prestador estará
            facultado para basarse en la exactitud y plenitud de dicha información para prestar los Servicios.
            El Usuario es responsable de la información que comparten a terceros y a quiénes es compartida,
            por lo cual se deslinda en este acto de cualquier responsabilidad presente o futura a el Prestador.
            Asimismo, toda la información que el Usuario publiquen por cualquier otro medio pierde de
            manera inmediata y para siempre el carácter de secrecía y confidencialidad, liberando de toda
            responsabilidad el Prestador respecto a su uso y divulgación, sujeto a los términos y condiciones
            establecidos en el Aviso de Privacidad, cuando aplique.
          </Text>

          <Text style={styles.subTitle}>14. RESPONSABILIDAD Y CALIDAD EN LA PRESTACIÓN DE LOS SERVICIOS</Text>
          <Text style={styles.paragraph}>
            El Usuario reconoce que la APP/Plataforma es una herramienta tecnológica que es un medio para
            que el Usuario pueda desarrollar una actividad específico, por lo cual acepta que el Prestador no
            garantiza la calidad, idoneidad y/o disponibilidad de los servicios brindados o solicitados a través
            del uso de la APP/Plataforma y/o mediante su uso. El Usuario expresamente reconoce y acepta
            todos y cada uno de los riesgos derivados del uso de la APP/Plataforma, liberando al Prestador de
            cualquier responsabilidad presente o futura que se pudiera presentar. En este sentido, el Prestador
            no será responsable frente al Usuario, o cualquier persona relacionada a este, por cualquier tipo de
            daño o reclamo derivado de deficiencias en los Servicios, o por cualquier error, omisión y/o
            falsedad en la información proporcionada por el Usuario, ya sea a través de la APP/Plataforma o
            cualquier otro medio.
          </Text>

          <Text style={styles.subTitle}>15. EXCLUSIÓN DE GARANTÍAS Y DE RESPONSABILIDAD</Text>
          <Text style={styles.paragraph}>
            El Usuario es el único responsable del uso que haga a la APP/Plataforma y su Contenido. El
            Usuario reconoce que la información de la APP/Plataforma y de los Servicios se proporcionan
            “como están”, sin ninguna garantía expresa o implícita de comerciabilidad o de aptitud para un fin
            determinado. El Prestador no garantiza la precisión ni la integridad de la información, textos,
            gráficos, enlaces u otros elementos contenidos en la APP/Plataforma o Contenido. El Prestador no
            garantiza la operación ininterrumpida o libre de todo error de la APP/Plataforma y/o su Contenido.
            Puesto que toda la información referida en la APP/Plataforma y su Contenido se encuentra en la
            nube, el Prestador no controla ni garantiza la ausencia de virus en los Contenidos, ni la ausencia
            de otros elementos en los Contenidos que puedan producir alteraciones en el sistema informático
            del Usuario (software y/o hardware) o en los documentos electrónicos almacenados en su sistema
            informático.
            Todo material descargado u obtenido de un modo distinto al previsto en la APP/Plataforma, será
            bajo responsabilidad y riesgo único del Usuario, respecto de los daños que pudiera causar en el
            sistema informático del dispositivo a través del cual realice su conexión y/o la pérdida de datos
            que derive de la descarga de ese material. En ningún caso, ni el Prestador ni sus proveedores serán
            responsables de daño alguno derivado del uso de la APP/Plataforma o Contenido, o de no poder
            usarlos (EN PARTICULAR, SIN LIMITACIÓN ALGUNA, DE LOS DAÑOS DIRECTOS O
            INDIRECTOS, MORALES, INCIDENTALES, EXCESIVOS, REMOTOS Y/O EVENTUALES,
            PERJUICIOS, LUCRO CESANTE, INTERRUPCIÓN DE LA ACTIVIDAD COMERCIAL O
            PÉRDIDA DE INFORMACIÓN O DATOS Y/O INFRACCIONES DE SEGURIDAD), aún
            cuando se hubiera advertido al Prestador de dicha posibilidad.
          </Text>

          <Text style={styles.subTitle}>16. USO DE COOKIES</Text>
          <Text style={styles.paragraph}>
            El Prestador informa al Usuario que, mediante el uso de cookies y tecnologías similares, busca: i)
            garantizar la mejor experiencia posible en la APP/Plataforma; y ii) proporcionar al Usuario
            información sobre sus preferencias de servicios y de mercadeo, ayudándolo así a obtener la
            información adecuada. En caso de que el Usuario requiera de mayor información respecto al uso
            de cookies y tecnologías similares, el Prestador pone a su disposición la Política de Uso de
            Cookies.
          </Text>

          <Text style={styles.subTitle}>17. COMPATIBILIDAD DE LOS DISPOSITIVOS ELECTRÓNICOS</Text>
          <Text style={styles.paragraph}>
            El Usuario será responsable de obtener los dispositivos o hardware que sean compatibles con la
            APP/Plataforma y los Servicios, toda vez que el Prestador no garantiza que estos funcionen
            correctamente en cualquier dispositivo. De igual manera, el Usuario acepta no utilizar dispositivos,
            software o cualquier otro medio tendiente a interferir tanto en las actividades y/u operaciones de
            los Servicios o en la APP/Plataforma o en las bases de datos y/o información que se contenga en
            el mismo.
          </Text>

          <Text style={styles.subTitle}>18. MANTENIMIENTO DE LA APP/PLATAFORMA</Text>
          <Text style={styles.paragraph}>
            Para llevar a cabo trabajos de mantenimiento, el Prestador se reserva el derecho de suspender el
            acceso y/o modificar el Contenido, así como a eliminar o deshabilitar el acceso a la
            APP/Plataforma o a los Servicios, sin previo aviso. El acceso a la APP/Plataforma y los Servicios
            depende de la disponibilidad de la red que tenga el Usuario, por lo que el Prestador no será
            responsable por cualquier imposibilidad de acceder a la misma, derivada de circunstancias que se
            encuentren fuera de control del Prestador, así como por caso fortuito o de fuerza mayor. El
            Prestador, cuando lo considere necesario para el correcto funcionamiento de la APP/Plataforma,
            podrá realizar los parches, actualizaciones, correcciones de “bugs” y mejoras menores a la
            APP/Plataforma.
          </Text>

          <Text style={styles.subTitle}>19. SOPORTE</Text>
          <Text style={styles.paragraph}>
            El Prestador ofrece al Usuario el servicio de soporte técnico y orientación básica para la utilización
            de las herramientas y las funcionalidades de la APP/Plataforma, pudiendo ser por vía Chat en
            Línea, correo electrónico, o cualquier otro medio que el Prestador considere conveniente y factible,
            en los horarios indefinidos que de igual forma designe para tal efecto, mediante previo aviso. Este
            servicio no tendrá ningún costo adicional. Asimismo, el Usuario que hubiere solicitado el Soporte,
            acepta y autoriza al Prestador para tener acceso pleno a toda la información proporcionada en la
            APP/Plataforma, sin ninguna limitación. En este sentido y en beneficio del Usuario, el Prestador
            se obliga a guardar plena secrecía y confidencialidad, respecto a la información a la que tenga
            acceso.
          </Text>

          <Text style={styles.subTitle}>20. PROPIEDAD INDUSTRIAL Y DERECHO DE AUTOR</Text>
          <Text style={styles.paragraph}>
            El Prestador autoriza al Usuario a utilizar la APP/Plataforma, exclusivamente bajo los términos
            aquí expresados, sin que ello implique que concede al Usuario licencia o autorización alguna, o
            algún tipo de derecho distinto al antes mencionado, respecto de la Propiedad Industrial y Derecho
            de Autor del Prestador,  entendiéndose como ello: todas las marcas registradas y/o usadas en
            México o en el extranjero por el Prestador; todo derecho sobre invenciones (patentadas o no),
            diseños industriales, modelos de utilidad, información confidencial, nombres comerciales, secretos
            industriales, avisos comerciales, reservas de derechos, nombres de dominio; así como todo tipo de
            derechos patrimoniales sobre obras y creaciones protegidas por derechos de autor y demás formas
            de propiedad industrial o intelectual reconocida o que lleguen a reconocer las leyes
            correspondientes.
            El Usuario reconoce y acepta que el Prestador es legítimo propietario, o tiene los derechos
            necesarios, sobre la APP/Plataforma, incluidos los nombres comerciales del Prestador, marcas
            comerciales, marcas de servicio, logotipos, nombres de dominio y otras características distintivas
            de la marca contenidas en ellos (las “Marcas Registradas del Prestador”), independientemente de
            que esos derechos estén registrados o no, y de cualquier lugar del mundo en el que puedan existir
            esos derechos, y que están protegidos por las leyes y tratados internacionales sobre propiedad
            industrial y derecho de autor. Por lo anterior, el Usuario acepta que las Marcas Registradas del
            Prestador no podrán ser objeto de copia, reproducción, modificación, publicación, carga, envío,
            transmisión o distribución en modo alguno. Salvo indicación expresa en contrario en este
            documento, el Prestador no concede al Usuario ningún derecho expreso ni implícito en virtud de
            patentes, derecho de autor, marcas comerciales o información de secretos industriales. El Usuario
            reconoce y conviene que la APP/Plataforma, así como todos los diseños del mismo, son y, serán
            en todo momento, propiedad del Prestador.
            Retroalimentación. En caso de que el Usuario proporcione algún comentario al Prestador respecto
            de la funcionalidad y el rendimiento de la APP/Plataforma (incluida la identificación de posibles
            errores y mejoras), en este acto, el Usuario autoriza al Prestador para que haga uso, sin restricción,
            de todos los derechos, títulos e intereses sobre los comentarios expresados. Lo anterior, sin que
            ello se considere como un derecho moral del Usuario para requerir participación o retribución
            monetaria alguna, o restricción en el uso de dichos comentarios para su explotación por parte del
            Prestador.
          </Text>

          <Text style={styles.subTitle}>21. OTRAS DISPOSICIONES</Text>
          <Text style={styles.paragraph}>
            El Usuario acepta que una versión impresa de los presentes Términos, y de cualquier
            comunicación enviada y/o recibida en forma electrónica, será admisible como medio probatorio
            en cualquier procedimiento judicial y/o administrativo.
          </Text>

          <Text style={styles.subTitle}>22. MODIFICACIÓN DE LOS TÉRMINOS Y CONDICIONES DE USO DE LA APP/Plataforma </Text>
          <Text style={styles.paragraph}>
            El Prestador se reserva el derecho de, en cualquier momento, modificar y/o renovar
            unilateralmente y sin previo aviso los términos y condiciones de uso de la APP/Plataforma, con la
            obligación de publicar un mensaje en la APP/Plataforma que contenga un aviso al Usuario de que
            han sido realizadas ciertas modificaciones a los Términos. Será derecho exclusivo del Usuario, el
            aceptar o rechazar dichas modificaciones. En caso de que el Usuario no esté de acuerdo con las
            modificaciones hechas, podrá enviar solicitud de cancelación y terminación de su cuenta en la
            APP/Plataforma, al Correo Electrónico. El Prestador se compromete a hacer efectiva la
            cancelación de la cuenta en un plazo no mayor a 30 (treinta) días naturales, a partir de la fecha de
            recepción de la solicitud del Usuario.
            Asimismo, el Prestador se reserva el derecho, en cualquier momento y sin previo aviso, de eliminar
            o deshabilitar el acceso del Usuario a la APP/Plataforma. El Usuario siempre dispondrá de los
            Términos en la APP/Plataforma de forma visible, y libremente accesible para cuantas consultas
            quiera realizar. En cualquier caso, la aceptación de estos Términos será un paso previo e
            indispensable a la adquisición de cualquier Servicio.
          </Text>

          <Text style={styles.subTitle}>23. DIVISIBILIDAD</Text>
          <Text style={styles.paragraph}>
            En caso de que cualquier término, condición o estipulación contenida en estos Términos se
            determine ineficaz, ilegal o sin efecto, el mismo podrá ser excluido del cuerpo del presente y el
            restante continuará en vigor y efecto en forma tan amplia como en derecho proceda.
          </Text>

          <Text style={styles.subTitle}>24. ACTUALIZACIONES</Text>
          <Text style={styles.paragraph}>
            El Prestador podrá revisar y actualizar, en cualquier momento, estos Términos, manteniendo en
            todo momento el acceso libre a todo usuario que desee conocerlo. El Prestador se reserva el
            derecho de modificar, en cualquier momento, la presentación y configuración de la
            APP/Plataforma, así como estos Términos. Por ello, el Prestador recomienda al Usuario dar lectura
            atenta cada vez que acceda a la APP/Plataforma. No obstante lo anterior, el Usuario siempre
            dispondrá de estos Términos en la APP/Plataforma, de forma visible y accesible en cualquier
            momento. Algunas cláusulas de estos Términos pueden estar supeditadas a términos y condiciones
            designados expresamente y que se encuentren en la APP/Plataforma o en determinados sitios web.
          </Text>

          <Text style={styles.subTitle}>25. DERECHOS</Text>
          <Text style={styles.paragraph}>
            Cualquier derecho que no se haya conferido expresamente en este documento, se entiende
            reservado al Prestador.
          </Text>

          <Text style={styles.subTitle}>26. LEY Y JURISDICCIÓN APLICABLE</Text>
          <Text style={styles.paragraph}>
            En todo lo relacionado con la interpretación y cumplimiento de lo aquí dispuesto, las Partes aceptan
            someterse a las legislación federal de México y a la jurisdicción de los tribunales competentes en
            el Estado de Querétaro, México; renunciando a cualquier otra jurisdicción que, por razón de sus
            domicilios presentes o futuros, pudiese corresponderles.
          </Text>

          <Text style={styles.subTitle}>27. FORMA DIGITAL, ELECTRÓNICA O EN LÍNEA</Text>
          <Text style={styles.paragraph}>
            La Partes acuerdan que la forma para perfeccionar el acuerdo de voluntades entre ellas es el de
            formato Digital, Electrónico o en Línea, en donde bastará manifestar su voluntad por medio de la
            aceptación de los presentes Términos, así como proporcionar los datos personales o información
            bancaria en la APP/Plataforma o en las distintas aplicaciones de los licenciantes, sin requerir
            estampar la firma en documento alguno.
          </Text>

          <Text style={styles.subTitle}>28. ACEPTACIÓN DE LOS TÉRMINOS</Text>
          <Text style={styles.paragraph}>
            El Usuario reconoce que, mediante el acceso, suscripción y uso de la APP/Plataforma, los
            Servicios y/o Contenidos o derivados, manifiesta su aceptación plena y sin reservas y, por tanto,
            su adhesión a la versión de los Términos publicada en el momento en que acceda a la
            APP/Plataforma, en términos de lo establecido por los artículos 1803 y 1834 Bis del Código Civil
            Federal, 80, 81, 89 y demás relativos y aplicables del Código de Comercio y la legislación aplicable
            para México. Es responsabilidad única y exclusiva del Usuario, leer previamente estos Términos
            y sus modificaciones correspondientes, cada vez que accede a la APP/Plataforma. Si en cualquier
            momento, el Usuario no estuviera de acuerdo, total o parcialmente con los presentes Términos,
            deberá abstenerse inmediatamente de acceder y usar la APP/Plataforma y los Servicios provistos.
            Por lo anterior, con la aceptación de los presentes Términos, el Usuario consiente expresamente
            sujetarse a los mismos, celebrando así un acuerdo de uso de APP/Plataforma con el Prestador, por
            lo que manif
          </Text>

          <Text style={styles.subTitle}>29. ACUERDO TOTAL</Text>
          <Text style={styles.paragraph}>
            El Usuario reconoce y acepta que el Prestador puso a su disposición toda la información necesaria
            para entender el alcance y características de la APP/Plataforma y los Servicios. De igual forma,
            manifiesta que, previo al acceso a la APP/Plataforma, analizó las características de esta y, por
            consiguiente, está de acuerdo con ella.
          </Text>

          <View style={styles.metaBlock}>
            <Text style={styles.paragraphMeta}>Fecha de primera emisión: 09/07/2025</Text>
            <Text style={styles.paragraphMeta}>Fecha de última modificación: 04/03/2026</Text>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // container & header
  container: {
    flex: 1,
    backgroundColor: '#f3f6fb', // soft background for better contrast
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#0046ff',
  },
  logo: { width: 120, height: 40 },
  iconButton: { padding: 8 },

  // content
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 12,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  // titles
  bigTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#042A5B',
    marginBottom: 8,
    textAlign: 'left',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#042A5B',
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#023e8a',
    marginTop: 8,
    marginBottom: 6,
  },

  // paragraph
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: '#222222',
    marginBottom: 10,
  },

  // meta / date styles
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dateBadge: {
    backgroundColor: '#e6f0ff',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#cfe1ff',
  },
  dateBadgeText: {
    fontSize: 12,
    color: '#0556d6',
    fontWeight: '600',
  },
  paragraphMeta: {
    fontSize: 13,
    lineHeight: 18,
    color: '#444',
    marginTop: 6,
  },
  metaBlock: { marginTop: 12 },

  listContainer: { marginTop: 8, paddingLeft: 16 },
  listItem: { fontSize: 14, lineHeight: 20, marginBottom: 4, color: '#555555' },
});

export default TermsAndConditions;