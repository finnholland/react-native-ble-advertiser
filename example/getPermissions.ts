import { Alert, Platform } from "react-native";
import BLEAdvertiser from "react-native-ble-advertiser";
import { requestMultiple, PERMISSIONS } from "react-native-permissions";

export async function requestLocationPermission() {
  const blueoothActive = await BLEAdvertiser.getAdapterState()

  if (!blueoothActive) {
    await Alert.alert(
      'Example requires bluetooth to be enabled',
    )
  }

  if (Platform.OS === 'android') {
    const granted = await requestMultiple([PERMISSIONS.ANDROID.BLUETOOTH_SCAN, PERMISSIONS.ANDROID.BLUETOOTH_ADVERTISE, PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION]).then((statuses) => {
      console.log(statuses)
      return statuses[PERMISSIONS.ANDROID.BLUETOOTH_SCAN] && statuses[PERMISSIONS.ANDROID.BLUETOOTH_ADVERTISE] && statuses[PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION]
    });
    return granted === 'granted'
  } else {
    const granted = await requestMultiple([PERMISSIONS.IOS.BLUETOOTH]).then((statuses) => {
      return statuses[PERMISSIONS.IOS.BLUETOOTH]
    });
    return granted === 'granted'
  }
}