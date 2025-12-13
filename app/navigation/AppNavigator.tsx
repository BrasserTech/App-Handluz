import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Text } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeStackNavigator from './HomeStackNavigator';
import EquipesStackNavigator from './EquipesStackNavigator';
import TreinosStackNavigator from './TreinosStackNavigator';
import ProdutosStackNavigator from './ProdutosStackNavigator';
import DiretoriaStackNavigator from './DiretoriaStackNavigator';
import { AppTheme } from '../../constants/theme';

export type RootTabParamList = {
  Inicio: undefined;
  Equipes: undefined;
  Treinos: undefined;
  Produtos: undefined;
  Configuracoes: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const { width } = Dimensions.get('window');

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const tabWidth = width / state.routes.length;
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateX.value = withTiming(state.index * tabWidth, { duration: 250, easing: Easing.out(Easing.quad) });
  }, [state.index, tabWidth]);

  const animatedIndicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

  return (
    <View style={styles.tabBarContainer}>
      <View style={[styles.tabBarSurface, { paddingBottom: insets.bottom }]}>
        <Animated.View style={[styles.activeIndicatorContainer, { width: tabWidth }, animatedIndicatorStyle]}>
          <View style={styles.activeCircle} />
        </Animated.View>
        <View style={styles.tabsRow}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
            };

            let iconName: keyof typeof Ionicons.glyphMap = 'ellipse-outline';
            switch (route.name) {
              case 'Inicio': iconName = 'home-outline'; break;
              case 'Equipes': iconName = 'shield-checkmark-outline'; break;
              case 'Treinos': iconName = 'calendar-outline'; break;
              case 'Produtos': iconName = 'pricetags-outline'; break;
              case 'Configuracoes': iconName = 'settings-outline'; break;
            }

            return (
              <TouchableOpacity
                key={index}
                onPress={onPress}
                style={[styles.tabButton, { width: tabWidth }]}
                activeOpacity={0.9}
              >
                <View style={styles.iconContainer}>
                  <Ionicons name={iconName} size={24} color={isFocused ? '#FFFFFF' : AppTheme.textSecondary} />
                  {!isFocused && <Text style={styles.tabLabel}>{options.tabBarLabel as string}</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Inicio" component={HomeStackNavigator} options={{ tabBarLabel: 'Início' }} />
      <Tab.Screen name="Equipes" component={EquipesStackNavigator} options={{ tabBarLabel: 'Equipes' }} />
      <Tab.Screen name="Treinos" component={TreinosStackNavigator} options={{ tabBarLabel: 'Treinos' }} />
      <Tab.Screen name="Produtos" component={ProdutosStackNavigator} options={{ tabBarLabel: 'Produtos' }} />
      <Tab.Screen name="Configuracoes" component={DiretoriaStackNavigator} options={{ tabBarLabel: 'Ajustes' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'transparent' },
  tabBarSurface: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 10, width: '100%' },
  tabsRow: { flexDirection: 'row', height: 70, alignItems: 'center' },
  activeIndicatorContainer: { position: 'absolute', top: 0, height: 70, justifyContent: 'center', alignItems: 'center', zIndex: 0 },
  activeCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: AppTheme.primary, marginTop: -10, shadowColor: AppTheme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 4 },
  tabButton: { height: 70, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  iconContainer: { alignItems: 'center', justifyContent: 'center', marginTop: -10 },
  tabLabel: { fontSize: 10, color: AppTheme.textSecondary, marginTop: 4, fontWeight: '500', position: 'absolute', bottom: -18 },
});