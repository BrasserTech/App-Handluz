import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../../constants/theme';

export default function HomeScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Card Principal */}
      <View style={styles.eventCard}>
        <View style={styles.eventHeader}>
          <View>
            <Text style={styles.eventTitle}>HandLuz 2025</Text>
            <View style={styles.eventDateRow}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={AppTheme.textSecondary}
              />
              <Text style={styles.eventDate}>18 de março a 5 de dezembro</Text>
            </View>
            <View style={styles.eventDateRow}>
              <Ionicons
                name="location-outline"
                size={14}
                color={AppTheme.textSecondary}
              />
              <Text style={styles.eventDate}>Luzerna - Santa Catarina</Text>
            </View>
          </View>

          <Image
            source={{
              uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Handball_pictogram.svg/600px-Handball_pictogram.svg.png',
            }}
            style={styles.eventLogo}
          />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>14</Text>
            <Text style={styles.statLabel}>Atletas</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>3</Text>
            <Text style={styles.statLabel}>Times</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>120</Text>
            <Text style={styles.statLabel}>Gols</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>MODALIDADES / CATEGORIAS</Text>
      <View style={styles.categoriesGrid}>
        {['Adulto', 'Cadete', 'Infantil', 'Juvenil', 'Mirim', 'Sub-21'].map(
          (cat) => (
            <View key={cat} style={styles.categoryButton}>
              <Ionicons name="person-outline" size={24} color="#FFF" />
              <Text style={styles.categoryText}>{cat}</Text>
            </View>
          ),
        )}
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
        ÚLTIMA NOTÍCIA
      </Text>
      <View style={styles.newsCard}>
        <Image
          source={{
            uri: 'https://images.unsplash.com/photo-1607344645866-009c320b38a7',
          }}
          style={styles.newsImage}
        />
        <Text style={styles.newsTitle}>
          Preparativos para a temporada 2025!
        </Text>
        <Text style={styles.newsExcerpt}>
          Tudo pronto para o início da nova fase do HandLuz. A expectativa é
          grande para um ano repleto de jogos e conquistas.
        </Text>
        <Text style={styles.newsDate}>10 de março, 15:26</Text>
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
        PRÓXIMAS PARTIDAS
      </Text>
      <View style={styles.matchWrapper}>
        <View style={styles.matchTag}>
          <Text style={styles.matchTagText}>
            Adulto Masculino – 29/11/25 – 14:30
          </Text>
        </View>
        <View style={styles.matchCard}>
          <Text style={styles.matchTeams}>Dois Córregos</Text>
          <Text style={styles.matchVs}>vs</Text>
          <Text style={styles.matchTeams}>HandLuz Luzerna</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.background,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  eventCard: {
    backgroundColor: AppTheme.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: AppTheme.border,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AppTheme.textPrimary,
  },
  eventDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  eventDate: {
    marginLeft: 6,
    color: AppTheme.textSecondary,
    fontSize: 12,
  },
  eventLogo: {
    width: 64,
    height: 64,
    borderRadius: 40,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: AppTheme.primaryDark,
  },
  statLabel: {
    fontSize: 12,
    color: AppTheme.textSecondary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AppTheme.textPrimary,
    marginBottom: 10,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  categoryButton: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: AppTheme.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryText: {
    marginTop: 6,
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12,
  },
  newsCard: {
    backgroundColor: AppTheme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.border,
    padding: 12,
  },
  newsImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    marginBottom: 10,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AppTheme.textPrimary,
    marginBottom: 4,
  },
  newsExcerpt: {
    fontSize: 13,
    color: AppTheme.textSecondary,
    marginBottom: 6,
  },
  newsDate: {
    fontSize: 11,
    color: AppTheme.textMuted,
    textAlign: 'right',
  },
  matchWrapper: {
    marginTop: 10,
  },
  matchTag: {
    backgroundColor: AppTheme.primary,
    padding: 6,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  matchTagText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  matchCard: {
    backgroundColor: AppTheme.surface,
    borderWidth: 1,
    borderColor: AppTheme.border,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  matchTeams: {
    fontSize: 15,
    fontWeight: '600',
    color: AppTheme.textPrimary,
  },
  matchVs: {
    fontSize: 12,
    color: AppTheme.textMuted,
    marginVertical: 4,
  },
});
