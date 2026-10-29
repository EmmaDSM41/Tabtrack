// En el archivo de PAYMENTMETHODS 


/* Busca (dentro de renderExternalWallets, en el bloque de PayPal):
 */
jsx
  <TouchableOpacity
    style={styles.walletOptionMain}
    activeOpacity={0.88}
    onPress={startPaypalSetup}
    disabled={paypalConnecting}
  >
    <View style={styles.walletLogo}>
      <Ionicons name="logo-paypal" size={23} color="#003087" />

{/* Cámbialo por:
 */}
jsx
  <TouchableOpacity
    style={styles.walletOptionMain}
    activeOpacity={0.88}
    onPress={openPaypalDetailScreen}
  >
    <View style={styles.walletLogo}>
      <Ionicons name="logo-paypal" size={23} color="#003087" />



{/* El cambio anterior es de el punto 27 */}