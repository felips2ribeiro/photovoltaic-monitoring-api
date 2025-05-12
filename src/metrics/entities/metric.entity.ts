import { Inverter } from '../../inverters/entities/inverter.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';

@Entity('metrics')
@Index(['inverterId', 'timestamp'])
export class Metric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Inverter, (inverter) => inverter.metrics, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'inverterId' })
  inverter: Inverter;

  @Column()
  inverterId: number;

  @Column({ type: 'datetime' })
  timestamp: Date;

  @Column({ type: 'float' })
  activePower: number;

  @Column({ type: 'float', nullable: true })
  temperature?: number | null;

  @CreateDateColumn()
  ingestedAt: Date;
}
