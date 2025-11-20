import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { listarTreinamentos } from '../services/api';
import { Treinamento } from '../services/models';

function formatarDataHora(iso: string | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TreinosListScreen() {
  const [data, setData] = useState<Treinamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const lista = await listarTreinamentos();
        setData(lista);
      } catch (err) {
        console.error('Erro ao carregar treinamentos:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Carregando treinamentos...</Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.center}>
        <Text>Nenhum treinamento cadastrado.</Text>
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
            <Text style={styles.nome}>{item.titulo}</Text>
            {item.equipe ? (
              <Text style={styles.linha}>Equipe: {item.equipe.nome}</Text>
            ) : null}
            <Text style={styles.linha}>
              Início: {formatarDataHora(item.dataInicio)}
            </Text>
            {item.local ? (
              <Text style={styles.linha}>Local: {item.local}</Text>
            ) : null}
            {item.tipo ? (
              <Text style={styles.linha}>Tipo: {item.tipo}</Text>
            ) : null}
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
