export type ThemeMode = 'system' | 'light' | 'dark';

export type ThemeColors = {
  ink:string; text:string; muted:string; blue:string; pink:string; purple:string;
  pale:string; line:string; white:string; bg:string; card:string; input:string;
  green:string; rose:string; tab:string; placeholder:string; photo:string;
};

//
// AutoFace brand palette
//
// Blue / cyan  = Discovery, Atlas, information and primary actions
// Pink         = Interest, connection and relationship actions
// Green        = Verification / success only
//
export const lightColors: ThemeColors = {
  ink:'#10133A',
  text:'#10133A',
  muted:'#696A86',

  // AutoFace electric blue
  blue:'#087CFF',
  pink:'#F725A8',
  purple:'#A829F7',

  // Soft blue surface
  pale:'#EDF5FF',

  line:'#E3E3F1',
  white:'#FFFFFF',

  // Very subtle blue/lavender background
  bg:'#F8F8FF',
  card:'#FFFFFF',
  input:'#FFFFFF',

  // Semantic success
  green:'#087A55',

  // AutoFace pink
  rose:'#F725A8',

  tab:'#FFFFFF',
  placeholder:'#9293AA',
  photo:'#F0F1FA'
};

export const darkColors: ThemeColors = {
  ink:'#FFFFFF',
  text:'#FFFFFF',
  muted:'#B8B8D2',

  // AutoFace electric blue
  blue:'#168CFF',
  pink:'#FF2AA5',
  purple:'#B52CFF',

  // Blue-tinted surface
  pale:'#101B55',

  line:'#303260',
  white:'#FFFFFF',

  // Midnight colour taken from the logo direction
  bg:'#05052B',

  // Slightly lifted navy surfaces
  card:'#0D103D',
  input:'#121648',

  // Semantic success
  green:'#34D399',

  // AutoFace pink
  rose:'#FF2AA5',

  tab:'#080832',
  placeholder:'#8586A8',
  photo:'#141849'
};

// Kept for compatibility with any older screen code.
// New UI should use useAppTheme().colors.
export const C = lightColors;
