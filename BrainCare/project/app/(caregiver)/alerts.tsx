import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { AlertTriangle, CheckCircle, Clock, MapPin, Pill, User, X } from 'lucide-react-native';
import { StorageService } from '@/services/storage';
import { Emergency, Patient } from '@/types';
import AccessibleButton from '@/components/AccessibleButton';

export default function CaregiverAlertsScreen() {
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [emergenciesData, patientsData] = await Promise.all([
        StorageService.getEmergencies(),
        StorageService.getPatients(),
      ]);

      // Sort emergencies by timestamp (newest first)
      const sortedEmergencies = emergenciesData.sort((a, b) => b.timestamp - a.timestamp);
      
      setEmergencies(sortedEmergencies);
      setPatients(patientsData);
    } catch (error) {
      console.log('Error loading alerts data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleResolveEmergency = async (emergencyId: string) => {
    try {
      const updatedEmergencies = emergencies.map(emergency =>
        emergency.id === emergencyId
          ? { ...emergency, isResolved: true, response: 'Resolved by caregiver' }
          : emergency
      );

      await StorageService.saveEmergencies(updatedEmergencies);
      setEmergencies(updatedEmergencies);
    } catch (error) {
      console.log('Error resolving emergency:', error);
    }
  };

  const getPatientName = (patientId: string): string => {
    const patient = patients.find(p => p.id === patientId);
    return patient?.name || 'Unknown Patient';
  };

  const getEmergencyIcon = (type: Emergency['type']) => {
    switch (type) {
      case 'sos':
        return <AlertTriangle size={20} color="#DC2626" />;
      case 'location_breach':
        return <MapPin size={20} color="#EA580C" />;
      case 'medication_missed':
        return <Pill size={20} color="#F59E0B" />;
      case 'inactivity':
        return <Clock size={20} color="#6B7280" />;
      default:
        return <AlertTriangle size={20} color="#DC2626" />;
    }
  };

  const getEmergencyColor = (type: Emergency['type']) => {
    switch (type) {
      case 'sos':
        return '#DC2626';
      case 'location_breach':
        return '#EA580C';
      case 'medication_missed':
        return '#F59E0B';
      case 'inactivity':
        return '#6B7280';
      default:
        return '#DC2626';
    }
  };

  const getEmergencyTitle = (type: Emergency['type']) => {
    switch (type) {
      case 'sos':
        return 'SOS Emergency';
      case 'location_breach':
        return 'Safe Zone Breach';
      case 'medication_missed':
        return 'Medication Missed';
      case 'inactivity':
        return 'Inactivity Alert';
      default:
        return 'Emergency Alert';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - timestamp) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const minutes = Math.floor((now.getTime() - timestamp) / (1000 * 60));
      return `${minutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const activeEmergencies = emergencies.filter(e => !e.isResolved);
  const resolvedEmergencies = emergencies.filter(e => e.isResolved);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading alerts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Emergency Alerts</Text>
        <Text style={styles.subtitle}>Monitor and respond to patient emergencies</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {emergencies.length === 0 ? (
          <View style={styles.emptyContainer}>
            <CheckCircle size={48} color="#10B981" />
            <Text style={styles.emptyText}>No alerts</Text>
            <Text style={styles.emptySubtext}>All patients are safe and secure</Text>
          </View>
        ) : (
          <>
            {activeEmergencies.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <AlertTriangle size={20} color="#DC2626" />
                  <Text style={styles.sectionTitle}>Active Emergencies ({activeEmergencies.length})</Text>
                </View>

                {activeEmergencies.map((emergency) => (
                  <View key={emergency.id} style={[styles.emergencyCard, styles.activeEmergencyCard]}>
                    <View style={styles.emergencyHeader}>
                      <View style={styles.emergencyTitleContainer}>
                        {getEmergencyIcon(emergency.type)}
                        <Text style={[styles.emergencyTitle, { color: getEmergencyColor(emergency.type) }]}>
                          {getEmergencyTitle(emergency.type)}
                        </Text>
                      </View>
                      <Text style={styles.emergencyTime}>
                        {formatTimestamp(emergency.timestamp)}
                      </Text>
                    </View>

                    <View style={styles.emergencyContent}>
                      <View style={styles.patientInfo}>
                        <User size={16} color="#6B7280" />
                        <Text style={styles.patientName}>
                          {getPatientName(emergency.patientId)}
                        </Text>
                      </View>

                      {emergency.location && (
                        <View style={styles.locationInfo}>
                          <MapPin size={16} color="#6B7280" />
                          <Text style={styles.locationText}>
                            {emergency.location.address || 
                             `${emergency.location.latitude.toFixed(4)}, ${emergency.location.longitude.toFixed(4)}`}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.emergencyActions}>
                      <AccessibleButton
                        title="Resolve"
                        onPress={() => handleResolveEmergency(emergency.id)}
                        variant="secondary"
                        style={styles.resolveButton}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}

            {resolvedEmergencies.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <CheckCircle size={20} color="#10B981" />
                  <Text style={styles.sectionTitle}>Recent Resolved ({resolvedEmergencies.slice(0, 10).length})</Text>
                </View>

                {resolvedEmergencies.slice(0, 10).map((emergency) => (
                  <View key={emergency.id} style={[styles.emergencyCard, styles.resolvedEmergencyCard]}>
                    <View style={styles.emergencyHeader}>
                      <View style={styles.emergencyTitleContainer}>
                        {getEmergencyIcon(emergency.type)}
                        <Text style={styles.emergencyTitle}>
                          {getEmergencyTitle(emergency.type)}
                        </Text>
                      </View>
                      <View style={styles.resolvedBadge}>
                        <CheckCircle size={16} color="#10B981" />
                        <Text style={styles.resolvedText}>Resolved</Text>
                      </View>
                    </View>

                    <View style={styles.emergencyContent}>
                      <View style={styles.patientInfo}>
                        <User size={16} color="#6B7280" />
                        <Text style={styles.patientName}>
                          {getPatientName(emergency.patientId)}
                        </Text>
                      </View>

                      <Text style={styles.resolvedTime}>
                        {formatTimestamp(emergency.timestamp)}
                      </Text>

                      {emergency.response && (
                        <Text style={styles.responseText}>
                          Response: {emergency.response}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 18,
    color: '#6B7280',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 8,
  },
  emergencyCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  activeEmergencyCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 2,
  },
  resolvedEmergencyCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderWidth: 1,
  },
  emergencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  emergencyTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  emergencyTime: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  resolvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  resolvedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 4,
  },
  emergencyContent: {
    gap: 8,
    marginBottom: 16,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  resolvedTime: {
    fontSize: 14,
    color: '#6B7280',
  },
  responseText: {
    fontSize: 14,
    color: '#4B5563',
    fontStyle: 'italic',
  },
  emergencyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  resolveButton: {
    minWidth: 100,
  },
});