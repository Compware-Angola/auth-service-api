import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'UMA_TB_IDENTITY' })
export class Identity {
  @PrimaryGeneratedColumn({ name: 'ID', type: 'int' })
  id: number;

  @Column({ name: 'USERNAME', type: 'varchar', length: 100, unique: true })
  username: string;

  @Column({ name: 'EMAIL', type: 'varchar', length: 150, unique: true })
  email: string;

  @Column({ name: 'NAME', type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'STATUS', type: 'int', default: 1 })
  status: number;

  @CreateDateColumn({ name: 'CREATED_AT', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UPDATED_AT', type: 'timestamp' })
  updatedAt: Date;
}
