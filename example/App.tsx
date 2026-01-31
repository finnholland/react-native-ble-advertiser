import React, { useEffect, useState } from 'react';

import {
  Alert,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Platform,
  EmitterSubscription,
} from 'react-native';

import { NativeEventEmitter, NativeModules } from 'react-native';

import 'react-native-get-random-values';
import BLEAdvertiser from 'react-native-ble-advertiser';
import { v4 as uuid } from 'uuid'
import { requestMultiple, PERMISSIONS } from 'react-native-permissions';
import { SafeAreaView } from 'react-native-safe-area-context';

// Uses the Apple code to pick up iPhones
const APPLE_ID = 0x4c;
const SCAN_MANUF_DATA = [1, 0];

BLEAdvertiser.setCompanyId(APPLE_ID);

export async function requestLocationPermission() {
  try {
    if (Platform.OS === 'android') {
      const granted = await requestMultiple([PERMISSIONS.ANDROID.BLUETOOTH_SCAN, PERMISSIONS.ANDROID.BLUETOOTH_ADVERTISE]).then((statuses) => {
        return statuses[PERMISSIONS.ANDROID.BLUETOOTH_SCAN] && statuses[PERMISSIONS.ANDROID.BLUETOOTH_ADVERTISE]
      });
      if (granted) console.log('granted')
      else console.log('not granted')
    }

    const blueoothActive = await BLEAdvertiser.getAdapterState()
      .then((result: string) => {
        console.log('[Bluetooth]', 'Bluetooth Status', result);
        return result === 'STATE_ON';
      })
      .catch((error: string) => {
        console.log('[Bluetooth]', 'Bluetooth Not Enabled');
        return false;
      });

    if (!blueoothActive) {
      await Alert.alert(
        'Example requires bluetooth to be enabled',
      )
    }
  } catch (err) {
    console.warn(err);
  }
}

function short(str: string) {
  return (
    str.substring(0, 4) +
    ' ... ' +
    str.substring(str.length - 4, str.length)
  ).toUpperCase();
}

