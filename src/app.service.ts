import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class HashService {
  private readonly rounds = 10;

  async criarHash(texto: string): Promise<string> {
    if (!texto) throw new Error('Texto vazio');
    return bcrypt.hash(texto, this.rounds);
  }
  async verificarHash(texto: string, hashFromDb: string): Promise<boolean> {
    if (!texto || !hashFromDb) throw new Error('Parâmetros inválidos');

    let hash = hashFromDb.trim();

    if (hash.startsWith('$2y$')) {
      hash = hash.replace('$2y$', '$2a$');
      //console.log('Hash convertido de $2y$ → $2a$: ', hash);
    }
    // ========================================
    /*
  console.log('=== DEBUG FINAL ===');
  console.log('Texto:', `"${texto}"`);
  console.log('Hash final usado:', hash);
  console.log('Prefixo agora:', hash.substring(0, 4));
*/
    const valido = await bcrypt.compare(texto, hash);
    // console.log('Resultado bcrypt.compare:', valido);

    return valido;
  }
}
