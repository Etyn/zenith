import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FORBIDDEN = ['react', 'react-native', 'expo', 'net', 'react-native-tcp-socket'];

function tsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return tsFiles(full);
    return full.endsWith('.ts') && !full.includes('__tests__') ? [full] : [];
  });
}

test('le moteur n\'importe aucun module UI/reseau', () => {
  const root = join(__dirname, '..');
  for (const file of tsFiles(root)) {
    const src = readFileSync(file, 'utf8');
    for (const mod of FORBIDDEN) {
      expect(src).not.toMatch(new RegExp(`from ['"]${mod}(/|['"])`));
    }
  }
});
