import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { listarProdutos } from '../services/api';
import { Produto } from '../services/models';

export default function ProdutosListScreen() {
  const [data, setData] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const lista = await listarProdutos();
        setData(lista);
      } catch (err) {
        console.error('Erro ao carregar produtos:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Carregando produtos...</Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.center}>
        <Text>Nenhum produto cadastrado.</Text>
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
            {item.descricao ? (
              <Text style={styles.linha}>{item.descricao}</Text>
            ) : null}
            <Text style={styles.linha}>
              Categoria: {item.categoria ?? 'Não informada'}
            </Text>
            <Text style={styles.preco}>
              R$ {item.preco.toFixed(2).replace('.', ',')}
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
  preco: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 6,
  },
});
