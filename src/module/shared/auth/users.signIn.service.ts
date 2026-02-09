


import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class UserSignInService {
    constructor(private readonly dataSource: DataSource) { }

    /**
     * Registra ou atualiza o acesso do utilizador na tabela FK2_TB_CONTROLE_ACESSO_UTILIZADOR
     * - INSERT se o CODIGOUTILIZADOR não existir
     * - UPDATE se já existir (atualiza LOGADO, DATA, IP)
     */
    async registrarOuAtualizarAcesso(
        codigoutilizador: number | string,
        ip: string,
        logado: boolean = true

    ): Promise<void> {
        console.log(codigoutilizador,ip,logado);
        

        const existe = await this.dataSource.query(
            `
      SELECT COUNT(*) as total 
      FROM FK2_TB_CONTROLE_ACESSO_UTILIZADOR 
      WHERE CODIGOUTILIZADOR = :codigoutilizador
      `,
            [codigoutilizador],
        );
  

        const count = Number(existe[0]?.TOTAL || 0);
        const lastId =  await this.getRangeId()

        if (count === 0) {
            // INSERT
            await this.dataSource.query(
                `
        INSERT INTO FK2_TB_CONTROLE_ACESSO_UTILIZADOR 
        (CODIGOUTILIZADOR, IP, DATA, LOGADO,CODIGO)
        VALUES (:cod, :ip, SYSDATE, :log)
        `,
                {
                    cod: codigoutilizador,
                    ip: ip,
                    log: logado ? 1 : 0

                } as any
            );
        } else {
            await this.dataSource.query(
                `
  UPDATE FK2_TB_CONTROLE_ACESSO_UTILIZADOR
  SET 
    IP = :ip,
    DATA = SYSDATE,
    LOGADO = :log
  WHERE CODIGOUTILIZADOR = :cod
  `,
                {
                    ip: ip,
                    log: logado ? 1 : 0,
                    cod: codigoutilizador,
                } as any
            );
        }
    }

    /**
     * Marca o utilizador como deslogado
     */
    async makloggedOut(codigoutilizador: number | string): Promise<void> {
      const value=  await this.dataSource.query(
            `
      UPDATE FK2_TB_CONTROLE_ACESSO_UTILIZADOR
      SET LOGADO = 0, DATA = SYSDATE
      WHERE CODIGOUTILIZADOR = :cod
      `,
            { cod: codigoutilizador } as any
        );

        console.log(value,codigoutilizador);
        
    }

    /**
     * Verifica se o utilizador está logado
     */
    async statusLogged(codigoutilizador: number | string): Promise<boolean> {
        const result = await this.dataSource.query(
            `
      SELECT LOGADO 
      FROM FK2_TB_CONTROLE_ACESSO_UTILIZADOR 
      WHERE CODIGOUTILIZADOR = :cod
      `,
            { cod: codigoutilizador } as any
        );

        
        if (result.length === 0) return false;

        

        const valor = result[0].LOGADO;
        return valor === 1 || valor === true || String(valor) === '1';
    }


    /**
     * (Opcional) Limpar sessões antigas / inativas
     * Exemplo: marcar como deslogado tudo que não atualizou há mais de 24h
     */
   async ClearOldSessions(horasInatividade: number = 24): Promise<void> {
  const limite = new Date();
  limite.setHours(limite.getHours() - horasInatividade);

  await this.dataSource.query(
    `
    UPDATE FK2_TB_CONTROLE_ACESSO_UTILIZADOR
    SET LOGADO = 0
    WHERE LOGADO = 1 
      AND DATA < :dataLimite
    `,
    [limite], // <-- Date real, não string
  );
}

private async getRangeId(){
     const [maxId] = await this.dataSource.query(
          `SELECT MAX(CODIGO) as maxcod
           FROM FK2_TB_CONTROLE_ACESSO_UTILIZADOR
           WHERE REGEXP_LIKE(Codigo, '^[0-9]+$')`,
        );

        return maxId.MAXCOD + 1 
}





}