import { NativeModules } from 'react-native';

const { MagnesModule } = NativeModules;

export async function getClientMetadataId() {
  if (!MagnesModule) {
    console.warn('MagnesModule no está disponible (¿falta rebuild nativo?)');
    return null;
  }
  return await MagnesModule.collectDeviceData();
}