export const colors = {
  black: '#000000',
  blue: '#0174DF',
  darkBlue: '#3652AD',
  green: '#04B404',
  yellow: '#FF8000',
  red: '#FF0000',
  grey: '#BDBDBD',
  lightGrey: '#A4A4A4',
  darkGrey: '#393E46',
  navy: '#280274',

  customGrey: '#F5EEE6',
  customBeige: '#FFF8E3',
  customPeach: '#F3D7CA',
  customPink: '#E6A4B4',
};

export const color = (message: string, color: string) => `{${color}:${message}}`;

export const success = (message: string) => color(message, colors.green);

export const error = (message: string) => color(message, colors.red);

export const warn = (message: string) => color(message, colors.yellow);

export const debug = (message: string) => color(message, colors.blue);

export const pink = (message: string) => color(message, colors.customPink);
