import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { listarEquipes } from '../services/api';
import { Equipe } from '../services/models';

export default function EquipesListScreen() {
  const [data, setData] = useState<Equipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const lista = await listarEquipes();
        setData(lista);
      } catch (err) {
        console.error('Erro ao carregar equipes:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Carregando equipes...</Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.center}>
        <Text>Nenhuma equipe cadastrada.</Text>
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
          <View style={styles.card}>
            <Text style={styles.nome}>{item.nome}</Text>
            {item.apelido ? (
              <Text style={styles.linha}>Apelido: {item.apelido}</Text>
            ) : null}
            {item.categoria ? (
              <Text style={styles.linha}>
                Categoria: {item.categoria.nome}
              </Text>
            ) : null}
            <Text style={styles.linha}>
              Situação: {item.ativa ? 'Ativa' : 'Inativa'}
            </Text>
          </View>
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
