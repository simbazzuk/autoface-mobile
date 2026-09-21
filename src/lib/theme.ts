export type ThemeMode = 'system' | 'light' | 'dark';
export type ThemeColors = {
  ink:string; text:string; muted:string; blue:string; pale:string; line:string;
  white:string; bg:string; card:string; input:string; green:string; rose:string;
  tab:string; placeholder:string; photo:string;
};
export const lightColors: ThemeColors = {
  ink:'#14233B',text:'#14233B',muted:'#667085',blue:'#2563EB',pale:'#EFF6FF',
  line:'#E5E7EB',white:'#FFFFFF',bg:'#F8FAFC',card:'#FFFFFF',input:'#FFFFFF',
  green:'#087A55',rose:'#BE3455',tab:'#FFFFFF',placeholder:'#98A2B3',photo:'#EEF2F7'
};
export const darkColors: ThemeColors = {
  ink:'#F8FAFC',text:'#F8FAFC',muted:'#AAB4C3',blue:'#60A5FA',pale:'#172554',
  line:'#334155',white:'#FFFFFF',bg:'#0B1220',card:'#121C2E',input:'#172235',
  green:'#34D399',rose:'#FB7185',tab:'#0F172A',placeholder:'#7C8A9E',photo:'#1E293B'
};
// Kept for compatibility with any older screen code. New UI should use useAppTheme().colors.
export const C = lightColors;
