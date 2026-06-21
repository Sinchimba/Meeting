import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'translation_logs' })
export class TranslationLog {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ nullable: true })
  meeting_id!: string;

  @Column({ nullable: true })
  participant_id!: string;

  @Column({ type: 'text', nullable: true })
  result_text!: string;

  @Column({ nullable: true })
  model_version!: string;

  @CreateDateColumn()
  created_at!: Date;
}
