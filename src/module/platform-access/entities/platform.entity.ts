import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'UMA_TB_PLATFORM' })
export class Platform {
  @PrimaryGeneratedColumn({ name: 'ID', type: 'int' })
  id: number;

  @Column({ name: 'CODE', type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ name: 'NAME', type: 'varchar', length: 150 })
  name: string;

  @Column({ name: 'DESCRIPTION', type: 'varchar', length: 500, nullable: true })
  description?: string;

  @Column({ name: 'STATUS', type: 'int', default: 1 })
  status: number;

  @CreateDateColumn({ name: 'CREATED_AT', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UPDATED_AT', type: 'timestamp' })
  updatedAt: Date;
}
