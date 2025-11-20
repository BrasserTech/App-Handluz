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
import LoginScreen from '../screens/LoginScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { AppTheme } from '../../constants/theme';

export type RootDrawerParamList = {
  AppTabs: undefined;
  Login: undefined;
  Profile: undefined;
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
        />
        <Text style={styles.clubName}>HandLuz</Text>
        <Text style={styles.clubDesc}>Handebol de Luzerna</Text>
      </View>

      {/* ITENS DO MENU */}
      <DrawerItem
        label="Início"
        labelStyle={styles.drawerLabel}
        onPress={() => props.navigation.navigate('AppTabs', { screen: 'Inicio' })}
        icon={({ size, color }) => (
          <Ionicons name="home-outline" color={color ?? '#FFF'} size={size ?? 20} />
        )}
      />

      <DrawerItem
        label="Atletas"
        labelStyle={styles.drawerLabel}
        onPress={() => props.navigation.navigate('AppTabs', { screen: 'Atletas' })}
        icon={({ size, color }) => (
          <Ionicons name="people-outline" color={color ?? '#FFF'} size={size ?? 20} />
        )}
      />

      <DrawerItem
        label="Equipes"
        labelStyle={styles.drawerLabel}
        onPress={() => props.navigation.navigate('AppTabs', { screen: 'Equipes' })}
        icon={({ size, color }) => (
          <Ionicons
            name="shield-checkmark-outline"
            color={color ?? '#FFF'}
            size={size ?? 20}
          />
        )}
      />

      <DrawerItem
        label="Treinos"
        labelStyle={styles.drawerLabel}
        onPress={() => props.navigation.navigate('AppTabs', { screen: 'Treinos' })}
        icon={({ size, color }) => (
          <Ionicons name="calendar-outline" color={color ?? '#FFF'} size={size ?? 20} />
        )}
      />

      <DrawerItem
        label="Produtos"
        labelStyle={styles.drawerLabel}
        onPress={() => props.navigation.navigate('AppTabs', { screen: 'Produtos' })}
        icon={({ size, color }) => (
          <Ionicons name="pricetags-outline" color={color ?? '#FFF'} size={size ?? 20} />
        )}
      />

      <DrawerItem
        label="Diretoria"
        labelStyle={styles.drawerLabel}
        onPress={() => props.navigation.navigate('AppTabs', { screen: 'Diretoria' })}
        icon={({ size, color }) => (
          <Ionicons name="business-outline" color={color ?? '#FFF'} size={size ?? 20} />
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
      {/* Tabs principais */}
      <Drawer.Screen name="AppTabs" component={AppNavigator} />

      {/* Tela de Login (não aparece no menu lateral) */}
      <Drawer.Screen
        name="Login"
        component={LoginScreen}
        options={{
          drawerItemStyle: { display: 'none' },
        }}
      />

      {/* Tela de Perfil (não aparece no menu lateral) */}
      <Drawer.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          drawerItemStyle: { display: 'none' },
          headerShown: true,
          title: 'Perfil',
          headerStyle: { backgroundColor: AppTheme.primary },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { color: '#FFFFFF', fontWeight: '600' },
        }}
      />
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
