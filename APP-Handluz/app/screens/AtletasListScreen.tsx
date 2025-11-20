import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { listarAtletas } from '../services/api';
import { Atleta } from '../services/models';
import { StackNavigationProp } from '@react-navigation/stack';
import { AtletasStackParamList } from '../navigation/AtletasStackNavigator';

type Props = {
  navigation: StackNavigationProp<AtletasStackParamList, 'AtletasLista'>;
};

export default function AtletasListScreen({ navigation }: Props) {
  const [data, setData] = useState<Atleta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const lista = await listarAtletas();
        setData(lista);
      } catch (err) {
        console.error('Erro ao carregar atletas:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const abrirDetalhe = (atleta: Atleta) => {
    navigation.navigate('AtletaDetalhe', { atleta });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Carregando atletas...</Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.center}>
        <Text>Nenhum atleta cadastrado.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => abrirDetalhe(item)}>
            <View style={styles.card}>
              <Text style={styles.nome}>{item.nomeCompleto}</Text>
              {item.apelido ? (
                <Text style={styles.linha}>Apelido: {item.apelido}</Text>
              ) : null}
              {item.posicao ? (
                <Text style={styles.linha}>Posição: {item.posicao}</Text>
              ) : null}
              {item.equipeAtual ? (
                <Text style={styles.linha}>
                  Equipe: {item.equipeAtual.nome}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6fb',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: '#d2d8e3',
  },
  nome: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  linha: {
    fontSize: 13,
  },
});
