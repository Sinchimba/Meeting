import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'meetings' })
export class Meeting {
  @PrimaryColumn()
  id!: string;

  @Column()
  title!: string;

  @Column({ nullable: true })
  host_id!: string;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  start_time!: Date | null;

  @Column({ default: 'scheduled' })
  status!: string;

  @CreateDateColumn()
  created_at!: Date;
}
