import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export interface PromptOption<T extends string> {
  value: T;
  label: string;
}

function withPrompt(question: string): Promise<string> {
  const rl = createInterface({ input, output });
  return rl
    .question(question)
    .then((answer) => {
      rl.close();
      return answer;
    })
    .catch((err) => {
      rl.close();
      throw err;
    });
}

export async function select<T extends string>(
  message: string,
  options: readonly PromptOption<T>[],
): Promise<T> {
  console.log(`\n  ${message}`);
  options.forEach((option, index) => {
    console.log(`    ${index + 1}. ${option.label}`);
  });

  while (true) {
    const answer = (await withPrompt("\n  select option number: ")).trim();
    const selected = Number(answer);
    if (Number.isInteger(selected) && selected >= 1 && selected <= options.length) {
      return options[selected - 1].value;
    }
    console.log("  invalid selection. enter one of the numbers above.");
  }
}

export async function text(
  message: string,
  defaultValue: string,
  validate?: (value: string) => string | undefined,
): Promise<string> {
  while (true) {
    const answer = (await withPrompt(`\n  ${message} (${defaultValue}): `)).trim();
    const value = answer || defaultValue;
    const validationError = validate?.(value);
    if (!validationError) {
      return value;
    }
    console.log(`  ${validationError}`);
  }
}

export async function confirm(message: string): Promise<boolean> {
  while (true) {
    const answer = (await withPrompt(`\n  ${message} (y/N): `)).trim().toLowerCase();
    if (answer === "y" || answer === "yes") return true;
    if (!answer || answer === "n" || answer === "no") return false;
    console.log("  please answer with y or n.");
  }
}
