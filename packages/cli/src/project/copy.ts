import fs from 'node:fs';
import path from 'node:path';
import Handlebars from 'handlebars';
import { capitalCase, pascalCase, dotCase, kebabCase } from 'change-case';

export interface CopyContext {
  name: string;
  language: string;
  [key: string]: string;
}

const helpers: Record<string, (text: string) => string> = {
  capitalize: (text: string) => (!text ? '' : capitalCase(text)),
  toPascalCase: (text: string) => (!text ? '' : pascalCase(text)),
  toDotCase: (text: string) => (!text ? '' : dotCase(text)),
  toKebabCase: (text: string) => (!text ? '' : kebabCase(text)),
};

export function renderTemplate(input: string, context: CopyContext): string {
  const template = Handlebars.compile(input, { strict: true });
  return template(context, { helpers });
}

/**
 * Recursively copy a directory, rendering `.hbs` files through Handlebars.
 * - Files ending in `.hbs`: render content + strip `.hbs` from filename
 * - Directory names ending in `.hbs`: render name through Handlebars
 * - Everything else: plain copy
 */
export async function copyDir(from: string, to: string, context: CopyContext): Promise<void> {
  if (!fs.existsSync(from)) {
    throw new Error(`"${from}" does not exist`);
  }

  if (!fs.statSync(from).isDirectory()) {
    throw new Error(`"${from}" is not a directory`);
  }

  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }

  const items = fs.readdirSync(from);

  for (const item of items) {
    const fullFrom = path.resolve(from, item);
    const stat = fs.statSync(fullFrom);
    const isHbs = item.endsWith('.hbs');

    let toItem = item;
    if (isHbs) {
      toItem = renderTemplate(item, context).replace(/\.hbs$/, '');
    }

    const fullTo = path.resolve(to, toItem);

    if (stat.isDirectory()) {
      await copyDir(fullFrom, fullTo, context);
    } else if (isHbs) {
      // Render file content through Handlebars
      const content = fs.readFileSync(fullFrom, 'utf8');
      const rendered = renderTemplate(content, context);
      fs.writeFileSync(fullTo, rendered, 'utf8');
    } else {
      // Plain binary-safe copy
      fs.copyFileSync(fullFrom, fullTo);
    }
  }
}
