import * as LocalAuthentication from 'expo-local-authentication';

export async function canUseBiometrics() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  return hasHardware && isEnrolled;
}

export async function requestBiometricUnlock() {
  return LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock RefZone Mobile',
    fallbackLabel: 'Use PIN',
    cancelLabel: 'Cancel',
  });
}
