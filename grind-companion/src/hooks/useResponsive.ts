import { useWindowDimensions } from 'react-native';

/** Slightly roomier layout on iPad / large tablets */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= 768;
  return {
    isTablet,
    contentMaxWidth: isTablet ? 720 : width,
    arcSize: isTablet ? 240 : 200,
    chartWidth: Math.min(isTablet ? 680 : width - 32, width - 32),
  };
}
