import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class HashService {
  private readonly rounds = 12;

  async criarHash(texto: string): Promise<string> {
    if (!texto) throw new Error('Texto vazio');
    return bcrypt.hash(texto, this.rounds);
  }

  async verificarHash(texto: string, hash: string): Promise<boolean> {
    if (!texto || !hash) throw new Error('Parâmetros inválidos');
    return bcrypt.compare(texto, hash);
  }
}