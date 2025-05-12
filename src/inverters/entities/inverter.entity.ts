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
  Unique,
} from 'typeorm';

@Entity('inverters')
@Unique(['externalId'])
export class Inverter {
  @PrimaryGeneratedColumn({ comment: 'ID único interno do inversor' })
  id: number;

  @Column({
    unique: true,
    comment: 'ID externo do inversor (ex: 1-8 do arquivo JSON)',
  })
  externalId: number;

  @Column({ length: 100, comment: 'Nome descritivo do inversor' })
  name: string;

  @ManyToOne(() => Plant, (plant) => plant.inverters, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'plantId' })
  plant: Plant;

  @Column({
    comment: 'Chave estrangeira para a usina à qual o inversor pertence',
  })
  plantId: number;

  @OneToMany(() => Metric, (metric) => metric.inverter)
  metrics: Metric[];

  @CreateDateColumn({ comment: 'Data de criação do registro' })
  createdAt: Date;

  @UpdateDateColumn({ comment: 'Data da última atualização do registro' })
  updatedAt: Date;
}
