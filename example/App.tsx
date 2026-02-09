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
import { SafeAreaView } from 'react-native-safe-area-context';
import { requestLocationPermission } from './getPermissions';

const SCAN_MANUF_DATA = Platform.OS === 'android' ? null : [1, 0];

BLEAdvertiser.setCompanyId(0x8101);

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
  rssi: number,
  start: Date,
  end: Date,
}
let onDeviceFound: EmitterSubscription | null = null;
const App = () => {
  const [myUuid, setMyUuid] = useState('')
  const [isLogging, setIsLogging] = useState(false)
  const [devicesFound, setDevicesFound] = useState<Device[]>([])

  const [btAllowed, setBtAllowed] = useState(true)

  // Check if bluetooth is allowed by the user
  const checkBt = () => {
    requestLocationPermission().then(res => {
      setBtAllowed(res);
    })
  }
  useEffect(() => {
    checkBt()
    setMyUuid(uuid().slice(0, -6) + '00b2b2')
    return () => { if (isLogging) stop() }
  }, [])

  if (!btAllowed) return (
    <SafeAreaView>
      <Text>Please allow bluetooth to use BLE</Text>
    </SafeAreaView>
  )

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
    const eventEmitter = new NativeEventEmitter(NativeModules.BLEAdvertiser);

    onDeviceFound = eventEmitter.addListener('onDeviceFound', (event) => {
      if (event.serviceUuids) { // if the found device HAS a service uuid that matches 00b2b2 we add it 
        for (let i = 0; i < event.serviceUuids.length; i++) {
          if (event.serviceUuids[i] && event.serviceUuids[i].toLowerCase().endsWith('00b2b2')) {
            addDevice(
              {
                uuid: event.serviceUuids[i].toLowerCase(),
                name: event.deviceName,
                mac: event.deviceAddress,
                rssi: parseInt(event.rssi),
                start: new Date(),
                end: new Date(),
              }
            );
          }
        }
      }
    });

    // broadcast with the serviceId of the user's uuid and the manuf data of [1,0] so that android can be seen by iOS
    BLEAdvertiser.broadcast(myUuid, [1, 0], {
      advertiseMode: BLEAdvertiser.ADVERTISE_MODE_BALANCED,
      txPowerLevel: BLEAdvertiser.ADVERTISE_TX_POWER_MEDIUM,
      connectable: false,
      includeDeviceName: false,
      includeTxPowerLevel: false,
    })
      .then((sucess: string) => console.log(uuid, 'Adv Successful', sucess))
      .catch((error: string) => console.log(uuid, 'Adv Error', error));

    // scan for manuf data null allows android to see iOS otherwise [1,0]
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
            data={devicesFound.sort((a, b) => b.rssi - a.rssi)}
            renderItem={({ item }) => (
              <Text style={styles.itemPastConnections}>
                {short(item.uuid)} {item.rssi} {item.mac}
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
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 50 : 0
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
    marginBottom: 40,
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
