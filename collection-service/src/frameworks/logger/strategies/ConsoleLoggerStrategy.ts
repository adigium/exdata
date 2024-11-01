import chalk from 'chalk';
import { BaseLoggerStrategy } from './BaseLoggerStrategy';

export class ConsoleLoggerStrategy extends BaseLoggerStrategy {
  log(level: string, message: string, context?: string | undefined, tags?: string[] | undefined): void {
    const date = chalk.gray(
      new Date()
        .toLocaleString('en-us', {
          dateStyle: 'short',
          timeStyle: 'medium',
          hour12: false,
        })
        .padEnd(18),
    );

    let lvl = chalk.green.bold(level);

    if (level === 'INFO') lvl = chalk.green.bold(level.padEnd(6));
    if (level === 'DEBUG') lvl = chalk.blue.bold(level.padEnd(6));
    if (level === 'WARN') lvl = chalk.yellow.bold(level.padEnd(6));
    if (level === 'ERROR') lvl = chalk.red.bold(level.padEnd(6));

    const ctx = `[${context}]`;

    const tgs = tags ? `(${tags?.join(')(')})` : '';

    const formattedTags = chalk.magentaBright(ctx) + chalk.gray(tgs);

    console.log(this.colorize(`${date}${lvl}${formattedTags} ${message}`));
  }
}
