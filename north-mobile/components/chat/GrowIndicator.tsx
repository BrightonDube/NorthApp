import { View, Text } from 'react-native';
import { useThemeColors } from '@/contexts/ThemeContext';

type GrowState = 'goal' | 'reality' | 'options' | 'way_forward' | 'complete';

const STAGES: { key: GrowState; label: string }[] = [
  { key: 'goal', label: 'Goal' },
  { key: 'reality', label: 'Reality' },
  { key: 'options', label: 'Options' },
  { key: 'way_forward', label: 'Way Forward' },
  { key: 'complete', label: 'Complete' },
];

function getStageIndex(state: GrowState): number {
  const idx = STAGES.findIndex((s) => s.key === state);
  return idx >= 0 ? idx : 0;
}

interface GrowIndicatorProps {
  state: GrowState;
}

export function GrowIndicator({ state }: GrowIndicatorProps) {
  const colors = useThemeColors();
  const activeIndex = getStageIndex(state);

  return (
    <View
      style={{
        marginHorizontal: 12,
        marginTop: 8,
        marginBottom: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Current GROW stage: ${STAGES[activeIndex].label}`}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {STAGES.map((stage, idx) => {
          const isActive = idx === activeIndex;
          const isCompleted = idx < activeIndex;
          const color = isActive || isCompleted ? colors.primary : colors.textTertiary;
          return (
            <Text
              key={stage.key}
              style={{
                fontSize: 10,
                fontWeight: isActive ? '700' : '500',
                color,
              }}
              numberOfLines={1}
            >
              {stage.label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}
