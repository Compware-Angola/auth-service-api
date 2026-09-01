import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Identity } from '../../identity/entities/identity.entity';
import { Platform } from './platform.entity';



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

  @ManyToOne(() => Identity, (identity) => identity.userPlatforms)
  @JoinColumn({ name: 'USER_ID' })
  identity: Identity;

  @ManyToOne(() => Platform, { eager: false })
  @JoinColumn({ name: 'PLATFORM_ID' })
  platform: Platform;
}
