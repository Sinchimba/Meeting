import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'sessions' })
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  user_id!: string;

  @Column()
  refresh_token_hash!: string;

  @Column({
    type: 'datetime',
  })
  expires_at!: Date;

  @CreateDateColumn()
  created_at!: Date;
}
