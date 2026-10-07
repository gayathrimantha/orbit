import Svg, { Path, Rect } from 'react-native-svg';

export type IconName =
  | 'play'
  | 'pause'
  | 'skip'
  | 'back'
  | 'plus'
  | 'close'
  | 'chevron';

interface Props {
  name: IconName;
  size?: number;
  color: string;
}

export function Icon({ name, size = 24, color }: Props) {
  const stroke = {
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'play' && <Path d="M7 4.5v15l12.5-7.5z" fill={color} />}
      {name === 'pause' && (
        <>
          <Rect x="6" y="4.5" width="4" height="15" rx="1.2" fill={color} />
          <Rect x="14" y="4.5" width="4" height="15" rx="1.2" fill={color} />
        </>
      )}
      {name === 'skip' && (
        <>
          <Path d="M5 5.5v13l10-6.5z" fill={color} />
          <Rect x="16.5" y="5.5" width="2.5" height="13" rx="1" fill={color} />
        </>
      )}
      {name === 'back' && (
        <>
          <Path d="M19 5.5v13L9 12z" fill={color} />
          <Rect x="5" y="5.5" width="2.5" height="13" rx="1" fill={color} />
        </>
      )}
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...stroke} />}
      {name === 'close' && <Path d="M6 6l12 12M18 6L6 18" {...stroke} />}
      {name === 'chevron' && <Path d="M9 6l6 6-6 6" {...stroke} />}
    </Svg>
  );
}