type Device = {
  uuid: string,
  name: string,
  mac: string,
  rssi: string,
  start: Date,
  end: Date,
}
let onDeviceFound: EmitterSubscription | null = null;
const App = () => {
  const [myUuid, setMyUuid] = useState('')
  const [isLogging, setIsLogging] = useState(false)
  const [devicesFound, setDevicesFound] = useState<Device[]>([])

  useEffect(() => {
    requestLocationPermission();
    setMyUuid(uuid().slice(0, -6) + '00b2b2')
    return () => { if (isLogging) stop() }
  }, [])


  function addDevice(device: Device) {
    const index = devicesFound.findIndex(({ uuid }) => uuid === device.uuid);
    if (index < 0) {
      setDevicesFound([...devicesFound, device])
    } else {
      setDevicesFound(devicesFound.map((d, i) =>
        i === index
          ? {
            ...d,
            end: device.start, // update only what you need
            rssi: device.rssi ?? d.rssi,
          }
          : d
      ))
    }
  }
  const start = () => {
    console.log(myUuid, 'Registering Listener');
    const eventEmitter = new NativeEventEmitter(NativeModules.BLEAdvertiser);

    onDeviceFound = eventEmitter.addListener('onDeviceFound', (event) => {
      console.log('onDeviceFound', event);
      if (event.serviceUuids) {
        for (let i = 0; i < event.serviceUuids.length; i++) {
          if (event.serviceUuids[i] && event.serviceUuids[i].endsWith('00b2b2')) {
            addDevice(
              {
                uuid: event.serviceUuids[i],
                name: event.deviceName,
                mac: event.deviceAddress,
                rssi: event.rssi,
                start: new Date(),
                end: new Date(),
              }
            );
          }
        }
      }
    });

    console.log('state: ', onDeviceFound)
    console.log(uuid, 'Starting Advertising');
    BLEAdvertiser.broadcast(myUuid, SCAN_MANUF_DATA, {
      advertiseMode: BLEAdvertiser.ADVERTISE_MODE_BALANCED,
      txPowerLevel: BLEAdvertiser.ADVERTISE_TX_POWER_MEDIUM,
      connectable: false,
      includeDeviceName: false,
      includeTxPowerLevel: false,
    })
      .then((sucess: string) => console.log(uuid, 'Adv Successful', sucess))
      .catch((error: string) => console.log(uuid, 'Adv Error', error));

    console.log(uuid, 'Starting Scanner');
    BLEAdvertiser.scan(SCAN_MANUF_DATA, {
      scanMode: BLEAdvertiser.SCAN_MODE_LOW_LATENCY,
    })
      .then((sucess: string) => console.log(uuid, 'Scan Successful', sucess))
      .catch((error: string) => console.log(uuid, 'Scan Error', error));

    setIsLogging(true)
  }

  const stop = () => {
    console.log(uuid, 'Removing Listener');
    console.log('state: ', onDeviceFound)
    if (!onDeviceFound) return;
    onDeviceFound.remove();

    console.log(uuid, 'Stopping Broadcast');
    BLEAdvertiser.stopBroadcast()
      .then((sucess: string) => console.log(uuid, 'Stop Broadcast Successful', sucess))
      .catch((error: string) => console.log(uuid, 'Stop Broadcast Error', error));

    console.log(uuid, 'Stopping Scanning');
    BLEAdvertiser.stopScan()
      .then((sucess: string) => console.log(uuid, 'Stop Scan Successful', sucess))
      .catch((error: string) => console.log(uuid, 'Stop Scan Error', error));

    setIsLogging(false)
  }


  return (
    <SafeAreaView>
      <View style={styles.body}>
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>BLE Advertiser Demo</Text>
          <Text style={styles.sectionDescription}>
            Broadcasting:{' '}
            <Text style={styles.highlight}>
              {short(myUuid || 'None')}
            </Text>
          </Text>
        </View>

        <View style={styles.sectionContainer}>
          {isLogging ? (
            <TouchableOpacity
              onPress={() => stop()}
              style={styles.stopLoggingButtonTouchable}>
              <Text style={styles.stopLoggingButtonText}>Stop</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => start()}
              style={styles.startLoggingButtonTouchable}>
              <Text style={styles.startLoggingButtonText}>Start</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.sectionContainerFlex}>
          <Text style={styles.sectionTitle}>Devices Around</Text>
          <FlatList
            data={devicesFound}
            renderItem={({ item }) => (
              <Text style={styles.itemPastConnections}>
                {short(item.uuid)} {item.mac} {item.rssi}
              </Text>
            )}
            keyExtractor={(item) => item.uuid}
          />
        </View>

        <View style={styles.sectionContainer}>
          <TouchableOpacity
            onPress={() => setDevicesFound([])}
            style={styles.startLoggingButtonTouchable}>
            <Text style={styles.startLoggingButtonText}>Clear Devices</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  body: {
    height: '100%',
  },
  sectionContainerFlex: {
    flex: 1,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  sectionContainer: {
    flex: 0,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    marginBottom: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionDescription: {
    fontSize: 18,
    fontWeight: '400',
    textAlign: 'center',
  },
  highlight: {
    fontWeight: '700',
  },
  startLoggingButtonTouchable: {
    borderRadius: 12,
    backgroundColor: '#665eff',
    height: 52,
    alignSelf: 'center',
    width: 300,
    justifyContent: 'center',
  },
  startLoggingButtonText: {
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: 0,
    textAlign: 'center',
    color: '#ffffff',
  },
  stopLoggingButtonTouchable: {
    borderRadius: 12,
    backgroundColor: '#fd4a4a',
    height: 52,
    alignSelf: 'center',
    width: 300,
    justifyContent: 'center',
  },
  stopLoggingButtonText: {
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: 0,
    textAlign: 'center',
    color: '#ffffff',
  },
  listPastConnections: {
    width: '80%',
    height: 200,
  },
  itemPastConnections: {
    padding: 3,
    fontSize: 18,
    fontWeight: '400',
  },
});

export default App;
