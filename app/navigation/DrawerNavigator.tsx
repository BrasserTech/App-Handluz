// app/navigation/DrawerNavigator.tsx

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

export type RootDrawerParamList = {
  AppTabs: undefined;
};

const Drawer = createDrawerNavigator<RootDrawerParamList>();

function CustomDrawerContent(props: DrawerContentComponentProps) {
  return (
    <DrawerContentScrollView
      {...props}
      style={{ backgroundColor: AppTheme.drawerBackground }}
    >
      {/* CABEÇALHO DO MENU LATERAL */}
      <View style={styles.header}>
        <Image
          source={{
            uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Handball_pictogram.svg/600px-Handball_pictogram.svg.png',
          }}
          style={styles.logo}
          tintColor="#FFF"
        />
        <Text style={styles.clubName}>HandLuz</Text>
        <Text style={styles.clubDesc}>Handebol de Luzerna</Text>
      </View>

      {/* ITENS DO MENU */}
      <DrawerItem
        label="Início"
        labelStyle={styles.drawerLabel}
        iconStyle={styles.drawerIcon}
        onPress={() => props.navigation.navigate('AppTabs', { screen: 'Inicio' })}
        icon={({ size, color }) => (
          <View style={styles.iconWrapper}>
            <Ionicons name="home-outline" color={color ?? '#FFF'} size={size ?? 20} />
          </View>
        )}
      />

      <DrawerItem
        label="Atletas"
        labelStyle={styles.drawerLabel}
        iconStyle={styles.drawerIcon}
        onPress={() => props.navigation.navigate('AppTabs', { screen: 'Atletas' })}
        icon={({ size, color }) => (
          <View style={styles.iconWrapper}>
            <Ionicons name="people-outline" color={color ?? '#FFF'} size={size ?? 20} />
          </View>
        )}
      />

      <DrawerItem
        label="Equipes"
        labelStyle={styles.drawerLabel}
        iconStyle={styles.drawerIcon}
        onPress={() => props.navigation.navigate('AppTabs', { screen: 'Equipes' })}
        icon={({ size, color }) => (
          <View style={styles.iconWrapper}>
            <Ionicons
              name="shield-checkmark-outline"
              color={color ?? '#FFF'}
              size={size ?? 20}
            />
          </View>
        )}
      />

      <DrawerItem
        label="Treinos"
        labelStyle={styles.drawerLabel}
        iconStyle={styles.drawerIcon}
        onPress={() => props.navigation.navigate('AppTabs', { screen: 'Treinos' })}
        icon={({ size, color }) => (
          <View style={styles.iconWrapper}>
            <Ionicons name="calendar-outline" color={color ?? '#FFF'} size={size ?? 20} />
          </View>
        )}
      />

      <DrawerItem
        label="Produtos"
        labelStyle={styles.drawerLabel}
        iconStyle={styles.drawerIcon}
        onPress={() => props.navigation.navigate('AppTabs', { screen: 'Produtos' })}
        icon={({ size, color }) => (
          <View style={styles.iconWrapper}>
            <Ionicons name="pricetags-outline" color={color ?? '#FFF'} size={size ?? 20} />
          </View>
        )}
      />

      <DrawerItem
        label="Diretoria"
        labelStyle={styles.drawerLabel}
        iconStyle={styles.drawerIcon}
        onPress={() => props.navigation.navigate('AppTabs', { screen: 'Diretoria' })}
        icon={({ size, color }) => (
          <View style={styles.iconWrapper}>
            <Ionicons name="business-outline" color={color ?? '#FFF'} size={size ?? 20} />
          </View>
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
        drawerActiveTintColor: '#FFF',
        drawerInactiveTintColor: '#FFF',
      }}
      drawerContent={(props: DrawerContentComponentProps) => (
        <CustomDrawerContent {...props} />
      )}
    >
      {/* Tabs principais - Login e Perfil estão dentro do AppTabs */}
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
  drawerIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
});
