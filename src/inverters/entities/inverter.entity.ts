import { Plant } from '../../plants/entities/plant.entity';
import { Metric } from '../../metrics/entities/metric.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';

@Entity('inverters')
export class Inverter {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true,
    comment: 'ID do inversor físico, ex: 1 a 8 do arquivo JSON',
  })
  externalId: number;

  @Column()
  name: string;

  @ManyToOne(() => Plant, (plant) => plant.inverters, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'plantId' })
  plant: Plant;

  @Column()
  plantId: number;

  @OneToMany(() => Metric, (metric) => metric.inverter)
  metrics: Metric[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
