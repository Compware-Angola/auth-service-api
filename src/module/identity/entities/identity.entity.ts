import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'TB_GLOBAL_USERS_IDENTITY' })
export class Identity {
  @PrimaryGeneratedColumn({
    name: 'ID',
    type: 'number',
  })
  id: number;

  @Column({
    name: 'USERNAME',
    type: 'varchar2',
    length: 100,
    unique: true,
  })
  username: string;

  @Column({
    name: 'EMAIL',
    type: 'varchar2',
    length: 150,
    unique: true,
  })
  email: string;

  @Column({
    name: 'NAME',
    type: 'varchar2',
    length: 200,
  })
  name: string;

  @Column({
    name: 'FIRST_NAME',
    type: 'varchar2',
    length: 100,
  })
  firstName: string;

  @Column({
    name: 'LAST_NAME',
    type: 'varchar2',
    length: 100,
  })
  lastName: string;

  @Column({
    name: 'PHONE',
    type: 'varchar2',
    length: 20,
    nullable: true,
  })
  phone: string | null;

  @Column({
    name: 'BI',
    type: 'varchar2',
    length: 50,
    unique: true,
    nullable: true,
  })
  bi: string | null;

  @Column({
    name: 'AVATAR',
    type: 'varchar2',
    length: 255,
    default: "'default-avatar.png'",
  })
  avatar: string;

  /**
   * select:false
   *
   * A password nunca é retornada nos finds normais.
   * Deve ser selecionada explicitamente apenas durante o login.
   */
  @Column({
    name: 'PASSWORD_HASH',
    type: 'varchar2',
    length: 255,
    select: false,
  })
  passwordHash: string;

  /**
   * USER
   * ADMIN
   * SERVICE
   * SYSTEM
   */
  @Column({
    name: 'USER_TYPE',
    type: 'varchar2',
    length: 30,
    default: "'USER'",
  })
  userType: string;

  /**
   * 1 = Active
   * 0 = Inactive
   */
  @Column({
    name: 'STATUS',
    type: 'number',
    precision: 1,
    default: 1,
  })
  status: number;

  @Column({
    name: 'EMAIL_VERIFIED',
    type: 'number',
    precision: 1,
    default: 0,
  })
  emailVerified: number;

  @Column({
    name: 'PHONE_VERIFIED',
    type: 'number',
    precision: 1,
    default: 0,
  })
  phoneVerified: number;

  @Column({
    name: 'FAILED_LOGIN_ATTEMPTS',
    type: 'number',
    default: 0,
  })
  failedLoginAttempts: number;

  @Column({
    name: 'LOCKED_UNTIL',
    type: 'timestamp',
    nullable: true,
  })
  lockedUntil: Date | null;

  @Column({
    name: 'LAST_LOGIN_AT',
    type: 'timestamp',
    nullable: true,
  })
  lastLoginAt: Date | null;

  @Column({
    name: 'PASSWORD_CHANGED_AT',
    type: 'timestamp',
    nullable: true,
  })
  passwordChangedAt: Date | null;

  @CreateDateColumn({
    name: 'CREATED_AT',
    type: 'timestamp',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'UPDATED_AT',
    type: 'timestamp',
  })
  updatedAt: Date;
}