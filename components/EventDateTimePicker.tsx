import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

type Props = {
  value: Date;
  onChange: (date: Date) => void;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const QUICK_TIMES = [
  { label: '9 AM', hours: 9, minutes: 0 },
  { label: '12 PM', hours: 12, minutes: 0 },
  { label: '3 PM', hours: 15, minutes: 0 },
  { label: '6 PM', hours: 18, minutes: 0 },
];

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTimeLabel(date: Date) {
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function EventDateTimePicker({ value, onChange }: Props) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(value.getFullYear(), value.getMonth(), 1)
  );
  const [showAndroidDatePicker, setShowAndroidDatePicker] = useState(false);
  const [showAndroidTimePicker, setShowAndroidTimePicker] = useState(false);

  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: { date: Date; inMonth: boolean }[] = [];

    for (let index = firstWeekday - 1; index >= 0; index -= 1) {
      cells.push({
        date: new Date(year, month - 1, daysInPrevMonth - index),
        inMonth: false,
      });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({ date: new Date(year, month, day), inMonth: true });
    }

    while (cells.length % 7 !== 0) {
      const nextDay = cells.length - firstWeekday - daysInMonth + 1;
      cells.push({ date: new Date(year, month + 1, nextDay), inMonth: false });
    }

    return cells;
  }, [visibleMonth]);

  const shiftMonth = (delta: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  const selectDate = (date: Date) => {
    const next = new Date(value);
    next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    onChange(next);
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  const selectTime = (hours: number, minutes: number) => {
    const next = new Date(value);
    next.setHours(hours, minutes, 0, 0);
    onChange(next);
  };

  const nudgeTime = (field: 'hour' | 'minute', delta: number) => {
    const next = new Date(value);
    if (field === 'hour') {
      next.setHours(next.getHours() + delta);
    } else {
      next.setMinutes(next.getMinutes() + delta);
    }
    onChange(next);
  };

  const toggleAmPm = (period: 'AM' | 'PM') => {
    const next = new Date(value);
    const hours = next.getHours();
    const isPm = hours >= 12;
    if (period === 'PM' && !isPm) {
      next.setHours(hours + 12);
    }
    if (period === 'AM' && isPm) {
      next.setHours(hours - 12);
    }
    onChange(next);
  };

  const onAndroidDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    setShowAndroidDatePicker(false);
    if (event.type === 'dismissed' || !selected) return;
    selectDate(selected);
  };

  const onAndroidTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    setShowAndroidTimePicker(false);
    if (event.type === 'dismissed' || !selected) return;
    selectTime(selected.getHours(), selected.getMinutes());
  };

  const hours24 = value.getHours();
  const hours12 = hours24 % 12 || 12;
  const minutes = value.getMinutes();
  const isPm = hours24 >= 12;

  return (
    <View style={styles.wrapper}>
      <View style={styles.previewRow}>
        <View style={styles.previewCard}>
          <View style={styles.previewIcon}>
            <Ionicons name="calendar" size={18} color={Colors.primary} />
          </View>
          <View style={styles.previewTextWrap}>
            <Text style={styles.previewLabel}>Date</Text>
            <Text style={styles.previewValue}>{formatDateLabel(value)}</Text>
          </View>
        </View>
        <View style={styles.previewCard}>
          <View style={styles.previewIcon}>
            <Ionicons name="time" size={18} color={Colors.primary} />
          </View>
          <View style={styles.previewTextWrap}>
            <Text style={styles.previewLabel}>Time</Text>
            <Text style={styles.previewValue}>{formatTimeLabel(value)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.monthHeader}>
          <Pressable style={styles.monthNav} onPress={() => shiftMonth(-1)} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={Colors.primary} />
          </Pressable>
          <Text style={styles.monthTitle}>
            {MONTHS[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
          </Text>
          <Pressable style={styles.monthNav} onPress={() => shiftMonth(1)} hitSlop={8}>
            <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
          </Pressable>
        </View>

        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((day) => (
            <Text key={day} style={styles.weekdayLabel}>
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.dayGrid}>
          {calendarDays.map((cell) => {
            const cellDay = startOfDay(cell.date);
            const selected = isSameDay(cell.date, value);
            const isToday = isSameDay(cell.date, today);
            const isPast = cellDay < today;

            return (
              <Pressable
                key={cell.date.toISOString()}
                style={[
                  styles.dayCell,
                  selected && styles.dayCellSelected,
                  isToday && !selected && styles.dayCellToday,
                ]}
                disabled={!cell.inMonth || isPast}
                onPress={() => selectDate(cell.date)}>
                <Text
                  style={[
                    styles.dayText,
                    !cell.inMonth && styles.dayTextMuted,
                    isPast && cell.inMonth && styles.dayTextDisabled,
                    selected && styles.dayTextSelected,
                  ]}>
                  {cell.date.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {Platform.OS === 'android' ? (
          <Pressable style={styles.androidPickerButton} onPress={() => setShowAndroidDatePicker(true)}>
            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
            <Text style={styles.androidPickerButtonText}>Open calendar picker</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.timeCard}>
        <Text style={styles.timeHeading}>Set time</Text>

        <View style={styles.clockRow}>
          <Pressable style={styles.clockAdjust} onPress={() => nudgeTime('hour', -1)}>
            <Ionicons name="remove" size={18} color={Colors.primary} />
          </Pressable>

          <View style={styles.clockDisplay}>
            <Text style={styles.clockDigits}>
              {hours12.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
            </Text>
            <View style={styles.ampmRow}>
              <Pressable
                style={[styles.ampmChip, !isPm && styles.ampmChipActive]}
                onPress={() => toggleAmPm('AM')}>
                <Text style={[styles.ampmText, !isPm && styles.ampmTextActive]}>AM</Text>
              </Pressable>
              <Pressable
                style={[styles.ampmChip, isPm && styles.ampmChipActive]}
                onPress={() => toggleAmPm('PM')}>
                <Text style={[styles.ampmText, isPm && styles.ampmTextActive]}>PM</Text>
              </Pressable>
            </View>
          </View>

          <Pressable style={styles.clockAdjust} onPress={() => nudgeTime('hour', 1)}>
            <Ionicons name="add" size={18} color={Colors.primary} />
          </Pressable>
        </View>

        <View style={styles.minuteRow}>
          <Pressable style={styles.minuteAdjust} onPress={() => nudgeTime('minute', -15)}>
            <Text style={styles.minuteAdjustText}>-15 min</Text>
          </Pressable>
          <Pressable style={styles.minuteAdjust} onPress={() => nudgeTime('minute', 15)}>
            <Text style={styles.minuteAdjustText}>+15 min</Text>
          </Pressable>
        </View>

        <View style={styles.quickTimeRow}>
          {QUICK_TIMES.map((slot) => {
            const active = value.getHours() === slot.hours && value.getMinutes() === slot.minutes;
            return (
              <Pressable
                key={slot.label}
                style={[styles.quickTimeChip, active && styles.quickTimeChipActive]}
                onPress={() => selectTime(slot.hours, slot.minutes)}>
                <Text style={[styles.quickTimeText, active && styles.quickTimeTextActive]}>
                  {slot.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {Platform.OS === 'android' ? (
          <Pressable style={styles.androidPickerButton} onPress={() => setShowAndroidTimePicker(true)}>
            <Ionicons name="time-outline" size={18} color={Colors.primary} />
            <Text style={styles.androidPickerButtonText}>Open clock picker</Text>
          </Pressable>
        ) : null}
      </View>

      {showAndroidDatePicker ? (
        <DateTimePicker
          value={value}
          mode="date"
          display="calendar"
          minimumDate={today}
          onChange={onAndroidDateChange}
        />
      ) : null}

      {showAndroidTimePicker ? (
        <DateTimePicker value={value} mode="time" display="clock" onChange={onAndroidTimeChange} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.md,
  },
  previewRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  previewCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.greenLight,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: '#D4E2E2',
  },
  previewIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  previewTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewValue: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  calendarCard: {
    backgroundColor: Colors.cardLight,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthNav: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  dayCellSelected: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.pill,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  dayTextMuted: {
    color: Colors.locked,
  },
  dayTextDisabled: {
    color: Colors.textMuted,
  },
  dayTextSelected: {
    color: Colors.white,
    fontWeight: '700',
  },
  timeCard: {
    backgroundColor: Colors.cardLight,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  timeHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  clockAdjust: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clockDisplay: {
    alignItems: 'center',
    minWidth: 140,
  },
  clockDigits: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 1,
  },
  ampmRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  ampmChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ampmChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
  ampmText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  ampmTextActive: {
    color: Colors.white,
  },
  minuteRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  minuteAdjust: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  minuteAdjustText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  quickTimeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  quickTimeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickTimeChipActive: {
    backgroundColor: Colors.greenLight,
    borderColor: Colors.primary,
  },
  quickTimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  quickTimeTextActive: {
    color: Colors.primary,
  },
  androidPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 12,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  androidPickerButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
});
