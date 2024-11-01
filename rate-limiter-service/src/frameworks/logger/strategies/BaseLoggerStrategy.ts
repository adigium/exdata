import chalk from 'chalk';
import { ILoggerStrategy } from '../ILoggerStrategy';

export abstract class BaseLoggerStrategy implements ILoggerStrategy {
  abstract log(level: string, message: string, context?: string, tags?: string[]): void;

  protected colorize(message: string): string {
    const colorPattern = /\{#(\w+):([^}]+)\}/g;
    return message.replace(colorPattern, (match, color, text) => {
      const colorFunction = chalk.hex(color);
      return colorFunction ? colorFunction(text) : text;
    });
  }
}
