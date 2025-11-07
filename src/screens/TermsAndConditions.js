import React from 'react';
import { SafeAreaView, View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, StatusBar  } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const TermsAndConditions = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../../assets/images/logo2.png')} style={styles.logo} resizeMode="contain" />
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>
      <Text style={styles.mainTitle}>Términos y Condiciones de Tabtrack</Text>
      <ScrollView contentContainerStyle={styles.contentContainer}>

 
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>TÉRMINOS Y CONDICIONES DE USO DEL SOFTWARE TAB TRACK A TRAVÉS DE LA PLATAFORMA DIGITAL O APLICACIÓN MÓVIL</Text>
          <Text style={styles.paragraph}>
            Los Términos y Condiciones de uso que a continuación se presentan (los “Términos”) constituyen el acuerdo íntegro entre TAB TRACK, S.A. de C.V., sus filiales y/o subsidiarias, y/o sus partes relacionadas (el “Prestador”), quien es legítimo propietario o autorizado para comercializar y usar la Aplicación de Software denominada “Tab Track” para su acceso vía web o a través de la aplicación móvil (la “APP/Plataforma”) con domicilio en Calle Jurica la Campana 940, Colonia Juriquilla Acueducto, Querétaro, Querétaro. C.P.76230 (el “Domicilio”) y con correo electrónico de contacto@tab-track.com (el “Correo Electrónico”); y la persona física y/o moral que acceda a ella. La utilización de la APP/Plataforma, por parte de cualquier persona, le atribuye la calidad de usuario (el “Usuario”) y ello implica su adhesión plena e incondicional a estos Términos.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>1. OBJETO</Text>
          <Text style={styles.paragraph}>
            El Prestador pone la APP/Plataforma a disposición del Usuario, una aplicación tecnológica desarrollada para proveer al Usuario los servicios de acceso y pago de cuentas a través de la APP/Plataforma Web u otros medios, el pago de diversos servicios a través de la APP/Plataforma u otros medios, entre otros, y cuya información es proporcionada por el Prestador, o por personas vinculadas de manera directa o indirecta con él (los “Contenidos”), misma que está alojada en la nube (nube significa espacio de procesamiento y almacenamiento de datos y aplicaciones en servidores físicos que están en un Centro de Datos), y que será ejecutada por medio del uso de dispositivos digitales electrónicos, tales como: computadora, teléfono inteligente, tablet, etc. (los “Servicios”). No obstante, el Prestador no garantiza la resolución efectiva de todas las necesidades del Usuario.
          </Text>
          <Text style={styles.paragraph}>
            Los Servicios se prestan en la modalidad de Software as a Service (el “SaaS”), que implica que el Usuario recibe los servicios en la nube, a través de planes mensuales, con cargo directo y recurrente las tarjetas de crédito, débito o determinados motores de pago, según haya elegido el Usuario al registrarse en la APP/Plataforma. Los Servicios que contrata el Usuario, según eligió al registrarse y darse de alta en la APP/Plataforma, contienen los siguientes componentes:
          </Text>
          <Text style={styles.paragraph}>
            Pago de cuenta: dicho servicio consiste en el pago de cuentas en restaurantes, bares, cafeterías u hoteles afiliados a Tab Track, en el cual se paga mediante la APP/Plataforma Web u otros medios y es cobrado con cargo a tarjeta de crédito, débito, o prepago.
          </Text>
          <Text style={styles.paragraph}>
            Alianzas o convenios comerciales con usuarios corporativos de Tab Track, gozan de una comisión preferencial, descuento o campaña, dicho convenio puede variar dependiendo de las necesidades de las partes.
          </Text>
          <Text style={styles.paragraph}>
            El Usuario acepta cumplir con todos y cada uno de los procedimientos que las leyes aplicables señalen, respecto a la adquisición de servicios en línea o digitales; y, por su parte, el Prestador se compromete a respetar y hacer cumplir los derechos del Usuario y dar un correcto uso a los datos que se recaben con dicho propósito, conforme al Aviso de Privacidad que se encuentra en la APP/Plataforma.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>2. USO CONTRACTUAL DE LA APP/Plataforma</Text>
          <Text style={styles.paragraph}>
            En virtud de los presentes Términos, el Prestador autoriza y otorga al Usuario el uso y goce de 1 (una) licencia de uso de la APP/Plataforma para uso personal, misma que implica el registro y acceso de la misma. Dicho otorgamiento se realiza bajo la modalidad “Saas”, temporal, de manera no exclusiva, no comercializable y no sublicenciable, para la adquisición de los servicios.
          </Text>
          <Text style={styles.paragraph}>
            Los Servicios que el Usuario podrá adquirir a través de la APP/Plataforma (y que eligió al momento de crear su usuario y contraseña), están dispuestos a lo establecido por cada uno de los Socios Comerciales de Tab Track. Tab Track en todo momento promueve los servicios de sus Socios Comerciales actuando de forma ética y con veracidad y transparencia sobre su precio, cuotas y comisiones, sus características y especificaciones.
          </Text>
          <Text style={styles.paragraph}>
            Asimismo, los Socios Comerciales son y serán los únicos responsables sobre la calidad y durabilidad de sus productos y servicios mismos que al utilizar el usuario, éste acepta, Sin embargo, los Socios Comerciales podrán añadir o modificar sus propios términos y condiciones en cualquier momento para los productos y servicios ofertados, mismos que serán aceptados en su totalidad al momento de aceptar los presentes términos y condiciones.
          </Text>
          <Text style={styles.paragraph}>
            El Usuario se obliga a seguir y respetar las normas y/o reglas de cada restaurante, bar, cafetería u hotel público o privado, y de cualquier otro establecimiento, producto o servicio que utilicen a través de Tab Track y así como los establecido por los mismos Socios Comerciales, liberando de responsabilidad a Tab Track.
          </Text>
          <Text style={styles.paragraph}>
            El Usuario acepta ser el único responsable por el uso o mal uso de Tab Track y la APP/Plataforma y de los productos y servicios proveídos por Tab Track y por sus Socios Comerciales. En caso de que un mal uso genere daños o perjuicios para Tab Track o alguno de sus Socios Comerciales el usuario será respónsale del pago hasta por el monto total al que haciendan los daños ocasionados y será susceptible del pago de una indemnización equiparable a los daños y perjuicios, como pena convencional dejando a salvo los derechos correspondientes y acción legal que a Tab Track pudiese corresponderle.
          </Text>
          <Text style={styles.paragraph}>
            Por lo tanto, con la aceptación de los presentes Términos y Condiciones, el usuario libera a Tab Track de cualquier responsabilidad civil, penal o de cualquier otra índole relacionada con los productos y servicios y manifiesta que en caso de que existiere algún reclamo, ya sea judicial o extrajudicial a Tab Track, se compromete a sacarlo en paz y a salvo de la controversia en cuestión.
          </Text>
          <Text style={styles.paragraph}>
            Contratación Electrónica. El Usuario reconoce que el uso y acceso a la APP/Plataforma incluye la capacidad de celebrar contratos para adquirir los Servicios y/o a realizar transacciones electrónicamente. Por lo anterior, el Usuario reconoce que los envíos electrónicos constituyen su aceptación e intención de obligarse y pagar, en tiempo y forma, por tales servicios y transacciones. Dicha obligación se considerará aplicable a todos los registros relacionados a todas las transacciones que se realicen a través de la APP/Plataforma y los Servicios, incluyendo los avisos de cancelación, políticas de uso, contratos y aplicaciones.
          </Text>
          <Text style={styles.paragraph}>
            Hospedaje y/o Almacenamiento. El Prestador hospedará las Licencias en la nube de su elección (nube significa espacio de procesamiento y almacenamiento de datos y aplicaciones en servidores físicos que están en un Centro de Datos de algún tercero). El hospedaje tiene una disponibilidad adecuada. No obstante lo anterior, el Prestador no será responsable de cualquier caída, ausencia total o parcial de disponibilidad, ni de pérdida total o parcial de datos.
          </Text>
          <Text style={styles.paragraph}>
            Veracidad de datos. El Usuario reconoce que el Prestador no realizará investigación alguna para validar la exactitud y veracidad de los datos provistos por el Usuario, por lo que en caso que presentan omisiones, inexactitudes o errores, libera de cualquier responsabilidad al Prestador, respecto de cualquier daño o perjuicio que dichos actos pudieran causarle.
          </Text>
          <Text style={styles.paragraph}>
            Vigencia. Queda entendido que la suscripción a los Servicios tendrá una vigencia indefinida, hasta en tanto no exista una instrucción de baja, bloqueo o cancelación por parte del Usuario, la cual deberá ser solicitada por escrito al Correo Electrónico. No obstante, y sin perjuicio de lo anterior, los cargos correspondientes a cada Servicio se generarán de conformidad a la temporalidad especificada para cada uno, en tanto el mismo no sea cancelado en los términos descritos en el presente párrafo. Si el Usuario cancela los Servicios, deberá pagar los servicios que se hayan prestado hasta la fecha de terminación efectiva.
          </Text>
          <Text style={styles.paragraph}>
            Terminación. El Prestador, a su absoluta discreción, podrá dar por terminados los Servicios, en cualquier momento, bastando para ello un aviso simple por escrito.
          </Text>
          <Text style={styles.paragraph}>
            Del Pago de los Productos y Servicios. Tab Track cobra las cantidades, tarifas o cuotas correspondientes por el uso y obtención de los productos y servicios a los que acceden o dan uso sus Usuarios, mismas que usualmente cobrarían los Socios Comerciales, más la comisión que la APP/Plataforma le desglose al Cliente previo a la aceptación del pago. Tab Track se reserva el derecho de aplicar un redondeo o cualquier otro tipo de modificación en el monto final a pagar por el usuario, ya sea hacia arriba o hacia abajo.
          </Text>
          <Text style={styles.paragraph}>
            Para pagar los productos y servicios ofrecidos por Tab Track, el Usuario deberá dar de alta como mínimo una tarjeta de crédito o débito según se requiera, lo anterior resulta ser necesario para poder comenzar a recibir los productos y servicios así como para hacer el pago de los mismos, los demás productos y servicios ofrecidos como lo es, de forma enunciativa mas no limitativa, el pago de cuentas en restuatrentes, bares, cafeterías y hoteles, entre otros.
          </Text>
          <Text style={styles.paragraph}>
            Métodos de Pago. El Usuario se obliga a realizar el pago de los Servicios en pesos mexicanos. El cobro de los Servicios, incluyendo cualquier impuesto aplicable, se realizará a través de los siguientes motores de pagos: pasarelas de Tarjeta de Crédito y Tarjetas de Débito, Stripe, PayPal, Apple Pay, entre otros. El Prestador, para comodidad del Usuario, ofrece diferentes modalidades de pago que deberá elegir al crear su Usuario y código de acceso, siendo estos: (a) mediante los motores de pagos de: pasarelas de Tarjeta de Crédito y Tarjetas de Débito, Stripe, PayPal, Apple Pay, entre otros. Los cargos aquí mencionados se realizarán en cada exhibición.
          </Text>
          <Text style={styles.paragraph}>
            El Usuario, como único responsable del pago oportuno de los Servicios, se obliga a proporcionar datos reales, válidos y vigentes de la tarjeta de crédito, tarjeta de débito o motor de pagos, donde se realizará el cargo por exhibición. De igual manera, el Usuario declara y garantiza en este acto que los recursos económicos que serán invertidos para el pago de todas y cada una de las obligaciones conferidas en este documento, provienen de fuentes y/o actividades lícitas. En caso de que el Prestador no pueda realizar el mencionado cargo a la opción de pago elegido por el Usuario, el Prestador se reserva el derecho de revocar o restringir el acceso del Usuario a los Servicios hasta en tanto el pago sea realizado en su totalidad.
          </Text>
          <Text style={styles.paragraph}>
            Cualquier cargo operativo, o tasa establecidos por los servicios ofrecidos a través de servidores o portales de terceros (motores de pago o bancos), están completamente regulados por términos y condiciones dispuestos por dichos terceros o por las leyes aplicables, por lo cual el Usuario deslinda en este acto al Prestador de cualquier responsabilidad respecto a la forma, tiempo y cantidad en que sean efectuados los cobros, aún cuando dicho cobro sea considerado excedido, indebido o que viole algún derecho del Usuario. De esta forma, el Usuario se obliga a mantener en paz y a salvo en todo momento al Prestador de cualquier proceso judicial que se llegare a entablar por razón del uso de servidores o portales de terceros.
          </Text>
          <Text style={styles.paragraph}>
            Cualquier cambio en la forma de pago del Usuario, deberá ser realizado en línea. Dicho cambio podrá generar la interrupción temporal del acceso a los Servicios, mientras se realiza la verificación de la nueva información otorgada. El Usuario reconoce y acepta que el Prestador podrá usar los servicios de cobranza de terceros, con fines de cobro de cualquier adeudo pendiente de pago por razón de los Servicios, para lo cual, el Usuario se obliga a colaborar de buena fe para la liquidación total de los adeudos.
          </Text>
          <Text style={styles.paragraph}>
            En caso de que el Usuario por error, pague dos veces o más el mismo servicio, para efectos de que le sea devuelta la cantidad que haya pagado de más, deberá iniciar un proceso de aclaración enviando toda la documentación necesaria que compruebe tal circunstancia al siguiente correo electrónico contacto@tab-track.com y cuando el Usuario acredite de manera fehaciente que se realizó dos veces o más el pago de un mismo servicio relacionado con un mismo Usuario, Tab Track hará el reembolso al Usuario de la cantidad que se haya pagado de más.
          </Text>
          <Text style={styles.paragraph}>
            Facturación. En caso de que el Usuario requiera comprobante fiscal, deberá solicitarlo por medio de la página web. Dentro de la página web el Usuario deberá de completar sus datos fiscales completos y correctos, y podrá seleccionar la emisión de los comprobantes fiscales de manera automática. Es condición imprescindible para la emisión de dicho comprobante, que el Usuario compruebe fehacientemente el pago de los Servicios en cuestión. El servicio podrá ser facturado directamente por el prestador del servicio o vendedor del producto (socios comerciales). El Usuario acepta que el Prestador podrá contactarle periódicamente, vía correo electrónico a la dirección de correo electrónico asociada a su cuenta de registro, con avisos de facturación y otras comunicaciones relacionadas con los Servicios, ya sean de: i) promoción de productos propios o de terceros; ii) mejora en el servicio; iii) cambios en los Servicios, etc.
          </Text>
          <Text style={styles.paragraph}>
            Para llevar a cabo la facturación, deberá de ser solicitada a más tardar el antepenúltimo día hábil de cada mes contado después de la fecha de pago del servicio.
          </Text>
          <Text style={styles.paragraph}>
            Promociones, cupones y/o Códigos de Referencia. Tab Track se reserva el derecho a modificar total o parcialmente, abrir, suspender y/o cancelar los programas, promociones, cupones y códigos de referencia, así como de su duración y vigencia sin responsabilidad alguna, por lo que no serán objeto de devoluciones o indemnizaciones o compensaciones.
          </Text>
          <Text style={styles.paragraph}>
            Los códigos de referencia, promociones, cupones, etc. pueden variar sin previo aviso y los mismos no implican una cuota fija o retribución fija. Solamente se entregarán los cupones respectivos de cumplirse con el o los supuestos previstos y contenidos en los instructivos respectivos.
          </Text>
          <Text style={styles.paragraph}>
            Instructivos. Mediante la aceptación de los presentes términos y condiciones se acepta también el contenido y alcance de los instructivos de uso contenidos en los productos y/o servicios ofertados. Para un uso y funcionamiento correcto de los servicios y productos es necesario hacer caso y seguir los instructivos correspondientes. Así mismo, queda reservado el derecho de modificarlos sin necesidad de previo aviso.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>3. USO Y ACCESO A LA APP/Plataforma (Continuación)</Text>
          <Text style={styles.paragraph}>
            El Usuario es el único responsable frente al Prestador, y cualquier tercero, respecto de su conducta al acceder, consultar y proporcionar información en la APP/Plataforma y de las consecuencias que se puedan derivar de una utilización, con fines o efectos ilícitos o contrarios al objeto de la APP/Plataforma, su contenido, elaborado o no por el Prestador, publicado o no bajo su nombre de forma oficial; así como aquellas consecuencias que se puedan derivar de la utilización contraria al contenido de estos Términos que sea lesiva de los intereses o derechos de terceros, o que de cualquier forma pueda dañar, inutilizar o deteriorar la APP/Plataforma e impedir el normal disfrute de otros usuarios.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>4. USO DE OTROS PRODUCTOS Y SERVICIOS</Text>
          <Text style={styles.paragraph}>
            Los componentes o las funciones de los Servicios, incluidos aquellos que implican la compra y descarga de productos o servicios adicionales, requieren un software diferente u otros acuerdos de licencia o términos de uso, por lo que el Usuario deberá leer, aceptar y obligarse a aquellos términos de uso establecidos, de manera independiente, como condición para poder utilizar estos componentes o características particulares del Servicio.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>5. IMPRECISIONES DE LA APP/Plataforma</Text>
          <Text style={styles.paragraph}>
            El Contenido de la APP/Plataforma y/o de los Servicios provistos, pueden contener inexactitudes y/o errores tipográficos. El Prestador no garantiza la exactitud del Contenido y se reserva el derecho, a su entera discreción, de corregir cualquier error u omisión en cualquier parte de la APP/Plataforma y/o los Servicios y a realizar cualquier cambio en las características, funcionalidad o Contenido en cualquier momento. El Prestador, así como cualquier persona relacionada y/o afiliada al Prestador, incluyendo, sin limitar, directores, apoderados, representantes, administradores, empleados, accionistas y/o agentes, presentes o anteriores, o aliados, no serán responsables de errores u omisiones en los Contenidos de la APP/Plataforma.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>6. ESTANCIA EN LA APP/Plataforma</Text>
          <Text style={styles.paragraph}>
            El Usuario es el único responsable frente al Prestador, y cualquier tercero, respecto de su conducta al acceder, consultar y proporcionar información en la APP/Plataforma y de las consecuencias que se puedan derivar de una utilización, con fines o efectos ilícitos o contrarios al objeto de la APP/Plataforma, su contenido, elaborado o no por el Prestador, publicado o no bajo su nombre de forma oficial; así como aquellas consecuencias que se puedan derivar de la utilización contraria al contenido de estos Términos que sea lesiva de los intereses o derechos de terceros, o que de cualquier forma pueda dañar, inutilizar o deteriorar la APP/Plataforma e impedir el normal disfrute de otros usuarios
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>7. RESPONSABILIDAD RESPECTO A LOS CONTENIDOS</Text>
          <Text style={styles.sectionTitle}>Uso correcto de los Contenidos.</Text>
          <Text style={styles.paragraph}>El Usuario se compromete a:</Text>
          <Text style={styles.paragraph}>
            utilizar la APP/Plataforma y sus Contenidos de acuerdo a las leyes aplicables y de orden público, absteniéndose de realizar acto que menoscabe, deteriore, inutilice o dañe la imagen y/o información divulgada por el Prestador o de alguna manera lesione derechos o intereses de terceras personas, vinculadas directa o indirectamente a éste;
          </Text>
          <Text style={styles.paragraph}>
            no copiar, difundir, modificar, reproducir, distribuir o utilizar de manera alguna con o sin fines de lucro los contenidos y los elementos utilizados en la APP/Plataforma, a menos que se cuente con la autorización expresa y por escrito del Prestador;
          </Text>
          <Text style={styles.paragraph}>
            no modificar o manipular las marcas, logotipos, avisos comerciales, nombres comerciales y signos distintivos en general del Prestador, de la APP/Plataforma o de las personas vinculadas con el Prestador (salvo que cuente con su autorización por escrito);
          </Text>
          <Text style={styles.paragraph}>
            suprimir, eludir o modificar los Contenidos y los elementos utilizados en la APP/Plataforma, así como los dispositivos técnicos de protección, o cualquier mecanismo o procedimiento establecido en la APP/Plataforma.
          </Text>
          <Text style={styles.paragraph}>
            Queda excluida de los puntos anteriores, aquella información generada a través de la APP/Plataforma para uso y manejo del Usuario, misma que podrá ser impresa y/o copiada para los intereses que más convengan al mismo. En caso de que el Usuario sea una persona moral, se apegará a lo dispuesto por el artículo 148, fracción IV de la Ley Federal del Derecho de Autor. El Usuario reconoce y acepta que el uso de la APP/Plataforma y de los Contenidos, es bajo su exclusiva y estricta responsabilidad, por lo que el Prestador no será, en ningún momento y bajo ninguna circunstancia, responsable por cualquier desperfecto o problema que se presente en el equipo de cómputo (hardware) o programas de cómputo (software) que utilice el Usuario para acceder o navegar en cualquier parte de la APP/Plataforma.
          </Text>
          <Text style={styles.paragraph}>
            El Prestador tiene derecho a realizar, durante intervalos temporales definidos, campañas promocionales para promover el registro de nuevos miembros en la APP/Plataforma. El Prestador se reserva el derecho de modificar los términos y condiciones de los Servicios, así como de proceder a la exclusión de cualquiera de los mismos. El Prestador declara que todos los Contenidos, y los elementos utilizados en la APP/Plataforma, se encuentran debidamente registrados y protegidos bajo las autoridades y leyes correspondientes en México. El Usuario se obliga a respetar todos los derechos contenidos en el Aviso de Derecho de Autor establecido en la APP/Plataforma.
          </Text>
          <Text style={styles.sectionTitle}>APP/Plataforma y contenidos ajenos a la APP/Plataforma y a los Contenidos del Prestador.</Text>
          <Text style={styles.paragraph}>
            El Prestador podrá hacer uso de su derecho de publicación de cualquier material informativo y/o de sitios o subsitios propiedad de terceros, vinculados o no al Prestador, que considere de interés para los Usuarios. No obstante lo anterior, el Prestador se deslinda de toda responsabilidad, del acceso y/o uso que realice el Usuarios de la información ahí contenida y/o del uso, origen y destino de la información que se desprenda de ligas distintas (vínculo, hipervínculo, link). Toda publicación realizada dentro de la APP/Plataforma, por parte de los Usuarios, no genera obligación de pago ante terceros por razón de promoción, publicación y/o manejo de información y/o imagen, a menos que se cuente con un contrato previamente firmado con el Prestador.
          </Text>
          <Text style={styles.sectionTitle}>Negación y retiro de acceso a la APP/Plataforma y los Contenidos.</Text>
          <Text style={styles.paragraph}>
            El Prestador se reserva el derecho a negar o retirar el acceso a la APP/Plataforma, o sus Contenidos, en cualquier momento, sin responsabilidad alguna para el Prestador y sin previo aviso al Usuario o usuarios que incumplan de manera total o parcial con las condiciones aquí establecidas y/o que realicen acciones o actos tendientes a:
          </Text>
          <Text style={styles.paragraph}>
            “asediar” o de otra manera acosar o molestar a otros Usuarios;
          </Text>
          <Text style={styles.paragraph}>
            hacerse pasar como representante o empleado del Prestador, realizando declaraciones falsas o de otro modo erróneas de su vinculación con el Prestador;
          </Text>
          <Text style={styles.paragraph}>
            recopilar o almacenar datos personales de otros usuarios en relación con la conducta y las actividades prohibidas;
          </Text>
          <Text style={styles.paragraph}>
            falsificar encabezados o manipular identificadores de la APP/Plataforma, con la finalidad de ocultar el origen de los Contenidos;
          </Text>
          <Text style={styles.paragraph}>
            cargar, publicar, enviar por correo electrónico, transmitir o proporcionar de otro modo, cualquier contenido respecto del cual no tenga derecho a transmitir, en virtud de los términos contenidos en la Ley Federal de Protección a la Propiedad Industrial (“LFPPI”), la Ley Federal del Derecho de Autor (“LFDA”), y la Ley Federal de Protección de Datos Personales en Posesión de Particulares (“LFPDPPP”) o de relaciones contractuales protegidos por convenios de confidencialidad y no divulgación;
          </Text>
          <Text style={styles.paragraph}>
            cargar, publicar, enviar por correo electrónico, transmitir o proporcionar de otro modo, materiales que contengan virus informáticos o cualquier otro código informático, archivos o programas diseñados para interrumpir, destruir o limitar la funcionalidad del software, hardware o de equipos de telecomunicaciones conectados a la APP/Plataforma;
          </Text>
          <Text style={styles.paragraph}>
            hacer uso de la APP/Plataforma de una manera que pudiera dañar, deshabilitar, recargar o alterar los servidores del Prestador o las conexiones de redes;
          </Text>
          <Text style={styles.paragraph}>
            ignorar requisitos, procedimientos, políticas o normas de redes conectadas a la APP/Plataforma que pudieran interferir con el uso y goce de la APP/Plataforma por parte de cualquier tercero; y
          </Text>
          <Text style={styles.paragraph}>
            acceder de manera no autorizada a cuentas, sistemas informáticos o redes conectadas a los servidores del Prestador, a través de ataques propios de piratas informáticos, el descifrado de contraseñas o cualquier otro método para obtener o tratar de obtener materiales o información con cualquier medio que no se ofrece intencionalmente a través de la APP/Plataforma.
          </Text>
          <Text style={styles.paragraph}>
            El Usuario acepta indemnizar y mantener en paz y a salvo al Prestador y sus funcionarios, agentes, empleados, socios, proveedores y licenciantes frente a cualquier reclamo o demanda, así como a cubrir los honorarios razonables de abogados, que promueva cualquier tercero en contra del Prestador a causa del contenido que el Usuario envíe, publique, transmita o proporcione de un modo distinto al previsto en la APP/Plataforma. Lo anterior, sin perjuicio del derecho del Prestador de realizar las acciones judiciales necesarias para reclamar los daños y perjuicios que dichas acciones por parte del Usuario pudieran causarle.
          </Text>
          <Text style={styles.sectionTitle}>Responsabilidad respecto a los Contenidos.</Text>
          <Text style={styles.paragraph}>
            El Prestador no asume responsabilidad alguna derivada, de manera enunciativa más no limitativa de: (i) la utilización que el Usuario pueda hacer de los materiales de esta APP/Plataforma, o de los Contenidos, o de los sitios web de enlace, ya sean prohibidos o permitidos, en infracción de los derechos de propiedad intelectual y/o industrial de contenidos de la web o de terceros; (ii) los eventuales daños y perjuicios al Usuario causados por un funcionamiento normal o anormal de las herramientas de búsqueda, de la organización o la localización de los Contenidos y/o acceso a la APP/Plataforma y, en general, de los errores o problemas que se generen en el desarrollo o instrumentación de los elementos técnicos que la APP/Plataforma facilite al Usuario; (iii) los contenidos de aquellas páginas a las que el Usuario pueda acceder desde enlaces incluidos en la APP/Plataforma, ya sean autorizados o no; (iv) los actos u omisiones de terceros, independientemente de la relación que dichos terceros pudieran tener con el Prestador; (v) el acceso de menores de edad a los Contenidos, así como el envío de información personal que estos pudieran realizar; (vi) las comunicaciones o diálogos en el transcurso de los debates, foros, chats y comunidades virtuales que se organicen a través de o en torno a la APP/Plataforma de enlace, ni responderá, por tanto, de los eventuales daños y perjuicios que sufra el Usuario a consecuencia de dichas comunicaciones y/o diálogos; etc.
          </Text>
          <Text style={styles.sectionTitle}>Responsabilidad respecto a fallas tecnológicas.</Text>
          <Text style={styles.paragraph}>
            El Prestador no será responsable en forma alguna, cuando se produzcan: (i) errores o retrasos en el acceso a la APP/Plataforma a la hora de introducir los datos en el formulario de solicitud, la lentitud o imposibilidad de recepción por parte de los destinatarios de la confirmación de la solicitud o cualquier anomalía que pueda surgir cuando tales incidencias sean debidas a problemas en la red Internet, caso fortuito o fuerza mayor o cualquier otra contingencia imprevisible ajena al Prestador; (ii) fallos o incidencias que pudieran producirse en las comunicaciones, ya sea borrándose o por transmisiones incompletas, de manera que no se garantiza que los servicios de la APP/Plataforma estén constantemente operativos; (iii) de los errores o daños producidos a la APP/Plataforma por un mal uso del servicio por parte del Usuario; (iv) de la no operatividad o problemas en la dirección de correo electrónico facilitada por el Usuario para el envío de la confirmación de la solicitud realizada. En todo caso, el Prestador se compromete a solucionar los problemas que puedan surgir y a ofrecer todo el apoyo necesario al Usuario para llegar a una solución rápida y satisfactoria de la incidencia. Asimismo, el Prestador tiene derecho a realizar durante intervalos temporales definidos, campañas promocionales para promover el registro de nuevos miembros en su servicio. El Prestador se reserva el derecho de modificar las condiciones de comercio electrónico, así como proceder a la exclusión de cualquiera de los términos allí contenidos.
          </Text>
        </View>
                <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>8. DE LOS DATOS SOLICITADOS</Text>
          <Text style={styles.paragraph}>
            El Usuario reconoce y acepta que, para el cumplimiento del objetivo de la APP/Plataforma, será necesario que el Prestador recabe datos personales y datos personales sensibles, a fin de incluirla en formatos, listados, bases de datos u otros medios físicos, digitales y/o electrónicos, para llevar a cabo el registro adecuado de los mismos y ofrecer los Servicios. El Prestador no se responsabiliza de las consecuencias que pudieran derivarse de la omisión, consciente o inconsciente, hecha por parte del Usuario al respecto.
          </Text>
          <Text style={styles.paragraph}>
            Por tal motivo, mediante la aceptación a los presentes Términos, el Usuario renuncia expresamente a presentar cualquier tipo de reclamación, demanda, juicio o procedimiento legal ante cualquier autoridad mexicana o extranjera en contra del Prestador, así como cualquier persona relacionada y/o afiliada al Prestador, incluyendo, sin limitar, directores, apoderados, representantes, administradores, empleados, accionistas y/o agentes, presentes o anteriores, por cualquier acto que se derive, o pudiere derivar, del uso de la APP/Plataforma y de los Servicios, o de cualquier servicio derivado de dicho uso.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>9. DATOS DE CARÁCTER PERSONAL</Text>
          <Text style={styles.paragraph}>
            En cumplimiento a los términos previstos en la LFPDPPP, el Prestador, como responsable del tratamiento de sus datos personales, hace del conocimiento del Usuario que la información que el Usuario provea en esta APP/Plataforma será tratada de conformidad con lo indicado en el Aviso de Privacidad contenido en la APP/Plataforma. Para utilizar o gozar de algunos de los Contenidos, es necesario que el Usuario proporcione previamente al Prestador ciertos datos de carácter personal (“Datos Personales”).
          </Text>
          <Text style={styles.paragraph}>
            Al acceder a la APP/Plataforma, o a cualquiera de los Contenidos en que los Datos Personales son requeridos, el Usuario está autorizando al Prestador a realizar análisis y estudios con base en ellos. El Usuario se obliga a proporcionar Datos Personales verdaderos y fidedignos. En caso de que el Usuario diera información falsa o confusa, el Prestador no asume responsabilidad alguna de los resultados que dichos actos ocasionen al Usuario, teniendo la facultad de negar el acceso a la APP/Plataforma y sus Contenidos, sin perjuicio de que pueda requerir las indemnizaciones a que hubiere lugar.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>10. MANEJO DE LOS DATOS E INFORMACIÓN</Text>
          <Text style={styles.paragraph}>
            Toda la información que el Usuario proporcione, durante su acceso a la APP/Plataforma, es de carácter estrictamente confidencial y será manipulada únicamente por personal interno del Prestador. Tal y como se refiere en el Aviso de Privacidad, los Datos Personales de los Usuarios podrán encontrar como fin primario o secundario la promoción de servicios, por lo cual el Usuario, en este acto autoriza y manifiesta su aceptación en la utilización de sus datos para fines estadísticos, promocionales y de mercadotecnia, así como cualquier otro establecido en el presente documento o en el multicitado Aviso de Privacidad.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>11. Medios para ejercer los derechos de acceso, rectificación, cancelación y oposición (ARCO) de los datos personales:</Text>
          <Text style={styles.paragraph}>
            El Prestador es encargado de datos personales en los términos establecidos a lo largo de estos términos y condiciones. Por lo tanto, usted podrá limitar el uso o divulgación de sus datos personales mediante comunicación dirigido al correo contacto@tab-track.com
          </Text>
          <Text style={styles.paragraph}>
            EL usuario tiene derecho de: (i) acceder a sus datos personales en nuestro poder y conocer los detalles del tratamiento de los mismos; (ii) rectificarlos en caso de ser inexactos o incompletos; (iii) cancelarlos cuando considere que no se requieren para alguna de las finalidades señaladas en los presentes términos y condiciones, estén siendo utilizados para finalidades no consentidas o haya finalizado la relación contractual o de servicio; o (iv) oponerse al tratamiento de los mismos para fines específicos, según lo diga la ley, (conjuntamente, “Derechos ARCO”).
          </Text>
          <Text style={styles.paragraph}>
            Los Derechos ARCO se ejercerán mediante la presentación de la solicitud respectiva, la cual puede ser solicitada contacto@tab-track.com, la “Solicitud ARCO” a cuál deberá ser enviada acompañada de la siguiente información y documentación:
          </Text>
          <Text style={styles.paragraph}>
            Su nombre, domicilio y correo electrónico para poder comunicarle la respuesta a la Solicitud ARCO;
          </Text>
          <Text style={styles.paragraph}>
            Los documentos que acrediten su identidad (copia de INE, pasaporte o cualquier otra identificación oficial) o en su caso, los documentos que acrediten su representación legal;
          </Text>
          <Text style={styles.paragraph}>
            Una descripción clara y precisa de los datos personales respecto de los cuales busca ejercer alguno de los Derechos ARCO;
          </Text>
          <Text style={styles.paragraph}>
            Cualquier documento o información que facilite la localización de sus datos personales;
          </Text>
          <Text style={styles.paragraph}>
            En caso de solicitar una rectificación de datos, deberá de indicar también, las modificaciones a realizarse y aportar la documentación que sustente su petición; y
          </Text>
          <Text style={styles.paragraph}>
            La indicación del lugar donde podremos revisar los originales de la documentación que acompañe.
          </Text>
          <Text style={styles.paragraph}>
            Su Solicitud ARCO será contestada mediante un correo electrónico por parte de El Prestador en un plazo máximo de 30 (treinta) días hábiles contados desde el día en que se haya recibido su Solicitud ARCO. En caso de que la Solicitud ARCO se conteste de manera afirmativa o procedente, tales cambios se harán en un plazo máximo de 15 (quince) días hábiles. Los plazos referidos en este párrafo se podrán prorrogar por una vez por un periodo igual en caso de ser necesario.
          </Text>
          <Text style={styles.paragraph}>
            Es importante comunicarle que Tab Track podrá negar el acceso (la, “Negativa”) para que usted ejerza sus derechos ARCO en los siguientes supuestos:
          </Text>
          <Text style={styles.paragraph}>
            Cuando Usted no sea el titular de los datos personales, o su representante legal no esté debidamente acreditado para ejercer por medio de él, sus Derechos ARCO;
          </Text>
          <Text style={styles.paragraph}>
            Cuando en nuestra base de datos no se encuentren sus datos personales;
          </Text>
          <Text style={styles.paragraph}>
            Cuando se lesionen los derechos de un tercero;
          </Text>
          <Text style={styles.paragraph}>
            Cuando exista un impedimento legal o la resolución de una autoridad competente, que restrinja sus Derechos ARCO; y
          </Text>
          <Text style={styles.paragraph}>
            Cuando la Rectificación, Cancelación u Oposición haya sido previamente realizada.
          </Text>
          <Text style={styles.paragraph}>
            Cuando el instrumento notarial se haya firmado y asentado en acta
          </Text>
          <Text style={styles.paragraph}>
            En relación con lo anterior, la Negativa podrá ser parcial, en cuyo caso El Prestador efectuará el acceso, rectificación, cancelación u oposición en la parte procedente.
          </Text>
          <Text style={styles.paragraph}>
            El Prestador siempre le informará el motivo de su decisión y se le comunicará a Usted o en su caso, al representante legal, en los plazos anteriormente establecidos. Se le notificará por medio de correo electrónico, acompañado con las pruebas que resulten pertinentes, en caso que lo amerite.
          </Text>
          <Text style={styles.paragraph}>
            El ejercicio de los Derechos ARCO será gratuito, previa acreditación de su identidad ante el Responsable, pero si El Usuario reitera su solicitud en un periodo menor a doce meses, los costos serán de tres días de Salario Mínimo General Vigente en el Estado de Querétaro, más I.V.A., a menos que existan modificaciones sustanciales a los términos y condiciones que motiven nuevas consultas. En todos los casos, la entrega de los datos personales será gratuita, con la excepción de que El usuario deberá de cubrir los gastos justificados de envío o el costo de reproducción en copias u otros formatos.
          </Text>
          <Text style={styles.paragraph}>
            EL USUARIO podrá revocar el consentimiento que ha otorgado a El Prestador para el tratamiento de los datos personales que no sean indispensables para el cumplimiento de las obligaciones derivadas del vínculo jurídico que les une, a fin de que El Prestador deje de hacer uso de los mismos. Para ello, es necesario que El Usuario presente su petición en los términos antes mencionados.
          </Text>
        </View>
                <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>12. INDICADORES DE DATOS</Text>
          <Text style={styles.paragraph}>
            La información que el Usuario provea en la APP/Plataforma, real o histórica, se procesa y ordena, para que genere indicadores de datos, mismos que el Prestador podrá usar para tomar decisiones pertinentes a su negocio, siempre de manera estadística y no individualizada. El Usuario, en este acto, autoriza el acceso al Prestador a la información proporcionada y generada en la APP/Plataforma, en términos del presente documento y del Aviso de Privacidad.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>13. DE LA INFORMACIÓN PROVISTA POR EL USUARIO</Text>
          <Text style={styles.paragraph}>
            El Usuario reconoce y acuerda que el Prestador puede, durante la vigencia de los Servicios, depender de o usar datos, material u otra información entregada por el Usuario, y que para ello no requieren investigación independiente alguna o verificación, por lo que el Prestador estará facultado para basarse en la exactitud y plenitud de dicha información para prestar los Servicios. El Usuario es responsable de la información que comparten a terceros y a quiénes es compartida, por lo cual se deslinda en este acto de cualquier responsabilidad presente o futura a el Prestador.
          </Text>
          <Text style={styles.paragraph}>
            Asimismo, toda la información que el Usuario publiquen por cualquier otro medio pierde de manera inmediata y para siempre el carácter de secrecía y confidencialidad, liberando de toda responsabilidad el Prestador respecto a su uso y divulgación, sujeto a los términos y condiciones establecidos en el Aviso de Privacidad, cuando aplique.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>14. RESPONSABILIDAD Y CALIDAD EN LA PRESTACIÓN DE LOS SERVICIOS</Text>
          <Text style={styles.paragraph}>
            El Usuario reconoce que la APP/Plataforma es una herramienta tecnológica que es un medio para que el Usuario pueda desarrollar una actividad específico, por lo cual acepta que el Prestador no garantiza la calidad, idoneidad y/o disponibilidad de los servicios brindados o solicitados a través del uso de la APP/Plataforma y/o mediante su uso. El Usuario expresamente reconoce y acepta todos y cada uno de los riesgos derivados del uso de la APP/Plataforma, liberando al Prestador de cualquier responsabilidad presente o futura que se pudiera presentar. En este sentido, el Prestador no será responsable frente al Usuario, o cualquier persona relacionada a este, por cualquier tipo de daño o reclamo derivado de deficiencias en los Servicios, o por cualquier error, omisión y/o falsedad en la información proporcionada por el Usuario, ya sea a través de la APP/Plataforma o cualquier otro medio.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>15. EXCLUSIÓN DE GARANTÍAS Y DE RESPONSABILIDAD</Text>
          <Text style={styles.paragraph}>
            El Usuario es el único responsable del uso que haga a la APP/Plataforma y su Contenido. El Usuario reconoce que la información de la APP/Plataforma y de los Servicios se proporcionan “como están”, sin ninguna garantía expresa o implícita de comerciabilidad o de aptitud para un fin determinado. El Prestador no garantiza la precisión ni la integridad de la información, textos, gráficos, enlaces u otros elementos contenidos en la APP/Plataforma o Contenido. El Prestador no garantiza la operación ininterrumpida o libre de todo error de la APP/Plataforma y/o su Contenido. Puesto que toda la información referida en la APP/Plataforma y su Contenido se encuentra en la nube, el Prestador no controla ni garantiza la ausencia de virus en los Contenidos, ni la ausencia de otros elementos en los Contenidos que puedan producir alteraciones en el sistema informático del Usuario (software y/o hardware) o en los documentos electrónicos almacenados en su sistema informático.
          </Text>
          <Text style={styles.paragraph}>
            Todo material descargado u obtenido de un modo distinto al previsto en la APP/Plataforma, será bajo responsabilidad y riesgo único del Usuario, respecto de los daños que pudiera causar en el sistema informático del dispositivo a través del cual realice su conexión y/o la pérdida de datos que derive de la descarga de ese material. En ningún caso, ni el Prestador ni sus proveedores serán responsables de daño alguno derivado del uso de la APP/Plataforma o Contenido, o de no poder usarlos (EN PARTICULAR, SIN LIMITACIÓN ALGUNA, DE LOS DAÑOS DIRECTOS O INDIRECTOS, MORALES, INCIDENTALES, EXCESIVOS, REMOTOS Y/O EVENTUALES, PERJUICIOS, LUCRO CESANTE, INTERRUPCIÓN DE LA ACTIVIDAD COMERCIAL O PÉRDIDA DE INFORMACIÓN O DATOS Y/O INFRACCIONES DE SEGURIDAD), aún cuando se hubiera advertido al Prestador de dicha posibilidad.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>16. USO DE COOKIES</Text>
          <Text style={styles.paragraph}>
            El Prestador informa al Usuario que, mediante el uso de cookies y tecnologías similares, busca: i) garantizar la mejor experiencia posible en la APP/Plataforma; y ii) proporcionar al Usuario información sobre sus preferencias de servicios y de mercadeo, ayudándolo así a obtener la información adecuada. En caso de que el Usuario requiera de mayor información respecto al uso de cookies y tecnologías similares, el Prestador pone a su disposición la Política de Uso de Cookies.
          </Text>
        </View>
                <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>17. COMPATIBILIDAD DE LOS DISPOSITIVOS ELECTRÓNICOS</Text>
          <Text style={styles.paragraph}>
            El Usuario será responsable de obtener los dispositivos o hardware que sean compatibles con la APP/Plataforma y los Servicios, toda vez que el Prestador no garantiza que estos funcionen correctamente en cualquier dispositivo. De igual manera, el Usuario acepta no utilizar dispositivos, software o cualquier otro medio tendiente a interferir tanto en las actividades y/u operaciones de los Servicios o en la APP/Plataforma o en las bases de datos y/o información que se contenga en el mismo.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>18. MANTENIMIENTO DE LA APP/PLATAFORMA</Text>
          <Text style={styles.paragraph}>
            Para llevar a cabo trabajos de mantenimiento, el Prestador se reserva el derecho de suspender el acceso y/o modificar el Contenido, así como a eliminar o deshabilitar el acceso a la APP/Plataforma o a los Servicios, sin previo aviso. El acceso a la APP/Plataforma y los Servicios depende de la disponibilidad de la red que tenga el Usuario, por lo que el Prestador no será responsable por cualquier imposibilidad de acceder a la misma, derivada de circunstancias que se encuentren fuera de control del Prestador, así como por caso fortuito o de fuerza mayor. El Prestador, cuando lo considere necesario para el correcto funcionamiento de la APP/Plataforma, podrá realizar los parches, actualizaciones, correcciones de “bugs” y mejoras menores a la APP/Plataforma.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>19. SOPORTE</Text>
          <Text style={styles.paragraph}>
            El Prestador ofrece al Usuario el servicio de soporte técnico y orientación básica para la utilización de las herramientas y las funcionalidades de la APP/Plataforma, pudiendo ser por vía Chat en Línea, correo electrónico, o cualquier otro medio que el Prestador considere conveniente y factible, en los horarios indefinidos que de igual forma designe para tal efecto, mediante previo aviso. Este servicio no tendrá ningún costo adicional. Asimismo, el Usuario que hubiere solicitado el Soporte, acepta y autoriza al Prestador para tener acceso pleno a toda la información proporcionada en la APP/Plataforma, sin ninguna limitación. En este sentido y en beneficio del Usuario, el Prestador se obliga a guardar plena secrecía y confidencialidad, respecto a la información a la que tenga acceso.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>20. PROPIEDAD INDUSTRIAL Y DERECHO DE AUTOR</Text>
          <Text style={styles.paragraph}>
            El Prestador autoriza al Usuario a utilizar la APP/Plataforma, exclusivamente bajo los términos aquí expresados, sin que ello implique que concede al Usuario licencia o autorización alguna, o algún tipo de derecho distinto al antes mencionado, respecto de la Propiedad Industrial y Derecho de Autor del Prestador, entendiéndose como ello: todas las marcas registradas y/o usadas en México o en el extranjero por el Prestador; todo derecho sobre invenciones (patentadas o no), diseños industriales, modelos de utilidad, información confidencial, nombres comerciales, secretos industriales, avisos comerciales, reservas de derechos, nombres de dominio; así como todo tipo de derechos patrimoniales sobre obras y creaciones protegidas por derechos de autor y demás formas de propiedad industrial o intelectual reconocida o que lleguen a reconocer las leyes correspondientes.
          </Text>
          <Text style={styles.paragraph}>
            El Usuario reconoce y acepta que el Prestador es legítimo propietario, o tiene los derechos necesarios, sobre la APP/Plataforma, incluidos los nombres comerciales del Prestador, marcas comerciales, marcas de servicio, logotipos, nombres de dominio y otras características distintivas de la marca contenidas en ellos (las “Marcas Registradas del Prestador”), independientemente de que esos derechos estén registrados o no, y de cualquier lugar del mundo en el que puedan existir esos derechos, y que están protegidos por las leyes y tratados internacionales sobre propiedad industrial y derecho de autor. Por lo anterior, el Usuario acepta que las Marcas Registradas del Prestador no podrán ser objeto de copia, reproducción, modificación, publicación, carga, envío, transmisión o distribución en modo alguno. Salvo indicación expresa en contrario en este documento, el Prestador no concede al Usuario ningún derecho expreso ni implícito en virtud de patentes, derecho de autor, marcas comerciales o información de secretos industriales. El Usuario reconoce y conviene que la APP/Plataforma, así como todos los diseños del mismo, son y, serán en todo momento, propiedad del Prestador.
          </Text>
          <Text style={styles.paragraph}>
            Retroalimentación. En caso de que el Usuario proporcione algún comentario al Prestador respecto de la funcionalidad y el rendimiento de la APP/Plataforma (incluida la identificación de posibles errores y mejoras), en este acto, el Usuario autoriza al Prestador para que haga uso, sin restricción, de todos los derechos, títulos e intereses sobre los comentarios expresados. Lo anterior, sin que ello se considere como un derecho moral del Usuario para requerir participación o retribución monetaria alguna, o restricción en el uso de dichos comentarios para su explotación por parte del Prestador.
          </Text>
        </View>
                <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>21. OTRAS DISPOSICIONES</Text>
          <Text style={styles.paragraph}>
            El Usuario acepta que una versión impresa de los presentes Términos, y de cualquier comunicación enviada y/o recibida en forma electrónica, será admisible como medio probatorio en cualquier procedimiento judicial y/o administrativo.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>22. MODIFICACIÓN DE LOS TÉRMINOS Y CONDICIONES DE USO DE LA APP/Plataforma</Text>
          <Text style={styles.paragraph}>
            El Prestador se reserva el derecho de, en cualquier momento, modificar y/o renovar unilateralmente y sin previo aviso los términos y condiciones de uso de la APP/Plataforma, con la obligación de publicar un mensaje en la APP/Plataforma que contenga un aviso al Usuario de que han sido realizadas ciertas modificaciones a los Términos. Será derecho exclusivo del Usuario, el aceptar o rechazar dichas modificaciones. En caso de que el Usuario no esté de acuerdo con las modificaciones hechas, podrá enviar solicitud de cancelación y terminación de su cuenta en la APP/Plataforma, al Correo Electrónico. El Prestador se compromete a hacer efectiva la cancelación de la cuenta en un plazo no mayor a 30 (treinta) días naturales, a partir de la fecha de recepción de la solicitud del Usuario.
          </Text>
          <Text style={styles.paragraph}>
            Asimismo, el Prestador se reserva el derecho, en cualquier momento y sin previo aviso, de eliminar o deshabilitar el acceso del Usuario a la APP/Plataforma. El Usuario siempre dispondrá de los Términos en la APP/Plataforma de forma visible, y libremente accesible para cuantas consultas quiera realizar. En cualquier caso, la aceptación de estos Términos será un paso previo e indispensable a la adquisición de cualquier Servicio.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>23. DIVISIBILIDAD</Text>
          <Text style={styles.paragraph}>
            En caso de que cualquier término, condición o estipulación contenida en estos Términos se determine ineficaz, ilegal o sin efecto, el mismo podrá ser excluido del cuerpo del presente y el restante continuará en vigor y efecto en forma tan amplia como en derecho proceda.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>24. ACTUALIZACIONES</Text>
          <Text style={styles.paragraph}>
            El Prestador podrá revisar y actualizar, en cualquier momento, estos Términos, manteniendo en todo momento el acceso libre a todo usuario que desee conocerlo. El Prestador se reserva el derecho de modificar, en cualquier momento, la presentación y configuración de la APP/Plataforma, así como estos Términos. Por ello, el Prestador recomienda al Usuario dar lectura atenta cada vez que acceda a la APP/Plataforma. No obstante lo anterior, el Usuario siempre dispondrá de estos Términos en la APP/Plataforma, de forma visible y accesible en cualquier momento. Algunas cláusulas de estos Términos pueden estar supeditadas a términos y condiciones designados expresamente y que se encuentren en la APP/Plataforma o en determinados sitios web.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>25. DERECHOS</Text>
          <Text style={styles.paragraph}>
            Cualquier derecho que no se haya conferido expresamente en este documento, se entiende reservado al Prestador.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>26. LEY Y JURISDICCIÓN APLICABLE</Text>
          <Text style={styles.paragraph}>
            En todo lo relacionado con la interpretación y cumplimiento de lo aquí dispuesto, las Partes aceptan someterse a las legislación federal de México y a la jurisdicción de los tribunales competentes en el Estado de Querétaro, México; renunciando a cualquier otra jurisdicción que, por razón de sus domicilios presentes o futuros, pudiese corresponderles.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>27. FORMA DIGITAL, ELECTRÓNICA O EN LÍNEA</Text>
          <Text style={styles.paragraph}>
            La Partes acuerdan que la forma para perfeccionar el acuerdo de voluntades entre ellas es el de formato Digital, Electrónico o en Línea, en donde bastará manifestar su voluntad por medio de la aceptación de los presentes Términos, así como proporcionar los datos personales o información bancaria en la APP/Plataforma o en las distintas aplicaciones de los licenciantes, sin requerir estampar la firma en documento alguno.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>28. ACEPTACIÓN DE LOS TÉRMINOS</Text>
          <Text style={styles.paragraph}>
            El Usuario reconoce que, mediante el acceso, suscripción y uso de la APP/Plataforma, los Servicios y/o Contenidos o derivados, manifiesta su aceptación plena y sin reservas y, por tanto, su adhesión a la versión de los Términos publicada en el momento en que acceda a la APP/Plataforma, en términos de lo establecido por los artículos 1803 y 1834 Bis del Código Civil Federal, 80, 81, 89 y demás relativos y aplicables del Código de Comercio y la legislación aplicable para México. Es responsabilidad única y exclusiva del Usuario, leer previamente estos Términos y sus modificaciones correspondientes, cada vez que accede a la APP/Plataforma. Si en cualquier momento, el Usuario no estuviera de acuerdo, total o parcialmente con los presentes Términos, deberá abstenerse inmediatamente de acceder y usar la APP/Plataforma y los Servicios provistos. Por lo anterior, con la aceptación de los presentes Términos, el Usuario consiente expresamente sujetarse a los mismos, celebrando así un acuerdo de uso de APP/Plataforma con el Prestador, por lo que manifiesta haber leído el contenido de todas y cada una de las disposiciones y ratifica su contenido.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>29. ACUERDO TOTAL</Text>
          <Text style={styles.paragraph}>
            El Usuario reconoce y acepta que el Prestador puso a su disposición toda la información necesaria para entender el alcance y características de la APP/Plataforma y los Servicios. De igual forma, manifiesta que, previo al acceso a la APP/Plataforma, analizó las características de esta y, por consiguiente, está de acuerdo con ella.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.paragraph}>
            Fecha de primera emisión: 09/07/2025
          </Text>
          <Text style={styles.paragraph}>
            Fecha de última modificación: 09/07/2025
          </Text>
        </View>

        {/* Aquí termina el contenido de los Términos y Condiciones */}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '000',paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#0046ff',
  },
  logo: { width: 120, height: 40 },
  iconButton: { padding: 8 },
  mainTitle: {
    fontSize: 22,
    textAlign: 'center',
    marginVertical: 12,
    color: '#000',
    fontFamily: 'Montserrat-Bold',
  },
  contentContainer: { paddingHorizontal: 16, paddingBottom: 24 },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 8,
    color: '#000',
    fontFamily: 'Montserrat-Bold',
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 20,
    color: '#000',
    marginBottom: 8,
    fontFamily: 'Montserrat-Regular',
  },
  listContainer: { marginTop: 8, paddingLeft: 16 },
  listItem: { fontSize: 14, lineHeight: 20, marginBottom: 4, color: '#555555' },
  
});

export default TermsAndConditions;