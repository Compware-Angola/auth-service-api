import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';

/**
 * userId referencia TB_GLOBAL_USERS_IDENTITY.ID a nível de base de dados (ver migrations/001_create_identity_and_platform_access.sql),
 * sem relação TypeORM directa, para manter este módulo independente do IdentityModule.
 */
@Entity({ name: 'TB_GLOBAL_USER_PLATFORM' })
@Unique('UQ_USER_PLATFORM', ['userId', 'platformId'])
export class UserPlatform {
  @PrimaryGeneratedColumn({ name: 'ID', type: 'int' })
  id: number;

  @Index()
  @Column({ name: 'USER_ID', type: 'int' })
  userId: number;

  @Index()
  @Column({ name: 'PLATFORM_ID', type: 'int' })
  platformId: number;
  @Index()
  @Column({ name: 'PLATFORM_USER_KEY', type: 'varchar2', nullable: true })
  platformUserKey: string | null;

  @Column({ name: 'STATUS', type: 'int', default: 1 })
  status: number;

  @CreateDateColumn({ name: 'CREATED_AT', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UPDATED_AT', type: 'timestamp' })
  updatedAt: Date;
}
