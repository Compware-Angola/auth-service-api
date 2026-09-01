import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'GLOBAL_TB_REFRESH_TOKEN' })
export class RefreshToken {
  @PrimaryGeneratedColumn({ name: 'ID', type: 'int' })
  id: number;

  @Index()
  @Column({ name: 'IDENTITY_ID', type: 'int' })
  identityId: number;

  @Index({ unique: true })
  @Column({ name: 'TOKEN_ID', type: 'varchar', length: 36 })
  tokenId: string;

  @Column({ name: 'PLATFORM_CODE', type: 'varchar', length: 50, nullable: true })
  platformCode?: string;

  @Column({ name: 'EXPIRES_AT', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'REVOKED', type: 'int', default: 0 })
  revoked: number;

  @CreateDateColumn({ name: 'CREATED_AT', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UPDATED_AT', type: 'timestamp' })
  updatedAt: Date;
}
