import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { listarDiretoria } from '../services/api';
import { MembroDiretoria } from '../services/models';

export default function DiretoriaScreen() {
  const [data, setData] = useState<MembroDiretoria[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const lista = await listarDiretoria();
        setData(lista);
      } catch (err) {
        console.error('Erro ao carregar diretoria:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Carregando diretoria...</Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.center}>
        <Text>Nenhum membro de diretoria cadastrado.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={data.sort((a, b) => (a.cargo.ordem ?? 99) - (b.cargo.ordem ?? 99))}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.nome}>{item.nome}</Text>
            <Text style={styles.linha}>Cargo: {item.cargo.nome}</Text>
            {item.telefone ? (
              <Text style={styles.linha}>Telefone: {item.telefone}</Text>
            ) : null}
            {item.email ? (
              <Text style={styles.linha}>E-mail: {item.email}</Text>
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
