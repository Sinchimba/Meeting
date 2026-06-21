import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

const getTimestampType = () => {
  const dbType = process.env.DB_TYPE || 'mysql';
  if (dbType === 'sqlite') return 'datetime';
  if (dbType === 'postgres') return 'timestamptz';
  return 'timestamp';
};

@Entity({ name: 'sessions' })
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  user_id!: string;

  @Column()
  refresh_token_hash!: string;

  @Column({
    type: getTimestampType(),
  })
  expires_at!: Date;

  @CreateDateColumn()
  created_at!: Date;
}
