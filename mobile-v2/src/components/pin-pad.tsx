import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/src/theme/theme';

interface PinPadProps {
  value: string;
  length?: number;
  onChange: (nextValue: string) => void;
  onSubmit?: () => void;
  disabled?: boolean;
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export function PinPad({ value, length = 4, onChange, onSubmit, disabled = false }: PinPadProps) {
  const handlePress = (digit: string) => {
    if (disabled) {
      return;
    }

    if (digit === '⌫') {
      onChange(value.slice(0, -1));
      return;
    }

    if (!digit || value.length >= length) {
      return;
    }

    const nextValue = `${value}${digit}`;
    onChange(nextValue);

    if (nextValue.length === length && onSubmit) {
      onSubmit();
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.dotsRow}>
        {Array.from({ length }).map((_, index) => (
          <View
            key={index}
            style={[styles.dot, index < value.length ? styles.dotActive : null]}
          />
        ))}
      </View>

      <View style={styles.grid}>
        {DIGITS.map((digit, index) =>
          digit ? (
            <Pressable
              key={`${digit}-${index}`}
              style={({ pressed }) => [
                styles.key,
                pressed && !disabled ? styles.keyPressed : null,
                disabled ? styles.keyDisabled : null,
              ]}
              onPress={() => handlePress(digit)}
            >
              <Text style={styles.keyText}>{digit}</Text>
            </Pressable>
          ) : (
            <View key={`empty-${index}`} style={styles.keySpacer} />
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 18,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.canvasAlt,
  },
  dotActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  key: {
    width: 84,
    height: 64,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.canvasAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: {
    backgroundColor: '#efe7de',
    borderColor: theme.colors.primary,
  },
  keyDisabled: {
    opacity: 0.5,
  },
  keyText: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '800',
  },
  keySpacer: {
    width: 84,
    height: 64,
  },
});
