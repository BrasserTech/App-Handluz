import React from 'react';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
  DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppNavigator from './AppNavigator';
import { AppTheme } from '../../constants/theme';

type DrawerParamList = {
  AppTabs: undefined;
};

const Drawer = createDrawerNavigator<DrawerParamList>();

function CustomDrawerContent(props: DrawerContentComponentProps) {
  return (
    <DrawerContentScrollView
      {...props}
      style={{ backgroundColor: AppTheme.drawerBackground }}
    >
      {/* Cabeçalho do menu lateral */}
      <View style={styles.header}>
        <Image
          source={{
            uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Handball_pictogram.svg/600px-Handball_pictogram.svg.png',
          }}
          style={styles.logo}
        />
        <Text style={styles.clubName}>HandLuz</Text>
        <Text style={styles.clubDesc}>Handebol de Luzerna</Text>
      </View>

      {/* Itens do Drawer */}
      <DrawerItem
        label="Início"
        labelStyle={styles.drawerLabel}
        onPress={() => props.navigation.navigate('AppTabs', { screen: 'Inicio' })}
        icon={({ size }) => (
          <Ionicons name="home-outline" color="#FFF" size={size ?? 20} />
        )}
      />

      <DrawerItem
        label="Atletas"
        labelStyle={styles.drawerLabel}
        onPress={() => props.navigation.navigate('AppTabs', { screen: 'Atletas' })}
        icon={({ size }) => (
          <Ionicons name="people-outline" color="#FFF" size={size ?? 20} />
        )}
      />

      <DrawerItem
        label="Equipes"
        labelStyle={styles.drawerLabel}
        onPress={() => props.navigation.navigate('AppTabs', { screen: 'Equipes' })}
        icon={({ size }) => (
          <Ionicons
            name="shield-checkmark-outline"
            color="#FFF"
            size={size ?? 20}
          />
        )}
      />

      <DrawerItem
        label="Treinos"
        labelStyle={styles.drawerLabel}
        onPress={() => props.navigation.navigate('AppTabs', { screen: 'Treinos' })}
        icon={({ size }) => (
          <Ionicons name="calendar-outline" color="#FFF" size={size ?? 20} />
        )}
      />

      <DrawerItem
        label="Produtos"
        labelStyle={styles.drawerLabel}
        onPress={() => props.navigation.navigate('AppTabs', { screen: 'Produtos' })}
        icon={({ size }) => (
          <Ionicons name="pricetags-outline" color="#FFF" size={size ?? 20} />
        )}
      />

      <DrawerItem
        label="Diretoria"
        labelStyle={styles.drawerLabel}
        onPress={() => props.navigation.navigate('AppTabs', { screen: 'Diretoria' })}
        icon={({ size }) => (
          <Ionicons name="business-outline" color="#FFF" size={size ?? 20} />
        )}
      />
    </DrawerContentScrollView>
  );
}

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: AppTheme.drawerBackground,
          width: 260,
        },
      }}
      drawerContent={(props: DrawerContentComponentProps) => (
        <CustomDrawerContent {...props} />
      )}
    >
      <Drawer.Screen name="AppTabs" component={AppNavigator} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomColor: 'rgba(255,255,255,0.2)',
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 8,
    tintColor: '#FFF',
  },
  clubName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  clubDesc: {
    fontSize: 13,
    color: '#ECECEC',
  },
  drawerLabel: {
    color: '#FFF',
    fontSize: 15,
    marginLeft: -10,
  },
});
