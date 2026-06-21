import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

const getTimestampType = () => {
  const dbType = process.env.DB_TYPE || 'mysql';
  if (dbType === 'sqlite') return 'datetime';
  if (dbType === 'postgres') return 'timestamptz';
  return 'timestamp';
};

@Entity({ name: 'meetings' })
export class Meeting {
  @PrimaryColumn()
  id!: string;

  @Column()
  title!: string;

  @Column({ nullable: true })
  host_id!: string;

  @Column({
    type: getTimestampType(),
    nullable: true,
  })
  start_time!: Date | null;

  @Column({ default: 'scheduled' })
  status!: string;

  @CreateDateColumn()
  created_at!: Date;
}
