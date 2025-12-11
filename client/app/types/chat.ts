export type Chat = {
  id: number;
  title: string;
  timestamp: string;
};

export type Message = {
  text: string;
  response: string;
};

export enum ColorMode {
  Green = "Green",
  Lime = "Lime",
  Blue = "Blue",
  Purple = "Purple",
}

export type ColorModeConfig = {
  value: ColorMode;
  color: string;
  label: string;
  title: string;
};

