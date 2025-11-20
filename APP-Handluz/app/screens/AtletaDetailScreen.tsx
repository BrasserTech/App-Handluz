import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { AtletasStackParamList } from '../navigation/AtletasStackNavigator';

type Props = {
  route: RouteProp<AtletasStackParamList, 'AtletaDetalhe'>;
};

function formatarData(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR');
}

export default function AtletaDetailScreen({ route }: Props) {
  const { atleta } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.nome}>{atleta.nomeCompleto}</Text>

      {atleta.apelido ? (
        <Text style={styles.linha}>Apelido: {atleta.apelido}</Text>
      ) : null}

      {atleta.dataNascimento ? (
        <Text style={styles.linha}>
          Data de nascimento: {formatarData(atleta.dataNascimento)}
        </Text>
      ) : null}

      {atleta.posicao ? (
        <Text style={styles.linha}>Posição: {atleta.posicao}</Text>
      ) : null}

      {atleta.equipeAtual ? (
        <Text style={styles.linha}>
          Equipe atual: {atleta.equipeAtual.nome}
        </Text>
      ) : null}

      {atleta.alturaCm ? (
        <Text style={styles.linha}>Altura: {atleta.alturaCm} cm</Text>
      ) : null}

      {atleta.pesoKg ? (
        <Text style={styles.linha}>Peso: {atleta.pesoKg} kg</Text>
      ) : null}

      {atleta.telefone ? (
        <Text style={styles.linha}>Telefone: {atleta.telefone}</Text>
      ) : null}

      {atleta.email ? (
        <Text style={styles.linha}>E-mail: {atleta.email}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f4f6fb',
  },
  nome: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  linha: {
    fontSize: 14,
    marginBottom: 4,
  },
});
