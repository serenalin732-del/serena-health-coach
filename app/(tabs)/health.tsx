import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {
  Moon,
  Heart,
  FlaskConical,
  Activity,
  Plus,
} from 'lucide-react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '@/lib/theme';
import { SectionCard } from '@/components/Cards';
import { ModalSheet, Tag } from '@/components/UI';
import { InputField, PrimaryButton } from '@/components/Inputs';
import { useSleepLog, useCycleLogs, useLabResults, useCgmLog } from '@/hooks/useHealth';
import { useAuth } from '@/hooks/useAuth';
import { todayStr, formatDisplayDate, calcCycleDay } from '@/lib/utils';
import type { LabResult, CycleLog } from '@/lib/types';

type HealthSection = 'sleep' | 'cycle' | 'labs' | 'cgm';

export default function HealthScreen() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const today = todayStr();
  const { log: sleepLog, save: saveSleep } = useSleepLog(userId, today);
  const { logs: cycleLogs, latest: latestCycle, addLog: addCycle, refresh: refreshCycles } = useCycleLogs(userId);
  const { results: labResults, addResult: addLab, refresh: refreshLabs } = useLabResults(userId);
  const { log: cgmLog, save: saveCgm } = useCgmLog(userId, today);

  const [activeModal, setActiveModal] = useState<HealthSection | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Sleep form
  const [sleepForm, setSleepForm] = useState({ hours: '', score: '', notes: '' });
  // Cycle form
  const [cycleForm, setCycleForm] = useState({ period_start: '', cycle_length_days: '28', notes: '' });
  // Lab form
  const [labForm, setLabForm] = useState({ test_date: today, cortisol: '', vitamin_d: '', progesterone: '', glucose: '', hba1c: '', cholesterol: '', notes: '' });
  // CGM form
  const [cgmForm, setCgmForm] = useState({ daily_avg_glucose: '', time_in_range_pct: '', notes: '' });

  const openModal = (section: HealthSection) => {
    if (section === 'sleep') setSleepForm({ hours: String(sleepLog?.hours ?? ''), score: String(sleepLog?.score ?? ''), notes: sleepLog?.notes ?? '' });
    if (section === 'cgm') setCgmForm({ daily_avg_glucose: String(cgmLog?.daily_avg_glucose ?? ''), time_in_range_pct: String(cgmLog?.time_in_range_pct ?? ''), notes: cgmLog?.notes ?? '' });
    setActiveModal(section);
  };

  const handleSaveSleep = async () => {
    setSaving(true);
    await saveSleep({ hours: sleepForm.hours ? parseFloat(sleepForm.hours) : null, score: sleepForm.score ? parseInt(sleepForm.score) : null, notes: sleepForm.notes || null });
    setSaving(false);
    setActiveModal(null);
  };

  const handleSaveCycle = async () => {
    if (!cycleForm.period_start) return;
    setSaving(true);
    await addCycle({ period_start: cycleForm.period_start, cycle_length_days: parseInt(cycleForm.cycle_length_days) || 28, symptoms: null, notes: cycleForm.notes || null });
    setSaving(false);
    setActiveModal(null);
  };

  const handleSaveLab = async () => {
    setSaving(true);
    await addLab({
      test_date: labForm.test_date || today,
      cortisol: labForm.cortisol ? parseFloat(labForm.cortisol) : null,
      vitamin_d: labForm.vitamin_d ? parseFloat(labForm.vitamin_d) : null,
      progesterone: labForm.progesterone ? parseFloat(labForm.progesterone) : null,
      glucose: labForm.glucose ? parseFloat(labForm.glucose) : null,
      hba1c: labForm.hba1c ? parseFloat(labForm.hba1c) : null,
      cholesterol: labForm.cholesterol ? parseFloat(labForm.cholesterol) : null,
      notes: labForm.notes || null,
    });
    setSaving(false);
    setActiveModal(null);
  };

  const handleSaveCgm = async () => {
    setSaving(true);
    await saveCgm({ daily_avg_glucose: cgmForm.daily_avg_glucose ? parseFloat(cgmForm.daily_avg_glucose) : null, time_in_range_pct: cgmForm.time_in_range_pct ? parseFloat(cgmForm.time_in_range_pct) : null, notes: cgmForm.notes || null });
    setSaving(false);
    setActiveModal(null);
  };

  const cycleDay = latestCycle ? calcCycleDay(latestCycle.period_start) : null;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshCycles(), refreshLabs()]);
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.rosePrimary} />}
      >
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Health</Text>
        </View>

        {/* Sleep */}
        <SectionCard
          title="Sleep"
          rightHeader={
            <TouchableOpacity onPress={() => openModal('sleep')} style={styles.addIconBtn}>
              <Plus size={18} color={COLORS.sage} />
            </TouchableOpacity>
          }
        >
          <View style={styles.healthRow}>
            <View style={[styles.healthIcon, { backgroundColor: COLORS.sagePale }]}>
              <Moon size={20} color={COLORS.sageDark} />
            </View>
            <View style={styles.healthInfo}>
              <Text style={styles.healthTitle}>Last Night</Text>
              <View style={styles.healthStats}>
                {sleepLog?.hours != null && <Tag label={`${sleepLog.hours}h`} color={COLORS.sageDark} bg={COLORS.sagePale} />}
                {sleepLog?.score != null && <Tag label={`Score ${sleepLog.score}`} color={COLORS.sageDark} bg={COLORS.sagePale} />}
                {!sleepLog?.hours && !sleepLog?.score && <Text style={styles.noData}>No sleep data logged</Text>}
              </View>
              {sleepLog?.notes ? <Text style={styles.healthNotes}>{sleepLog.notes}</Text> : null}
            </View>
          </View>
        </SectionCard>

        {/* Menstrual */}
        <SectionCard
          title="Menstrual Cycle"
          rightHeader={
            <TouchableOpacity onPress={() => openModal('cycle')} style={styles.addIconBtn}>
              <Plus size={18} color={COLORS.rosePrimary} />
            </TouchableOpacity>
          }
        >
          <View style={styles.healthRow}>
            <View style={[styles.healthIcon, { backgroundColor: COLORS.roseBeigeLight }]}>
              <Heart size={20} color={COLORS.rosePrimary} />
            </View>
            <View style={styles.healthInfo}>
              {latestCycle ? (
                <>
                  <Text style={styles.healthTitle}>Cycle Day {cycleDay}</Text>
                  <View style={styles.healthStats}>
                    <Tag label={`Started ${formatDisplayDate(latestCycle.period_start)}`} color={COLORS.rosePrimary} bg={COLORS.roseBeigeLight} />
                    <Tag label={`${latestCycle.cycle_length_days}d cycle`} color={COLORS.roseAccent} bg={COLORS.roseBeigeLight} />
                  </View>
                </>
              ) : (
                <Text style={styles.noData}>No cycle data logged</Text>
              )}
            </View>
          </View>

          {cycleLogs.slice(0, 3).map((c: CycleLog) => (
            <View key={c.id} style={styles.historyRow}>
              <Text style={styles.historyDate}>{formatDisplayDate(c.period_start)}</Text>
              <Text style={styles.historyValue}>{c.cycle_length_days}d cycle</Text>
            </View>
          ))}
        </SectionCard>

        {/* Lab Results */}
        <SectionCard
          title="Lab Results"
          rightHeader={
            <TouchableOpacity onPress={() => openModal('labs')} style={styles.addIconBtn}>
              <Plus size={18} color={COLORS.warning} />
            </TouchableOpacity>
          }
        >
          <View style={styles.healthRow}>
            <View style={[styles.healthIcon, { backgroundColor: COLORS.warningLight }]}>
              <FlaskConical size={20} color={COLORS.warning} />
            </View>
            <View style={styles.healthInfo}>
              {labResults.length > 0 ? (
                <>
                  <Text style={styles.healthTitle}>{formatDisplayDate(labResults[0].test_date)}</Text>
                  <View style={styles.labGrid}>
                    <LabValue label="Cortisol" value={labResults[0].cortisol} unit="nmol/L" />
                    <LabValue label="Vit D" value={labResults[0].vitamin_d} unit="nmol/L" />
                    <LabValue label="Progesterone" value={labResults[0].progesterone} unit="ng/mL" />
                    <LabValue label="Glucose" value={labResults[0].glucose} unit="mg/dL" />
                    <LabValue label="HbA1c" value={labResults[0].hba1c} unit="%" />
                    <LabValue label="Cholesterol" value={labResults[0].cholesterol} unit="mg/dL" />
                  </View>
                </>
              ) : (
                <Text style={styles.noData}>No lab results logged</Text>
              )}
            </View>
          </View>
        </SectionCard>

        {/* CGM */}
        <SectionCard
          title="CGM Glucose"
          rightHeader={
            <TouchableOpacity onPress={() => openModal('cgm')} style={styles.addIconBtn}>
              <Plus size={18} color={COLORS.roseAccent} />
            </TouchableOpacity>
          }
        >
          <View style={styles.healthRow}>
            <View style={[styles.healthIcon, { backgroundColor: COLORS.roseBeigeLight }]}>
              <Activity size={20} color={COLORS.roseAccent} />
            </View>
            <View style={styles.healthInfo}>
              <Text style={styles.healthTitle}>Today</Text>
              <View style={styles.healthStats}>
                {cgmLog?.daily_avg_glucose != null && <Tag label={`Avg ${cgmLog.daily_avg_glucose} mg/dL`} color={COLORS.roseAccent} bg={COLORS.roseBeigeLight} />}
                {cgmLog?.time_in_range_pct != null && <Tag label={`TIR ${cgmLog.time_in_range_pct}%`} color={COLORS.sageDark} bg={COLORS.sagePale} />}
                {!cgmLog?.daily_avg_glucose && !cgmLog?.time_in_range_pct && <Text style={styles.noData}>No CGM data today</Text>}
              </View>
              {cgmLog?.notes ? <Text style={styles.healthNotes}>{cgmLog.notes}</Text> : null}
            </View>
          </View>
        </SectionCard>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* Sleep Modal */}
      <ModalSheet visible={activeModal === 'sleep'} onClose={() => setActiveModal(null)} title="Log Sleep">
        <InputField label="Hours Slept" value={sleepForm.hours} onChangeText={v => setSleepForm(f => ({ ...f, hours: v }))} keyboardType="decimal-pad" unit="hrs" placeholder="e.g. 7.5" />
        <InputField label="Sleep Score" value={sleepForm.score} onChangeText={v => setSleepForm(f => ({ ...f, score: v }))} keyboardType="number-pad" unit="/ 100" placeholder="e.g. 82" />
        <InputField label="Notes" value={sleepForm.notes} onChangeText={v => setSleepForm(f => ({ ...f, notes: v }))} placeholder="How did you feel?" multiline />
        <PrimaryButton label="Save Sleep" onPress={handleSaveSleep} loading={saving} />
      </ModalSheet>

      {/* Cycle Modal */}
      <ModalSheet visible={activeModal === 'cycle'} onClose={() => setActiveModal(null)} title="Log Period">
        <InputField label="Period Start Date (YYYY-MM-DD)" value={cycleForm.period_start} onChangeText={v => setCycleForm(f => ({ ...f, period_start: v }))} placeholder={today} />
        <InputField label="Cycle Length" value={cycleForm.cycle_length_days} onChangeText={v => setCycleForm(f => ({ ...f, cycle_length_days: v }))} keyboardType="number-pad" unit="days" placeholder="28" />
        <InputField label="Notes" value={cycleForm.notes} onChangeText={v => setCycleForm(f => ({ ...f, notes: v }))} placeholder="Symptoms, mood..." multiline />
        <PrimaryButton label="Save Cycle" onPress={handleSaveCycle} loading={saving} />
      </ModalSheet>

      {/* Labs Modal */}
      <ModalSheet visible={activeModal === 'labs'} onClose={() => setActiveModal(null)} title="Add Lab Results">
        <InputField label="Test Date (YYYY-MM-DD)" value={labForm.test_date} onChangeText={v => setLabForm(f => ({ ...f, test_date: v }))} placeholder={today} />
        <InputField label="Cortisol" value={labForm.cortisol} onChangeText={v => setLabForm(f => ({ ...f, cortisol: v }))} keyboardType="decimal-pad" unit="nmol/L" placeholder="" />
        <InputField label="Vitamin D" value={labForm.vitamin_d} onChangeText={v => setLabForm(f => ({ ...f, vitamin_d: v }))} keyboardType="decimal-pad" unit="nmol/L" placeholder="" />
        <InputField label="Progesterone" value={labForm.progesterone} onChangeText={v => setLabForm(f => ({ ...f, progesterone: v }))} keyboardType="decimal-pad" unit="ng/mL" placeholder="" />
        <InputField label="Glucose" value={labForm.glucose} onChangeText={v => setLabForm(f => ({ ...f, glucose: v }))} keyboardType="decimal-pad" unit="mg/dL" placeholder="" />
        <InputField label="HbA1c" value={labForm.hba1c} onChangeText={v => setLabForm(f => ({ ...f, hba1c: v }))} keyboardType="decimal-pad" unit="%" placeholder="" />
        <InputField label="Cholesterol" value={labForm.cholesterol} onChangeText={v => setLabForm(f => ({ ...f, cholesterol: v }))} keyboardType="decimal-pad" unit="mg/dL" placeholder="" />
        <InputField label="Notes" value={labForm.notes} onChangeText={v => setLabForm(f => ({ ...f, notes: v }))} placeholder="Additional notes..." multiline />
        <PrimaryButton label="Save Results" onPress={handleSaveLab} loading={saving} />
      </ModalSheet>

      {/* CGM Modal */}
      <ModalSheet visible={activeModal === 'cgm'} onClose={() => setActiveModal(null)} title="Log CGM Data">
        <InputField label="Daily Average Glucose" value={cgmForm.daily_avg_glucose} onChangeText={v => setCgmForm(f => ({ ...f, daily_avg_glucose: v }))} keyboardType="decimal-pad" unit="mg/dL" placeholder="e.g. 95" />
        <InputField label="Time In Range" value={cgmForm.time_in_range_pct} onChangeText={v => setCgmForm(f => ({ ...f, time_in_range_pct: v }))} keyboardType="decimal-pad" unit="%" placeholder="e.g. 87" />
        <InputField label="Notes" value={cgmForm.notes} onChangeText={v => setCgmForm(f => ({ ...f, notes: v }))} placeholder="Any notable glucose spikes?" multiline />
        <PrimaryButton label="Save CGM Data" onPress={handleSaveCgm} loading={saving} />
      </ModalSheet>
    </SafeAreaView>
  );
}

function LabValue({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  if (value == null) return null;
  return (
    <View style={styles.labItem}>
      <Text style={styles.labLabel}>{label}</Text>
      <Text style={styles.labVal}>{value}</Text>
      <Text style={styles.labUnit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  scroll: { flex: 1 },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  pageTitle: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: COLORS.charcoal,
    letterSpacing: -0.5,
  },
  addIconBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.creamDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  healthIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthInfo: {
    flex: 1,
  },
  healthTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.charcoal,
    marginBottom: 6,
  },
  healthStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  healthNotes: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.charcoalMuted,
    marginTop: 6,
  },
  noData: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.charcoalMuted,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.creamBorder,
    marginTop: 4,
  },
  historyDate: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.charcoalMed,
  },
  historyValue: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.charcoalMuted,
  },
  labGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: 4,
  },
  labItem: {
    backgroundColor: COLORS.creamDark,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  labLabel: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.charcoalMuted,
  },
  labVal: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.charcoal,
  },
  labUnit: {
    fontFamily: FONTS.regular,
    fontSize: 9,
    color: COLORS.charcoalMuted,
  },
});
