import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'GLOBAL_TB_IDENTITY' })
export class Identity {
  @PrimaryGeneratedColumn({ name: 'ID', type: 'int' })
  id: number;

  @Column({ name: 'USERNAME', type: 'varchar', length: 100, unique: true })
  username: string;

  @Column({ name: 'EMAIL', type: 'varchar', length: 150, unique: true })
  email: string;

  @Column({ name: 'NAME', type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'BI', type: 'varchar', length: 150, unique: true })
  bi: string;

  @Column({ name: 'AVATAR', type: 'varchar', length: 150 })
  avatar: string;

  /**
   * select:false — nunca vem em finds/updates normais, só é lida
   * explicitamente pelo IdentityRepository.findForLogin() para o login.
   */
  @Column({ name: 'PASSWORD', type: 'varchar', length: 255, select: false })
  password: string;

  @Column({ name: 'STATUS', type: 'int', default: 1 })
  status: number;

  @CreateDateColumn({ name: 'CREATED_AT', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UPDATED_AT', type: 'timestamp' })
  updatedAt: Date;
}
