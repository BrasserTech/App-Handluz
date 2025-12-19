import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Text } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- STACKS ---
import HomeStackNavigator from './HomeStackNavigator';
import EquipesStackNavigator from './EquipesStackNavigator';
import TreinosStackNavigator from './TreinosStackNavigator';
import ProdutosStackNavigator from './ProdutosStackNavigator';
// Novos Stacks
import CompeticoesStackNavigator from './CompeticoesStackNavigator';
import ConfiguracoesStackNavigator from './ConfiguracoesStackNavigator';

import ProfileOrLoginScreen from './ProfileOrLoginScreen'; // Verifique se o caminho está certo

import { AppTheme } from '../../constants/theme';
import { useAuth } from '../context/AuthContext';

// --- TIPAGEM ---
export type BottomTabParamList = {
  Inicio: undefined;
  Equipes: undefined;
  Competicoes: undefined;
  Treinos: undefined;
  Produtos: undefined;
  Configuracoes: undefined; // Aba Fantasma
};

export type RootStackParamList = {
  AppTabs: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const { width } = Dimensions.get('window');

// --- MENU INFERIOR (CUSTOM TAB BAR) ---
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  
  // Filtra 'Configuracoes' para não criar botão visual para ela
  const visibleRoutes = state.routes.filter(r => r.name !== 'Configuracoes');
  
  const totalTabs = visibleRoutes.length; 
  const tabWidth = width / totalTabs;
  
  // Verifica onde estamos
  const currentRouteName = state.routes[state.index].name;
  const isHiddenTabActive = currentRouteName === 'Configuracoes';

  // Define a posição da bolinha
  const visualIndex = visibleRoutes.findIndex(r => r.name === currentRouteName);
  const activeIndex = visualIndex >= 0 ? visualIndex : 0;

  const translateX = useSharedValue(0);

  useEffect(() => {
    translateX.value = withTiming(activeIndex * tabWidth, {
      duration: 250,
      easing: Easing.out(Easing.quad),
    });
  }, [activeIndex, tabWidth]);

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    // Some a bolinha se estiver na aba oculta
    opacity: isHiddenTabActive ? 0 : 1, 
  }));

  return (
    <View style={styles.tabBarContainer}>
      <View style={[styles.tabBarSurface, { paddingBottom: insets.bottom }]}>
        
        {/* Bolinha Verde Animada */}
        <Animated.View style={[styles.activeIndicatorContainer, { width: tabWidth }, animatedIndicatorStyle]}>
          <View style={styles.activeCircle} />
        </Animated.View>

        {/* Ícones Visíveis */}
        <View style={styles.tabsRow}>
          {visibleRoutes.map((route) => {
            const { options } = descriptors[route.key];
            const isFocused = currentRouteName === route.name;

            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
            };

            let iconName: keyof typeof Ionicons.glyphMap = 'ellipse-outline';
            switch (route.name) {
              case 'Inicio': iconName = 'home-outline'; break;
              case 'Equipes': iconName = 'shield-checkmark-outline'; break;
              case 'Competicoes': iconName = 'trophy-outline'; break;
              case 'Treinos': iconName = 'calendar-outline'; break;
              case 'Produtos': iconName = 'pricetags-outline'; break;
            }

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={styles.tabButton}
                activeOpacity={0.9}
              >
                <View style={[styles.iconContainer, isFocused && styles.iconContainerActive]}>
                  <View style={styles.iconWrapper}>
                    <Ionicons 
                      name={iconName} 
                      size={24} 
                      color={isFocused ? '#FFFFFF' : AppTheme.textSecondary}
                    />
                  </View>
                  {!isFocused && (
                    <Text style={styles.tabLabel} numberOfLines={1} ellipsizeMode="tail">
                      {options.tabBarLabel as string}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// --- GRUPO DE ABAS ---
function BottomTabsGroup() {
  return (
    <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Inicio" component={HomeStackNavigator} options={{ tabBarLabel: 'Início' }} />
      <Tab.Screen name="Equipes" component={EquipesStackNavigator} options={{ tabBarLabel: 'Equipes' }} />
      <Tab.Screen name="Competicoes" component={CompeticoesStackNavigator} options={{ tabBarLabel: 'Copas' }} />
      <Tab.Screen name="Treinos" component={TreinosStackNavigator} options={{ tabBarLabel: 'Treinos' }} />
      <Tab.Screen name="Produtos" component={ProdutosStackNavigator} options={{ tabBarLabel: 'Loja' }} />
      
      {/* ABA OCULTA: Inclusa aqui para ter Footer, mas filtrada no CustomTabBar */}
      <Tab.Screen name="Configuracoes" component={ConfiguracoesStackNavigator} />
    </Tab.Navigator>
  );
}

// --- ROOT NAVIGATOR ---
export default function AppNavigator() {
  const { user } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AppTabs" component={BottomTabsGroup} />
      
      <Stack.Screen 
        name="Profile" 
        component={ProfileOrLoginScreen} 
        options={{
          headerShown: true,
          title: user ? 'Meu Perfil' : 'Acesse sua conta',
          headerStyle: { backgroundColor: AppTheme.background },
          headerTintColor: AppTheme.primary,
          headerTitleStyle: { color: AppTheme.textPrimary },
          headerBackTitle: '', 
        }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'transparent', overflow: 'visible' },
  tabBarSurface: { 
    backgroundColor: '#FFFFFF', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: -2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 8, 
    elevation: 10, 
    width: '100%',
    overflow: 'visible'
  },
  tabsRow: { flexDirection: 'row', minHeight: 60, alignItems: 'center', paddingBottom: 6, paddingHorizontal: 4, justifyContent: 'center' },
  activeIndicatorContainer: { position: 'absolute', top: 0, minHeight: 60, justifyContent: 'center', alignItems: 'center', zIndex: 0, pointerEvents: 'none' },
  activeCircle: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    backgroundColor: AppTheme.primary, 
    shadowColor: AppTheme.primary, 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 5, 
    elevation: 4 
  },
  tabButton: { minHeight: 60, justifyContent: 'center', alignItems: 'center', zIndex: 1, paddingHorizontal: 0, overflow: 'visible', flex: 1 },
  iconContainer: { alignItems: 'center', justifyContent: 'flex-start', width: '100%', flexShrink: 1, minWidth: 0, paddingTop: 4 },
  iconContainerActive: { justifyContent: 'center', alignItems: 'center', paddingTop: 0, width: '100%', alignSelf: 'center' },
  iconWrapper: { alignItems: 'center', justifyContent: 'center', width: 24, height: 24, alignSelf: 'center' },
  tabLabel: { fontSize: 10, color: AppTheme.textSecondary, marginTop: 4, fontWeight: '500', textAlign: 'center', width: '100%', flexShrink: 1, minWidth: 0 },
});